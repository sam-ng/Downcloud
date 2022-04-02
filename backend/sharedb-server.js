const dotenv = require('dotenv').config()
const http = require('http')
const express = require('express')
const ShareDB = require('sharedb')
const richText = require('rich-text')
const WebSocket = require('ws')
const WebSocketJSONStream = require('@teamwork/websocket-json-stream')
const port = process.env.SHAREDB_PORT || 8001

ShareDB.types.register(richText.type)
const backend = new ShareDB()
const connection = backend.connect()
const doc = connection.get(
  process.env.CONNECTION_COLLECTION,
  process.env.CONNECTION_ID
)

// Get doc data
doc.fetch((err) => {
  if (err) {
    throw err
  }

  // Create a new doc if it doesn't exist
  if (doc.type === null) {
    doc.create([{ insert: 'Hi!' }], 'rich-text')
  }

  // Start server
  const app = express()
  const server = http.createServer(app)

  // Connect any incoming WebSocket connection to ShareDB
  const wss = new WebSocket.Server({ server })
  wss.on('connection', (ws) => {
    let stream = new WebSocketJSONStream(ws)
    backend.listen(stream)
  })

  server.listen(port)
  console.log(`Sharedb-server started on port: ${port}`)
})
