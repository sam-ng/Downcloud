const asyncHandler = require('express-async-handler')
const QuillDeltaToHtmlConverter =
  require('quill-delta-to-html').QuillDeltaToHtmlConverter
const { clients, docVersions } = require('../server')
const { logger, objLogger } = require('../config/logger')
const sharedb = require('sharedb/lib/client')
const richText = require('rich-text')
const ReconnectingWebSocket = require('reconnecting-websocket')
const WebSocket = require('ws')
const connection = require('../config/connection')
const indexController = require('./indexController')
const DocumentMap = require('../models/documentMapModel')

// Elastic indexing: least recently modified docs
let localDocMap = new Map()
let lrmDocsHead = null
let lrmDocsTail = null
const docIDsToDocTimeNode = new Map()
// let docTimeNode = {
//   docid,
//   title,
//   content,
//   lastModifiedTime,
//   prev,
//   next,
// }

// Register rich text
sharedb.types.register(richText.type)

// HTTP event stream headers
const headers = {
  'X-CSE356': '61f9c5ceca96e9505dd3f8b4',
  'Content-Type': 'text/event-stream',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': `http://${process.env.SITE}:${process.env.SERVER_PORT}`,
  'X-Accel-Buffering': 'no',
}

// @desc    Render doc
// @route   GET /doc/edit/:docid
// @access  Private
const getDocUI = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').render('pages/document')
})

// @desc    Open a connection
// @route   GET /doc/connect/:docid/:uid
// @access  Private
const openConnection = asyncHandler(async (req, res, next) => {
  if (!req.params) {
    throw new Error('No connection ID or document ID or presenceID specified.')
  }

  const { docid, uid } = req.params
  const clientID = uid

  logger.info(`connecting uid: ${uid} in docid: ${docid} `)

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
  // const rws = new WebSocket(
  //   `ws://${process.env.SITE}:${process.env.SHAREDB_PORT}`
  // )
  // const connection = new sharedb.Connection(rws)

  // Get doc
  const doc = connection.get(process.env.CONNECTION_COLLECTION, docid)

  // Set event stream headers
  res.set(headers)

  // Get inital doc data from server and listen for changes
  doc.subscribe((err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      next(new Error('doc does not exist'))
      return
    }

    // logger.info('subscribed to doc')

    // Create event stream and initial doc data
    // logger.info(`sending back version ${doc.version} content: ${JSON.stringify(doc.data.ops)}`)
    res.write(
      `data: ${JSON.stringify({
        content: doc.data.ops,
        version: doc.version,
      })} \n\n`
    )

    // Save doc version if it does not already exist
    if (!docVersions[doc.id]) {
      docVersions[doc.id] = doc.version
    }
  })

  // When we apply an op to the doc, update all other clients
  doc.on('op', (op, source) => {
    // logger.info(`${clientID} applying op from ${source}: ${JSON.stringify(op)}`)

    if (clientID === source) {
      // logger.info(`acking client ${clientID}`)
      // res.write(
      //   `data: ${JSON.stringify({
      //     ack: op,
      //   })} \n\n`
      // )
    } else {
      // logger.info(`updating client ${clientID}`)
      if (op.ops) {
        res.write(`data: ${JSON.stringify(op.ops)} \n\n`)
      } else {
        res.write(`data: ${JSON.stringify(op)} \n\n`)
      }
    }
  })

  // Get presence
  const presence = doc.connection.getDocPresence(
    process.env.CONNECTION_COLLECTION,
    docid
  )

  // Subscribe to presence updates
  // TODO: check if subscribing multiple times to a document causes an issue.
  presence.subscribe((err) => {
    if (err) {
      throw err
    }

    // logger.info('presence subscribed')
  })

  // An update from a remote presence client has been received
  presence.on('receive', (id, range) => {
    // logger.info(`presence received from ${id}: ${JSON.stringify(range)}`)
    res.write(
      `data: ${JSON.stringify({ presence: { id, cursor: range } })} \n\n`
    )
  })

  const localPresence = presence.create(clientID)

  // Store client info
  const clientObj = {
    clientID,
    res,
    connection,
    doc,
    presence,
    localPresence,
    rws,
  }
  clients[clientID] = clientObj

  // Client closed the connection
  req.on('close', () => {
    logger.info(`client ${uid} closed the connection`)

    // presence.destroy()
    doc.destroy()
    if (res.socket) {
      res.socket.destroy()
    }
    res.end()
    rws.close()

    // delete clients[clientID]
  })
})

// @desc    Update a document/Submit an op to a document
// @route   POST /doc/op/:docid/:uid
// @access  Private
const updateDocument = asyncHandler(async (req, res, next) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const { version, op } = req.body
  const clientID = uid
  const client = clients[clientID]
  const doc = client.doc

  // check uid exist
  if (!clients[clientID]) {
    throw new Error('uid does not exist')
  }

  // check if docid matches
  if (docid !== doc.id) {
    throw new Error('docid does not match doc.id of client')
  }

  // logger.info(`client ${uid} attempting to update document ${docid}`)
  // logger.info(op)
  // logger.info(`version client sent:   ${version}`)
  // logger.info(`docVersions[doc.id]:   ${docVersions[doc.id]}`)

  if (version === docVersions[doc.id]) {
    docVersions[doc.id] += 1
    doc.submitOp(op, { source: clientID }, (err) => {
      if (err) {
        throw err
      }

      // reset docVersions to doc.version
      docVersions[doc.id] = doc.version

      client.res.write(
        `data: ${JSON.stringify({
          ack: op,
        })} \n\n`
      )

      // save op as docTimeNode
      saveOpAsDocTimeNode(docid, doc.data.ops)

      res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({ status: 'ok' })
    })
  } else {
    // logger.info(`RETRY: client: ${version}, server: ${docVersions[doc.id]}`)
    // logger.info(op)
    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({ status: 'retry' })
  }
})

