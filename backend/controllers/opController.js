const { clients } = require('../server')

const updateDocument = async (req, res) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  // Debug log
  console.log(
    `[opController]: ${req.params.id} \n submit op: ${JSON.stringify(
      req.body
    )} `
  )

  const clientID = req.params.id
  req.body.forEach((oplist) => {
    clients[clientID].doc.submitOp(oplist, { source: clientID })
  })

  res.sendStatus(200)
}

module.exports = {
  updateDocument,
}
