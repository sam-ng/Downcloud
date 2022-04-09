const asyncHandler = require('express-async-handler')
const User = require('../models/userModel')

const addUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body

  // Check all fields exist
  if (!username || !password || !email) {
    res.status(400)
    throw new Error('Please enter all fields')
  }

  // Check email is unique
  const emailExist = await User.findOne({ email })
  const usernameExist = await User.findOne({ username })
  if (emailExist || usernameExist) {
    res.status(400)
    throw new Error('Username or email already exists')
  }

  // Create user
  const user = await User.create({ username, password, email })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body

  // Check all fields exist
  if (!username || !password) {
    res.status(400)
    throw new Error('Please enter all fields')
  }

  // Check if user exists
  const user = await User.findOne({ username })
  if (!user) {
    res.status(400)
    throw new Error('Login error')
  }

  // Check if password matches
  if (password !== user.password) {
    res.status(400)
    throw new Error('Login error')
  }

  // Creates new session
  req.session.auth = true

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

const logoutUser = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err
  })
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

module.exports = {
  addUser,
  loginUser,
  logoutUser,
}
