const dotenv = require('dotenv').config()
const http = require('http')
const express = require('express')
const ShareDB = require('sharedb')
const richText = require('rich-text')
const WebSocket = require('ws')
const WebSocketJSONStream = require('@teamwork/websocket-json-stream')
const port = process.env.SHAREDB_PORT || 8001

ShareDB.types.register(richText.type)
const db = require('sharedb-mongo')(process.env.MONGO_URI)
const backend = new ShareDB({ db, presence: true })

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
// console.log(`Sharedb-server started on port: ${port}`)
