const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')
const { uuid } = require('uuidv4')

const createDoc = asyncHandler(async (req, res) => {
  const doc = connection.get(process.env.CONNECTION_COLLECTION, uuid())
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
