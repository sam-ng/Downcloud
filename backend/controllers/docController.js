const asyncHandler = require('express-async-handler')
const QuillDeltaToHtmlConverter =
  require('quill-delta-to-html').QuillDeltaToHtmlConverter
const { clients } = require('../server')
const { logger } = require('../config/logger')
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')
const tinycolor = require('tinycolor2')

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
  // logger.info(`[docController]: getting doc ui`)
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').render('pages/document')
})

const openConnection = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection ID or document ID or presenceID specified.')
  }

  const { docid, uid } = req.params

  // logger.info(`[docController]: opening connection stream`)
  // logger.info(`[docController]: docid: ${docid}; uid: ${uid}`)

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
  const clientID = req.params.uid

  // Get doc instance
  const doc = connection.get(
    process.env.CONNECTION_COLLECTION,
    req.params.docid
  )

  // Get inital doc data from server and listen for changes
  doc.subscribe((err) => {
    if (err) {
      throw err
    }

    // logger.info(`[connectController]: client: ${req.params.uid}; subscribe to doc: ${req.params.docid} `)
    // logger.info(
    //   `[connectController]: ${req.params.uid} \n doc.data: ${JSON.stringify(
    //     doc.data
    //   )} `
    // )
    // logger.info(
    //   `[connectController]: ${req.params.uid} \n doc.data.ops: ${JSON.stringify(
    //     doc.data.ops
    //   )} `
    // )

    // Create event stream and initial doc data
    res.set(headers).write(
      `data: ${JSON.stringify({
        content: doc.data.ops,
        version: doc.version,
      })} \n\n`
    )
    // .write(`data: ${JSON.stringify({ content: doc.data.ops })} \n\n`)

    // When we apply an op to the doc, update all other clients
    doc.on('op', (op, source) => {
      logger.info(`[docController]: op: ${JSON.stringify(op)}`)
      logger.info(`doc.version before if statment: ${doc.version}`)
      if (clientID === source) {
        logger.info(`ack op`)
        res.write(
          `data: ${JSON.stringify({
            ack: op,
            tempversion: doc.version,
          })} \n\n`
        )
      } else {
        logger.info(`update op from other client`)
        // res.write(`data: ${JSON.stringify(op)} \n\n`)
        res.write(
          `data: ${JSON.stringify({ op, tempversion: doc.version })} \n\n`
        )
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
    const colors = {}
    colors[id] = colors[id] || tinycolor.random().toHexString()
    const name = (range && range.name) || 'Anonymous'
    // const cursorData = { id, name, color: colors[id], range }

    // console.log(id)
    // console.log(range)
    res.write(
      `data: ${JSON.stringify({ presence: { id, cursor: range } })} \n\n`
    )
  })
  const localPresence = presence.create()

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
    logger.info('client closed the connection')
    // logger.info(`[connectController]: ${req.params.uid} \n connection closed `)
    presence.destroy()
    res.end()
    // delete clients[clientID]
  })
}

const updateDocument = asyncHandler(async (req, res) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const { version, op } = req.body
  const clientID = uid

  logger.info(`[docController]: updating document`)
  logger.info(
    `[docController]: docid: ${docid}; uid: ${uid}; op: ${JSON.stringify(op)}} `
  )

  const doc = clients[clientID].doc
  logger.info(`version: ${version}; doc.version: ${doc.version}`)

  if (version === doc.version) {
    logger.info('version = doc.version, submitting op')
    clients[clientID].doc.submitOp(op, { source: clientID }, (err) => {
      if (err) {
        throw err
      }

      // once op is committed, this is called
      // The version will only be incremented for local ops sent through submitOp() after the server has acknowledged the op, when the submitOp callback has been called.
      // do we need await somewhere? idk
      // wait let me see something
      // hmm, we might need await if it's the sender
      // let's see
      logger.info(
        `op has been commited to the server and version has been incremented. doc.version: ${doc.version} `
      )
    })
    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({ status: 'ok' })
  } else {
    logger.info('version != doc.version, no update')
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

  const clientID = req.params.uid
  const range = req.body // req.body is {index, length}
  range.name = req.session.name

  // logger.info(`[docController]: updating presence`)

  // logger.info(
  //   `user: ${
  //     req.session.name
  //   }, clientID/tab: ${clientID}, range: ${JSON.stringify(range)} `
  // )

  clients[clientID].localPresence.submit(range, (err) => {
    if (err) {
      throw err
    }
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
}

const getDoc = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const clientID = uid

  const doc = clients[clientID].doc
  doc.fetch((err) => {
    if (err) {
      throw err
    }

    const html = new QuillDeltaToHtmlConverter(doc.data.ops).convert()
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