const saveOpAsDocTimeNode = async (docid, content) => {
  let node = docIDsToDocTimeNode.get(docid)

  // Node already exist in linked list
  if (node) {
    // update time and content
    node.lastModifiedTime = Date.now()
    node.content = content

    // case: node is head and tail (1 node in linked list)
    if (node === lrmDocsHead && node === lrmDocsTail) {
      // do nothing
      return
    }

    // case: node is head (at least 2 nodes in linked list)
    if (node === lrmDocsHead) {
      // set new head
      lrmDocsHead = node.next
      lrmDocsHead.prev = null

      // move node to end of linked list
      node.prev = lrmDocsTail
      lrmDocsTail.next = node
      node.next = null

      // update tail
      lrmDocsTail = node

      return
    }

    // case: node is tail (at least 2 nodes in linked list)
    if (node === lrmDocsTail) {
      // do nothing
      return
    }

    // case: middle node
    // get prev and next nodes
    let beforeNode = node.prev
    let afterNode = node.next

    // remove node from middle of linked list
    beforeNode.next = afterNode
    afterNode.prev = beforeNode

    // add node to end of linked list
    node.prev = lrmDocsTail
    lrmDocsTail.next = node
    node.next = null

    // update tail
    lrmDocsTail = node

    return
  }

  // Create node; node does not exist yet
  let title = localDocMap.get(docid)
  if (!title) {
    const docMap = await DocumentMap.findOne({ docID: docid })
    title = docMap.name
    localDocMap.set(docid, title)
  }
  node = {
    docid,
    title,
    content,
    lastModifiedTime: Date.now(),
    prev: null,
    next: null,
  }

  // Save node in linked list
  if (!lrmDocsHead) {
    // no items in linked list
    lrmDocsHead = node
    lrmDocsTail = node
  } else {
    // at least 1 item in linked list; add to end
    node.prev = lrmDocsTail
    lrmDocsTail.next = node

    // update tail
    lrmDocsTail = node
  }

  // Add node to map
  docIDsToDocTimeNode.set(docid, node)
}

// @desc    Update presence
// @route   POST /doc/presence/:docid/:uid
// @access  Private
const updatePresence = asyncHandler(async (req, res) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { uid } = req.params
  let range = req.body // req.body is {index, length}
  range.name = req.session.name
  const clientID = uid
  const client = clients[clientID]

  // logger.info(`updating presence for ${uid}`)
  // logger.info(`presence to submit: `)
  // logger.info(range)

  client.localPresence.submit(range, (err) => {
    if (err) {
      throw err
    }

    // logger.info(`presence submitted: `)
    // logger.info(range)
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({})
})

// @desc    Get doc HTML
// @route   GET /doc/get/:docid/:uid
// @access  Private
const getDoc = asyncHandler(async (req, res) => {
  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const { docid, uid } = req.params
  const clientID = uid
  const client = clients[clientID]
  const doc = client.doc

  // check uid exist
  if (!clients[clientID]) {
    throw new Error('uid does not exist')
  }

  // check if docid matches
  if (docid !== doc.id) {
    throw new Error('docid does not match doc.id of client')
  }

  doc.fetch((err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      next(new Error('doc does not exist'))
    }

    const html = new QuillDeltaToHtmlConverter(doc.data.ops).convert()
    // logger.info('getting doc html')
    // logger.info(html)
    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').send(html)
  })
})

module.exports = {
  getDocUI,
  openConnection,
  updateDocument,
  updatePresence,
  getDoc,
}

// Set intervals
const intervalTime = 5000
const lastOpTime = 5000
const indexDocument = () => {
  let nodeptr = lrmDocsHead
  while (nodeptr != null) {
    const timeNow = Date.now()
    const timeSubmittedOp = nodeptr.lastModifiedTime
    const diff = timeNow - timeSubmittedOp

    // don't index
    if (diff < lastOpTime) {
      break
    }

    // index the doc
    const html = new QuillDeltaToHtmlConverter(nodeptr.content).convert()
    indexController.addToIndexHelper(
      'downcloud',
      nodeptr.title,
      html,
      nodeptr.docid
    )

    // remove from linked list
    if (nodeptr === lrmDocsTail) {
      lrmDocsTail = null
    } else {
      nodeptr.next.prev = null
    }

    // remove from map
    docIDsToDocTimeNode.delete(nodeptr.docid)

    // move nodeptr and head
    nodeptr = nodeptr.next
    lrmDocsHead = nodeptr
  }
}
setInterval(indexDocument, 5000)
