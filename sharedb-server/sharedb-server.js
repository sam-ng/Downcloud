const http = require('http')
const express = require('express')
const ShareDB = require('sharedb')
const richText = require('rich-text')
const WebSocket = require('ws')
const WebSocketJSONStream = require('@teamwork/websocket-json-stream')

ShareDB.types.register(richText.type)
const backend = new ShareDB()
const port = 8001

const connection = backend.connect()
doc = connection.get('collection', 'document')
doc.fetch((err) => {
  if (err) throw err
  if (doc.type === null) {
    doc.create([{ insert: 'Hi!' }], 'rich-text')
  }

  // start server
  const app = express()
  const server = http.createServer(app)

  const wss = new WebSocket.Server({ server })
  wss.on('connection', (ws) => {
    let stream = new WebSocketJSONStream(ws)
    backend.listen(stream)
  })

  server.listen(port)
  console.log(`sharedb-server running on ${port}`)
})
