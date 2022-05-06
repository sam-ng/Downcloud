const dotenv = require('dotenv').config()
const http = require('http')
const express = require('express')
const ShareDB = require('sharedb')
const richText = require('rich-text')
const WebSocket = require('ws')
const WebSocketJSONStream = require('@teamwork/websocket-json-stream')
const port = process.env.SHAREDB_PORT || 8001
const { logger } = require('./config/logger')

// Configure ShareDB
ShareDB.types.register(richText.type)

// Configure Mongo Milestone for ShareDB
const db = require('sharedb-mongo')(process.env.MONGO_URI)
const backend = new ShareDB({ db, presence: true /* milestoneDb */ })

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
logger.info(`Sharedb-server started on port: ${port}`)
