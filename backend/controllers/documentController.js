const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')

const getDocument = asyncHandler(async (req, res) => {
  if (req.session.auth) res.render('pages/document')
})

module.exports = {
  getDocument,
}
