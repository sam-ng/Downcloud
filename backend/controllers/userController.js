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
  tls: { rejectUnauthorized: false },
})

const addUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  // Check all fields exist
  if (!name || !password || !email) {
    res.status(400)
    throw new Error('Please enter all fields')
  }

  // Check email is unique
  const emailExist = await User.findOne({ email })
  const nameExist = await User.findOne({ name })
  if (emailExist || nameExist) {
    res.status(400)
    throw new Error('Name or email already exists')
  }

  // Create verification code
  const verificationCode = uuidv4()

  // Create user
  const user = await User.create({
    name,
    password,
    email,
    verificationCode,
  })

  // Send verification email
  const message = {
    from: process.env.MAIL_SENDER,
    to: email,
    subject: 'Verify Your Email Address',
    text: `Your verification code is: ${verificationCode}. Click here to verify: http://downcloud.cse356.compas.cs.stonybrook.edu/users/verify?email=${email}&key=${verificationCode}`,
  }
  transporter.sendMail(message, (err, info) => {
    if (err) {
      res.status(400)
      throw new Error(`Unable to send verification code: ${err.message}`)
    } else {
      logger.info('Email sent: ' + info.response)
    }
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Check all fields exist
  if (!email || !password) {
    res.status(400)
    throw new Error('Please enter all fields')
  }

  // Check if user exists
  const user = await User.findOne({ email })
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
  req.session.name = user.name

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

const verifyUser = asyncHandler(async (req, res) => {
  const { email, key } = req.query

  // Check all fields exist
  if (!email || !key) {
    res.status(400)
    throw new Error('Missing verification information')
  }

  // Check user exists with email
  const user = await User.findOne({ email })
  if (!user) {
    res.status(400)
    throw new Error('Unable to verify')
  }

  // Invalid code
  if (key != user.verificationCode /*&& key != process.env.BACKDOOR_KEY*/) {
    res.status(400)
    throw new Error('Unable to verify')
  }

  // Verified code
  await User.updateOne({ email }, { verified: true })
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

module.exports = {
  addUser,
  loginUser,
  logoutUser,
  verifyUser,
}
