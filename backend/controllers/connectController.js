// TODO: Async handler with error middleware
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
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
  res.writeHead(200, headers)

  const clientId = req.params.id

  const rws = new ReconnectingWebSocket('ws://localhost:8001')
  const connection = new sharedb.Connection(rws)
  let doc = connection.get('collection', 'document')
  doc.subscribe((err) => {
    if (err) throw err
    // propagate document deltas to all clients
    for (const id in clients) {
      clients[id].res.json({ data: doc.data })
    }
  })

  const clientObj = { doc, res }

  clients[clientId] = clientObj
  request.on('close', () => {
    console.log(`${clientId} Connection closed`)
    clients = clients.filter((client) => client.id !== clientId)
  })
  res.send(200)
}

module.exports = {
  openConnection,
}
