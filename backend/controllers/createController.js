const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')
const { v4: uuidv4 } = require('uuid')
const { logger } = require('../config/logger')

const createDoc = asyncHandler(async (req, res) => {
  const doc = connection.get(process.env.CONNECTION_COLLECTION, uuidv4())
  doc.fetch((err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      doc.create([], 'rich-text')
    } else {
      // FIXME:
      logger.error(
        '[createController]: doc id already exists (should not happen)'
      )
    }

    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
  })
})

module.exports = { createDoc }
