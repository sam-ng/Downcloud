const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')
const { v4: uuidv4 } = require('uuid')

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
    }

    res.sendStatus(200)
  })
})

module.exports = { createDoc }
