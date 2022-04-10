const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')

// Register rich text
sharedb.types.register(richText.type)
// Open WebSocket connection to ShareDB server
const rws = new ReconnectingWebSocket(
  `ws://${process.env.SITE}:${process.env.SHAREDB_PORT}`,
  [],
  {
    WebSocket: WebSocket,
    // debug: false,
  }
)
const connection = new sharedb.Connection(rws)

module.exports = connection
