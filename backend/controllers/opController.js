const { logger } = require('../config/logger')
const { clients } = require('../server')

const updateDocument = async (req, res) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  // logger.info(
  //   `[opController]: ${req.params.id}; submit op: ${JSON.stringify(req.body)} `
  // )

  const clientID = req.params.id
  req.body.forEach((oplist) => {
    clients[clientID].doc.submitOp(oplist, { source: clientID })
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
}

module.exports = {
  updateDocument,
}
