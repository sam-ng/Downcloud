const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')

const renderHome = asyncHandler(async (req, res) => {
  if (req.session.auth) {
    const query = connection.createFetchQuery(
      process.env.CONNECTION_COLLECTION,
      {}
    )
    query.on('ready', () => {
      const docs = query.results
      res.render('pages/index', {
        auth: req.session.auth,
        docList: docs.map((doc) => doc.id),
      })
    })
  } else {
    res.render('pages/index', { auth: req.session.auth })
  }
})

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
  renderHome,
  getList,
}
