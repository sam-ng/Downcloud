// TODO: Async handler with error middleware
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')
const rws = new ReconnectingWebSocket('ws://localhost:8001', [], {
  WebSocket: WebSocket,
  debug: true,
  // reconnectInterval: 3000,
})

sharedb.types.register(richText.type)
const { clients } = require('../server')

const openConnection = async (req, res) => {
  console.log('opening connection')
  const connection = new sharedb.Connection(rws)
  if (!req.params) throw new Error('No connection id specified.')

  const clientId = req.params.id

  let doc = connection.get('collection', 'document')

  const clientObj = { clientId, res, connection, doc }
  clients[clientId] = clientObj

  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': 'http://localhost:8000',
  }

  doc.subscribe((err) => {
    console.log('subscribe')
    if (err) throw err

    console.log(doc.data)
    res.set(headers)
    res.write(`data: ${JSON.stringify(doc.data.ops)}\n\n`)
  })

  doc.on('op', (op, source) => {
    // propagate document deltas to all other clients
    for (const id in clients) {
      if (id === source) continue
      console.log('Broadcasting to all other clients.')
      console.log(op)

      clients[id].res.write(`data: ${JSON.stringify(op)}\n\n`)
    }
  })

  req.on('close', () => {
    console.log(`${clientId} Connection closed`)
    delete clients[clientId]
  })
}

module.exports = {
  openConnection,
}
