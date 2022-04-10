const connection = require('../config/connection')
const { clients } = require('../server')
const tinycolor = require('tinycolor2')

// HTTP event stream headers
const headers = {
  'X-CSE356': '61f9c5ceca96e9505dd3f8b4',
  'Content-Type': 'text/event-stream',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': `http://${process.env.SITE}:${process.env.SERVER_PORT}`,
}

const openConnection = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection ID or document ID or presenceID specified.')
  }

  // Debug logging
  // console.log(`[connectController]: ${req.params.id} \n opening connection `)
  const clientID = req.params.id

  // Get doc instance
  const doc = connection.get(
    process.env.CONNECTION_COLLECTION,
    req.params.docid
  )

  // Get presence
  const presence = doc.connection.getDocPresence(
    process.env.CONNECTION_COLLECTION,
    req.params.docid
  )
  presence.subscribe((err) => {
    if (err) {
      throw err
    }
  })
  const localPresence = presence.create()

  // Store client info
  const clientObj = { clientID, res, connection, doc, presence, localPresence }
  clients[clientID] = clientObj

  // Get inital doc data from server and listen for changes
  doc.subscribe((err) => {
    if (err) {
      throw err
    }

    // Debug logging
    // console.log(`[connectController]: ${req.params.id} \n subscribe `)

    // // FIXME: remove
    // console.log(
    //   `[connectController]: ${req.params.id} \n doc.data: ${JSON.stringify(
    //     doc.data
    //   )} `
    // )
    // console.log(
    //   `[connectController]: ${req.params.id} \n doc.data.ops: ${JSON.stringify(
    //     doc.data.ops
    //   )} `
    // )

    // Create event stream and initial doc data
    res.set(headers)
    res.write(`data: ${JSON.stringify({ content: doc.data.ops })} \n\n`)

    presence.on('receive', (id, range) => {
      console.log(range)
      const colors = {}
      colors[id] = colors[id] || tinycolor.random().toHexString()
      const name = (range && range.name) || 'Anonymous'
      const cursorData = { id, name, color: colors[id], range }
      res.write(`data: ${JSON.stringify({ presence: cursorData })} \n\n`)
    })
    // When we apply an op to the doc, update all other clients
    doc.on('op', (op, source) => {
      // FIXME: remove
      if (clientID === source) return
      // console.log(
      //   `[connectController]: ${req.params.id} \n op: ${JSON.stringify([op])} `
      // )
      // console.log(`[connectController]: ${req.params.id} \n source: ${source} `)

      res.write(`data: ${JSON.stringify([op])}\n\n`)
    })
  })

  // Client closed the connection
  req.on('close', () => {
    // console.log(`[connectController]: ${req.params.id} \n connection closed `)
    res.end()
    // delete clients[clientID]
  })
}

module.exports = {
  openConnection,
}
