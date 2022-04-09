const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')

// Find lowest missing id https://www.youtube.com/watch?v=8g78yfzMlao&ab_channel=NeetCode
const generateID = (arr) => {
  for (let i = 0; i < arr.length; i++) {
    let val = Math.abs(arr[i])
    if (1 <= val <= arr.length) {
      if (arr[val - 1] > 0) {
        arr[val - 1] *= -1
      } else if (arr[val - 1] == 0) {
        arr[val - 1] = -1 * (arr.length + 1)
      }
    }
  }
  for (let j = 1; j <= arr.length; j++) {
    if (arr[j - 1] >= 0) {
      return j
    }
  }
  return arr.length + 1
}

const createDoc = asyncHandler(async (req, res) => {
  const query = connection.createFetchQuery(
    process.env.CONNECTION_COLLECTION,
    {}
  )
  query.on('ready', () => {
    const docs = query.results

    let docIDs = docs.map((doc) => parseInt(doc.id))
    const newID = generateID(docIDs)

    const doc = connection.get(process.env.CONNECTION_COLLECTION, newID)
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
})

module.exports = { createDoc }
