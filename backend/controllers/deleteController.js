const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')
const { logger } = require('../config/logger')

const deleteDoc = asyncHandler(async (req, res) => {
  if (!req.body) {
    logger.error('[deleteController]: doc ID was not specified')
  }
  const doc = connection.get(process.env.CONNECTION_COLLECTION, req.body.docid)
  doc.fetch((err) => {
    if (err) {
      throw err
    }

    if (doc.type !== null) {
      doc.del()
      doc.destroy()
    } else {
      // FIXME:
      logger.error('[deleteController]: doc ID does not exist')
    }

    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
  })
})

module.exports = { deleteDoc }
