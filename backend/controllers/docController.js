const QuillDeltaToHtmlConverter =
  require('quill-delta-to-html').QuillDeltaToHtmlConverter
const { clients } = require('../server')

const getDocument = async (req, res) => {
  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  // FIXME: remove
  console.log(
    `[docController]: ${
      req.params.id
    } \n clients[clientID].doc.data.ops: ${JSON.stringify(
      clients[clientID].doc.data.ops
    )} `
  )

  const clientID = req.params.id
  const html = new QuillDeltaToHtmlConverter(
    clients[clientID].doc.data.ops
  ).convert()

  res.send(html)
}

module.exports = {
  getDocument,
}
