const dotenv = require('dotenv').config()
const http = require('http')
const express = require('express')
const ShareDB = require('sharedb')
const MongoMilestoneDB = require('sharedb-milestone-mongo')
const richText = require('rich-text')
const WebSocket = require('ws')
const WebSocketJSONStream = require('@teamwork/websocket-json-stream')
const port = process.env.SHAREDB_PORT || 8001
const { logger } = require('./config/logger')
const connectDatabase = require('./config/db')
const DocumentMap = require('./models/documentMapModel')
const esClient = require('../backend/config/elastic')
const MongoClient = require('mongodb').MongoClient
let QuillDeltaToHtmlConverter =
  require('quill-delta-to-html').QuillDeltaToHtmlConverter
const indexController = require('./controllers/indexController')

// Configure ShareDB
ShareDB.types.register(richText.type)

// Connect to Mongo database
const connectMongoClient = async (client) => {
  await client.connect()
}
connectDatabase()

// Elastic variables
const INDEX = 'downcloud'
const CUSTOM_ANALYZER_NAME = 'custom_analyzer'
const numVersionsForSnapshot = 10
const client = new MongoClient(process.env.MONGO_URI)
connectMongoClient(client)
const database = client.db('test')
const snapshotCollection = database.collection('m_collection')

// Configure Mongo Milestone for ShareDB
const db = require('sharedb-mongo')(process.env.MONGO_URI)
const milestoneDb = new MongoMilestoneDB({
  mongo: process.env.MONGO_URI,
})
const backend = new ShareDB({ db, presence: true, milestoneDb })

backend.use('commit', async (request, callback) => {
  if (request.snapshot.v % numVersionsForSnapshot === 0) {
    request.saveMilestoneSnapshot = true

    const docID = request.snapshot.id
    const docMap = await DocumentMap.findOne({ docID })
    const docName = docMap.name
    const latestSnapshot = await snapshotCollection
      .find({ d: docID })
      .sort({ _id: -1 })
      .limit(1)
      .toArray()

    console.log(latestSnapshot)
    console.log(docID)

    // snapshot not created yet
    if (!latestSnapshot || latestSnapshot.length === 0) {
      console.log('snapshot not created')
      callback()
      return
    }

    console.log('snapshot was created already')

    const content = latestSnapshot[0].data.ops
    const cfg = {}
    const converter = new QuillDeltaToHtmlConverter(content, cfg)
    const html = converter.convert()
    console.log('before response')
    const response = await indexController.addToIndexHelper(
      INDEX,
      docName,
      html,
      docID
    )
    console.log(response)
  } else {
    console.log('not saving every 10 snapshot')
    request.saveMilestoneSnapshot = false
  }

  callback()
})

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
