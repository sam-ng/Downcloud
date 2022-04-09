const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')

const getList = asyncHandler(async (req, res) => {
  const query = connection.createFetchQuery(
    process.env.CONNECTION_COLLECTION,
    {}
  )
  query.on('ready', () => {
    const docs = query.results
    res.send(docs.map((doc) => ({ id: doc.id, data: doc.data })))
  })
})

module.exports = {
  getList,
}
