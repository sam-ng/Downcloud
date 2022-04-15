const asyncHandler = require('express-async-handler')
const QuillDeltaToHtmlConverter =
  require('quill-delta-to-html').QuillDeltaToHtmlConverter
const { clients } = require('../server')
const { logger } = require('../config/logger')
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')

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

const getDocUI = asyncHandler(async (req, res) => {
  // logger.info(`getting doc ui`)
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').render('pages/document')
})

const openConnection = asyncHandler(async (req, res, next) => {
  if (!req.params) {
    throw new Error('No connection ID or document ID or presenceID specified.')
  }

  const { docid, uid } = req.params
  // logger.info(`opening connection stream for uid: ${uid} in docid: ${docid} `)

  // Open WebSocket connection to ShareDB server
  const rws = new ReconnectingWebSocket(
    `ws://${process.env.SITE}:${process.env.SHAREDB_PORT}`,
    [],
    {
      WebSocket: WebSocket,
      // debug: false,
    }
  )
  const connection = new sharedb.Connection(rws)
  const clientID = uid

  // Get doc instance
  const doc = connection.get(process.env.CONNECTION_COLLECTION, docid)

  // Get inital doc data from server and listen for changes
  doc.subscribe((err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      next(new Error('doc does not exist'))
    }

    // logger.info('subscribed to doc')

    // Create event stream and initial doc data
    // logger.info('sending back inital content and version, logged below: ')
    // logger.info(doc.data.ops)
    // logger.info(doc.version)
    res.set(headers).write(
      `data: ${JSON.stringify({
        content: doc.data.ops,
        version: doc.version,
      })} \n\n`
    )

    // When we apply an op to the doc, update all other clients
    doc.on('op', (op, source) => {
      // logger.info(`applying an op to a doc from source: ${source}`)
      // logger.info(`current doc.version: ${doc.version}`)
      logger.info(`op being applied:`)
      logger.info(op)

      if (clientID === source) {
        logger.info(`acking client ${clientID}`)
        res.write(
          `data: ${JSON.stringify({
            ack: op,
          })} \n\n`
        )
      } else {
        logger.info(`updating client ${clientID}`)
        if (op.ops) {
          res.write(`data: ${JSON.stringify(op.ops)} \n\n`)
        } else {
          res.write(`data: ${JSON.stringify(op)} \n\n`)
        }
      }
    })
  })

  // Get presence
  const presence = doc.connection.getDocPresence(
    process.env.CONNECTION_COLLECTION,
    req.params.docid
  )
  presence.subscribe((err) => {
    if (err) {
      throw err
    }
  })
  presence.on('receive', (id, range) => {
    // logger.info(`presence on receive with id: ${id} and range: `)
    // logger.info(range)
    res.write(
      `data: ${JSON.stringify({ presence: { id, cursor: range } })} \n\n`
    )
  })
  const localPresence = presence.create(clientID)

  // Store client info
  const clientObj = {
    clientID,
    res,
    connection,
    doc,
    presence,
    localPresence,
  }
  clients[clientID] = clientObj

  // Client closed the connection
  req.on('close', () => {
    logger.info(`client ${uid} closed the connection`)
    presence.destroy()
    res.socket.destroy()
    res.end()
    delete clients[clientID]
  })
})

const updateDocument = asyncHandler(async (req, res, next) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const { version, op } = req.body
  const clientID = uid

  // check uid exist
  if (!clients[clientID]) {
    throw new Error('uid does not exist')
  }

  // check if docid matches
  const doc = clients[clientID].doc
  if (docid !== doc.id) {
    throw new Error('docid does not match doc.id of client')
  }

  // logger.info(`client ${uid} attempting to update document ${docid}`)
  logger.info(`op client sent: `)
  logger.info(op)
  // logger.info(`version client sent:   ${version}`)
  // logger.info(`doc.version:           ${doc.version}`)

  // doc.submitOp(op, { source: clientID })

  if (version === doc.version) {
    // logger.info('version === doc.version, submitting op, telling client ok')
    doc.submitOp(op, { source: clientID }, (err) => {
      if (err) {
        throw err
      }

      logger.info(
        `op has been submitted to the server and version has been incremented. doc.version: ${doc.version} `
      )
      res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({ status: 'ok' })
    })
  } else {
    logger.info('version < doc.version, no update, telling client to retry')
    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({ status: 'retry' })
  }
})

const updatePresence = async (req, res) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { uid } = req.params
  const range = req.body // req.body is {index, length}
  range.name = req.session.name
  const clientID = uid

  // logger.info(`updating presence for ${uid}`)
  // logger.info(`presence to submit: `)
  // logger.info(range)

  clients[clientID].localPresence.submit(range, (err) => {
    if (err) {
      throw err
    }

    // logger.info(`presence submitted: `)
    // logger.info(range)
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({})
}

const getDoc = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const clientID = uid

  // check uid exist
  if (!clients[clientID]) {
    throw new Error('uid does not exist')
  }

  // check if docid matches
  const doc = clients[clientID].doc
  if (docid !== doc.id) {
    throw new Error('docid does not match doc.id of client')
  }

  // logger.info(`getting doc ${docid} for ${uid}`)

  doc.fetch((err) => {
    if (err) {
      throw err
    }

    const html = new QuillDeltaToHtmlConverter(doc.data.ops).convert()
    // logger.info(`html to send: `)
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
