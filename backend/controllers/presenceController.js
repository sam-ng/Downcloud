const { clients } = require('../server')

const updatePresence = async (req, res) => {
  if (!req.body) {
    throw new Error('Missing body.')
  }

  if (!req.params) {
    throw new Error('No connection id specified.')
  }

  const clientID = req.params.id
  const range = req.body
  range.name = req.session.username
  console.log('submitting :' + Object.keys(clients))
  clients[clientID].localPresence.submit(range, (err) => {
    console.log('error: ' + err)
    if (err) throw err
  })

  res.sendStatus(200)
}

module.exports = {
  updatePresence,
}
