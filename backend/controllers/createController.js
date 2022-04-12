const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')
const DocumentMap = require('../models/documentMapModel')
const { v4: uuidv4 } = require('uuid')
const { logger } = require('../config/logger')

const createDoc = asyncHandler(async (req, res) => {
  if (!req.body) {
    logger.error('[createController]: name was not specified')
  }
  const docID = uuidv4()
  const doc = connection.get(process.env.CONNECTION_COLLECTION, docID)
  doc.fetch(async (err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      doc.create([], 'rich-text')
      await DocumentMap.create({ docID, name: req.body.name })
      res
        .set('X-CSE356', '61f9c5ceca96e9505dd3f8b4')
        .status(200)
        .json({ docid: docID })
    } else {
      // FIXME:
      logger.error(
        '[createController]: doc id already exists (should not happen)'
      )
      res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
    }
  })
})

module.exports = { createDoc }
