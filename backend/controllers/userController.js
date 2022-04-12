const { logger } = require('../config/logger')
const asyncHandler = require('express-async-handler')
const nodemailer = require('nodemailer')
const { v4: uuidv4 } = require('uuid')
const User = require('../models/userModel')

// Transporter
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 25,
  secure: false,
  tls: { rejectUnauthorized: false }
})

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

  // Create verification code
  const verificationCode = uuidv4()

  // Create user
  const user = await User.create({
    username,
    password,
    email,
    verificationCode,
  })

  // Send verification email
  const message = {
    from: process.env.MAIL_SENDER,
    to: email,
    subject: 'Verify Your Email Address',
    text: `Your verification code is: ${verificationCode}. Click here to verify: http://downcloud.cse356.compas.cs.stonybrook.edu/verify?email=${email}&key=${verificationCode}`,
  }
  transporter.sendMail(message, (err, info) => {
    if (err) {
      res.status(400)
      logger.error(err.message)
      // throw new Error('Unable to send verification code')
    } else {
      logger.info('Email sent: ' + info.response)
    }
  })

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

  // Check if user is verified
  if (!user.verified) {
    res.status(400)
    throw new Error('Login error')
  }

  // Creates new session
  req.session.auth = true
  req.session.username = username

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

const logoutUser = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err
  })
  res.clearCookie('connect.sid', {
    path: '/',
  })
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

module.exports = {
  addUser,
  loginUser,
  logoutUser,
}
