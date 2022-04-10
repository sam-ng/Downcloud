const QuillDeltaToHtmlConverter =
  require('quill-delta-to-html').QuillDeltaToHtmlConverter
const { clients } = require('../server')
const { logger } = require('../config/logger')

const getDoc = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const clientID = req.params.id

  // logger.info(
  //   `[docController]: ${
  //     req.params.id
  //   } \n clients[clientID].doc.data.ops: ${JSON.stringify(
  //     clients[clientID].doc.data.ops
  //   )} `
  // )

  const doc = clients[clientID].doc
  doc.fetch((err) => {
    if (err) throw err

    const html = new QuillDeltaToHtmlConverter(doc.data.ops).convert()

    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').send(html)
  })
}

module.exports = {
  getDoc,
}
