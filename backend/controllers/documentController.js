const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')

const getDocument = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').render('pages/document')
})

module.exports = {
  getDocument,
}
