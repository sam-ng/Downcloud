const { logger } = require('../config/logger')
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

  // logger.info(
  //   `user: ${
  //     req.session.username
  //   }, clientID/tab: ${clientID}, range: ${JSON.stringify(range)} `
  // )

  clients[clientID].localPresence.submit(range, (err) => {
    if (err) {
      throw err
    }
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
}

module.exports = {
  updatePresence,
}
