const asyncHandler = require('express-async-handler')

const addUser = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').status(500)
  throw new Error('TODO: implement')
})

const loginUser = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').status(500)
  throw new Error('TODO: implement')
})

const logoutUser = asyncHandler(async (req, res) => {
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').status(500)
  throw new Error('TODO: implement')
})

module.exports = {
  addUser,
  loginUser,
  logoutUser,
}
