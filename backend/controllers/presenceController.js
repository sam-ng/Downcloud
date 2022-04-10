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
  console.log('submitting ' + JSON.stringify(range))
  console.log(clients[clientID].localPresence.presence)
  clients[clientID].localPresence.submit(range, (err) => {
    if (err) throw err
  })

  res.sendStatus(200)
}

module.exports = {
  updatePresence,
}
