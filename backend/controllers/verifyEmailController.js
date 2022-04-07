const asyncHandler = require('express-async-handler')

const getVerify = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').status(500)
  throw new Error('TODO: implement')
})

const postVerify = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').status(500)
  throw new Error('TODO: implement')
})

module.exports = {
  getVerify,
  postVerify,
}
