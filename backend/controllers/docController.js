const asyncHandler = require('express-async-handler')
const QuillDeltaToHtmlConverter =
  require('quill-delta-to-html').QuillDeltaToHtmlConverter
const { clients, docVersions, docIDToDocs } = require('../server')
const { logger } = require('../config/logger')
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')
const connection = require('../config/connection')

// Register rich text
sharedb.types.register(richText.type)

// HTTP event stream headers
const headers = {
  'X-CSE356': '61f9c5ceca96e9505dd3f8b4',
  'Content-Type': 'text/event-stream',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': `http://${process.env.SITE}:${process.env.SERVER_PORT}`,
}

// @desc    Render doc
// @route   GET /doc/edit/:docid
// @access  Private
const getDocUI = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').render('pages/document')
})

// @desc    Open a connection
// @route   GET /doc/connect/:docid/:uid
// @access  Private
const openConnection = asyncHandler(async (req, res, next) => {
  if (!req.params) {
    throw new Error('No connection ID or document ID or presenceID specified.')
  }

  const { docid, uid } = req.params
  const clientID = uid

  logger.info(`opening connection stream for uid: ${uid} in docid: ${docid} `)

  // Get doc instance
  let doc = docIDToDocs[docid]
  if (!doc) {
    doc = connection.get(process.env.CONNECTION_COLLECTION, docid)
    docIDToDocs[docid] = doc

    // Set up event listeners
    doc.subscribe((err) => {
      if (err) {
        throw err
      }

      // Save doc version
      if (!docVersions[doc.id]) {
        docVersions[doc.id] = doc.version
        logger.info(`set initial docVersions[doc.id]: ${docVersions[doc.id]}`)
      }
    })

    // // When we apply an op to the doc, update all other clients
    // doc.on('op', (op, source) => {
    //   // logger.info(`applying an op to a doc from source: ${source}`)
    //   // logger.info(`current doc.version: ${doc.version}`)
    //   // logger.info(`op being applied:`)
    //   // logger.info(op)
    // })

    // Subscribe presence
    // const presence = doc.connection.getDocPresence(
    //   process.env.CONNECTION_COLLECTION,
    //   docid
    // )
    const presence = connection.getPresence(docid)
    presence.subscribe((err) => {
      // logger.info('presence subscribed')
    })
  }

  // Set event stream headers
  res.set(headers)

  // Get the doc
  doc.fetch((err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      next(new Error('doc does not exist'))
    }

    // Send initial doc data
    logger.info('sending back inital content and version, logged below: ')
    logger.info(doc.data.ops)
    logger.info(doc.version)
    res.write(
      `data: ${JSON.stringify({
        content: doc.data.ops,
        version: doc.version,
      })} \n\n`
    )
    // res.flush()
  })

  // const localPresence = doc.connection
  //   .getDocPresence(process.env.CONNECTION_COLLECTION, docid)
  //   .create(clientID)
  const localPresence = connection.getPresence(docid).create(clientID)

  // Store client info
  const clientObj = {
    clientID,
    res,
    localPresence,
  }
  clients[clientID] = clientObj

  // Client closed the connection
  req.on('close', () => {
    logger.info(`client ${uid} closed the connection`)
    localPresence.destroy()
    res.socket.destroy()
    res.end()
    // delete clients[clientID]
  })
})

