// TODO: Async handler with error middleware
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const WebSocket = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')
sharedb.types.register(richText.type)

const { clients } = require('../server')

const openConnection = async (req, res) => {
  if (!req.params) throw new Error('No connection id specified.')

  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  }
  res.set(headers)

  const clientId = req.params.id

  const rws = new ReconnectingWebSocket('ws://localhost:8001', [], {
    WebSocket: WebSocket,
    debug: true,
    // reconnectInterval: 3000,
  })

  const connection = new sharedb.Connection(rws)
  let doc = connection.get('collection', 'document')

  const clientObj = { doc, res }

  clients[clientId] = clientObj

  doc.subscribe((err) => {
    if (err) throw err
    // propagate document deltas to all clients
    for (const id in clients) {
      console.log('sending')
      console.log(doc.data)
      clients[id].res.json({ data: doc.data })
    }
  })

  // req.on('close', () => {
  //   console.log(`${clientId} Connection closed`)
  //   clients = clients.filter((client) => client.id !== clientId)
  // })
  // res.sendStatus(200)
}

module.exports = {
  openConnection,
}
