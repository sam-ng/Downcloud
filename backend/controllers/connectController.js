// const connection = require('../config/connection')
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')

// Register rich text
sharedb.types.register(richText.type)

const { clients } = require('../server')
const tinycolor = require('tinycolor2')

// HTTP event stream headers
const headers = {
  'X-CSE356': '61f9c5ceca96e9505dd3f8b4',
  'Content-Type': 'text/event-stream',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': `http://${process.env.SITE}:${process.env.SERVER_PORT}`,
}

const openConnection = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection ID or document ID or presenceID specified.')
  }

  // Debug logging
  // console.log(`[connectController]: ${req.params.id} \n opening connection `)
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
  const clientID = req.params.id

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

    // Debug logging
    // console.log(`[connectController]: ${req.params.id} \n subscribe `)

    // // FIXME: remove
    // console.log(
    //   `[connectController]: ${req.params.id} \n doc.data: ${JSON.stringify(
    //     doc.data
    //   )} `
    // )
    // console.log(
    //   `[connectController]: ${req.params.id} \n doc.data.ops: ${JSON.stringify(
    //     doc.data.ops
    //   )} `
    // )

    // Create event stream and initial doc data
    res.set(headers)
    res.write(`data: ${JSON.stringify({ content: doc.data.ops })} \n\n`)

    // When we apply an op to the doc, update all other clients
    doc.on('op', (op, source) => {
      // FIXME: remove
      if (clientID === source) return
      // console.log(
      //   `[connectController]: ${req.params.id} \n op: ${JSON.stringify([op])} `
      // )
      // console.log(`[connectController]: ${req.params.id} \n source: ${source} `)

      res.write(`data: ${JSON.stringify([op])}\n\n`)
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
    console.log(range)
    const colors = {}
    colors[id] = colors[id] || tinycolor.random().toHexString()
    const name = (range && range.name) || 'Anonymous'
    const cursorData = { id, name, color: colors[id], range }
    res.write(`data: ${JSON.stringify({ presence: cursorData })} \n\n`)
  })
  presence.on('error', (err) => {
    console.log(err)
    if (err) {
      throw err
    }
  })
  const localPresence = presence.create()
  // localPresence.submit({ index: 3, length: 3 })

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
    presence.destroy()
    // console.log(`[connectController]: ${req.params.id} \n connection closed `)
    res.end()
    // delete clients[clientID]
  })
}

module.exports = {
  openConnection,
}