// let lastSubmittedVersion
// @desc    Update a document/Submit an op to a document
// @route   POST /doc/op/:docid/:uid
// @access  Private
const updateDocument = (req, res, next) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const { version, op } = req.body
  const clientID = uid
  const client = clients[clientID]

  // check uid exist
  if (!client) {
    throw new Error('uid does not exist')
  }

  const doc = docIDToDocs[docid]

  // logger.info(`client ${uid} attempting to update document ${docid}`)
  // logger.info(`op client sent: `)
  // logger.info(op)
  // logger.info(`version client sent:   ${version}`)
  // logger.info(`doc.version:           ${doc.version}`)

  // doc.submitOp(op, { source: clientID })

  // logger.info(
  //   `client version: ${version}; server version: ${
  //     docVersions[doc.id]
  //   }; doc.version: ${doc.version}}`
  // )

  // doc.fetch((err) => {
  //   if (err) {
  //     throw err
  //   }

  // logger.info(req.body)
  // logger.info(`client: ${version}, docVersions[doc.id]: ${docVersions[doc.id]}`)
  if (
    // version === lastSubmittedVersion /* && */
    version === docVersions[doc.id] /* doc.version */
    // version === doc.version
  ) {
    // logger.info(`[CLIENT] doc version: ${version}`)
    // logger.info('version === doc.version, submitting op, telling client ok')
    // docVersions[doc.id] = doc.version + 1
    // lastSubmittedVersion = version
    docVersions[doc.id] += 1
    doc.submitOp(op, { source: clientID }, (err) => {
      if (err) {
        throw err
      }

      // reset docVersions to doc.version
      docVersions[doc.id] = doc.version

      // Loop all clients and ack ops for source and delta op for others
      const source = clientID
      for (const [clientID, client] of Object.entries(clients)) {
        if (source === clientID) {
          client.res.write(
            `data: ${JSON.stringify({
              ack: op,
            })} \n\n`
          )
        } else {
          if (op.ops) {
            client.res.write(`data: ${JSON.stringify(op.ops)} \n\n`)
          } else {
            client.res.write(`data: ${JSON.stringify(op)} \n\n`)
          }
        }
      }

      res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({ status: 'ok' })
    })
  } else {
    // logger.info(
    //   `RETRY: client: ${version}, server: ${
    //     docVersions[doc.id]
    //   }, doc.version: ${doc.version}`
    // )
    // logger.info(
    //   `RETRY: client: ${version}, lastSubmittedVersion: ${lastSubmittedVersion}`
    // )
    // logger.info(`RETRY: client: ${version}, doc.version: ${doc.version}`)
    // logger.info(
    //   `RETRY: client: ${version}, docVersions[doc.id]: ${docVersions[doc.id]}`
    // )
    // logger.info(op)
    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({ status: 'retry' })
  }
  // })
}

// @desc    Update presence
// @route   POST /doc/presence/:docid/:uid
// @access  Private
const updatePresence = asyncHandler(async (req, res, next) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  let range = req.body // req.body is {index, length}
  range.name = req.session.name
  const clientID = uid
  const client = clients[clientID]
  const doc = docIDToDocs[docid]

  if (!client) {
    next(new Error('client does not exist, unable to update presence'))
  }

  // logger.info(`updating presence for ${uid}`)
  // logger.info(`submitting presence: `)
  // logger.info(range)

  // const presence = doc.connection.getDocPresence(
  //   process.env.CONNECTION_COLLECTION,
  //   docid
  // )

  client.localPresence.submit(range, (err) => {
    if (err) {
      throw err
    }

    // logger.info(`presence submitted with uid: ${uid} and range: `)
    // logger.info(range)

    const presence = connection.getPresence(docid)
    const localPresences = presence.localPresences

    for (const [clientID, localPresence] of Object.entries(localPresences)) {
      const client = clients[clientID]

      // FIXME: might be wrong, include all clients
      // Skip adding presence for this client
      if (clientID === uid) {
        continue
      }

      if (!client) {
        next(
          new Error(
            'localPresences contains presence info for a client that does not exist'
          )
        )
      }

      client.res.write(
        `data: ${JSON.stringify({ presence: { id: uid, cursor: range } })} \n\n`
      )
    }
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({})
})

// @desc    Get doc HTML
// @route   GET /doc/get/:docid/:uid
// @access  Private
const getDoc = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const clientID = uid
  const client = clients[clientID]

  // check uid exist
  if (!client) {
    throw new Error('uid does not exist')
  }

  const doc = docIDToDocs[docid]
  doc.fetch((err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      next(new Error('doc does not exist'))
    }

    const html = new QuillDeltaToHtmlConverter(doc.data.ops).convert()
    // logger.info('getting doc html')
    // logger.info(html)
    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').send(html)
  })
}

module.exports = {
  getDocUI,
  openConnection,
  updateDocument,
  updatePresence,
  getDoc,
}
