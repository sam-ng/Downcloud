const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')
const { clients } = require('../server')

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

const openConnection = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  // Debug logging
  // console.log(`[connectController]: ${req.params.id} \n opening connection `)

  // Open WebSocket connection to ShareDB server
  const rws = new ReconnectingWebSocket(
    `ws://${process.env.SITE}:${process.env.SHAREDB_PORT}`,
    [],
    {
      WebSocket: WebSocket
      // debug: false,
    }
  )
  const connection = new sharedb.Connection(rws)

  // Get doc instance
  const doc = connection.get(
    process.env.CONNECTION_COLLECTION,
    process.env.CONNECTION_ID
  )

  // Store client info
  const clientID = req.params.id
  const clientObj = { clientID, res, connection, doc }
  clients[clientID] = clientObj

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

  // Client closed the connection
  req.on('close', () => {
    // console.log(`[connectController]: ${req.params.id} \n connection closed `)
    res.end()
    // delete clients[clientID]
  })
}

module.exports = {
  openConnection,
}
