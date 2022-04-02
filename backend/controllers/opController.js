const { clients } = require('../server')

const updateDocument = async (req, res) => {
  if (!req.body) throw new Error('Missing body.')
  if (!req.params) throw new Error('No connection id specified.')

  const clientId = req.params.id
  clients[clientId].doc.submitOp(req.body, { source: clientId })
  res.sendStatus(200)
}

module.exports = {
  updateDocument,
}
