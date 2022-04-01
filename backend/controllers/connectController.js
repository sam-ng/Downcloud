// TODO: Async handler with error middleware
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const WebSocket = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')
sharedb.types.register(richText.type)

const { clients } = require('../server')

const rws = new ReconnectingWebSocket('ws://localhost:8001', [], {
  WebSocket: WebSocket,
  debug: true,
  // reconnectInterval: 3000,
})

const connection = new sharedb.Connection(rws)

const openConnection = async (req, res) => {
  if (!req.params) throw new Error('No connection id specified.')

  const clientId = req.params.id

  let doc = connection.get('collection', 'document')

  const clientObj = { doc, res }
  clients[clientId] = clientObj

  doc.subscribe((err) => {
    console.log('subscribe')
    if (err) throw err
    // if (doc.type === null) {
    //   doc.create([{ insert: 'Hi!' }], 'rich-text')
    // }
    // propagate document deltas to all clients
    // for (const id in clients) {
    //   if (id === clientId) continue
    //   console.log('sending')
    //   console.log(doc.data.ops)

    //   // doc.on('op', (op, source) => {
    //   //   if (source === quill)
    //   // })
    //   console.log('writing message')

    //   clients[id].res.set(headers)
    //   clients[id].res.write(
    //     `data: ${JSON.stringify({ content: doc.data.ops })}\n\n`
    //   )
    // }
    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': 'http://localhost:8000',
    }
    console.log(doc.data)
    res.set(headers)
    res.write(`data: ${JSON.stringify(doc.data.ops)}\n\n`)
    res.end()
  })

  req.on('close', () => {
    console.log(`${clientId} Connection closed`)
    delete clients[clientId]
  })
}

module.exports = {
  openConnection,
}
