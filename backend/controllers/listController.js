const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')

const renderHome = asyncHandler(async (req, res) => {
  if (req.session.auth) {
    // Render list of documents
    const query = connection.createFetchQuery(
      process.env.CONNECTION_COLLECTION,
      {}
    )
    query.on('ready', () => {
      const docs = query.results
      res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').render('pages/index', {
        auth: req.session.auth,
        docIDList: docs.map((doc) => doc.id),
      })
    })
  } else {
    // Render login/signup page
    res
      .set('X-CSE356', '61f9c5ceca96e9505dd3f8b4')
      .render('pages/index', { auth: req.session.auth })
  }
})

// Get list of existing documents
const getList = asyncHandler(async (req, res) => {
  const query = connection.createFetchQuery(
    process.env.CONNECTION_COLLECTION,
    {}
  )
  query.on('ready', () => {
    const docs = query.results
    res
      .set('X-CSE356', '61f9c5ceca96e9505dd3f8b4')
      .send(docs.map((doc) => ({ id: doc.id, data: doc.data })))
  })
})

module.exports = {
  renderHome,
  getList,
}
