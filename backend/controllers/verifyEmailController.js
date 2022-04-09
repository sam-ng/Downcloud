const asyncHandler = require('express-async-handler')
const User = require('../models/userModel')

const getVerify = asyncHandler(async (req, res) => {
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
  // await user.updateOne({ email, $set: { verified: true } })
  await User.updateOne({ email }, { verified: true })
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
})

const postVerify = asyncHandler(async (req, res) => {
  const { email, key } = req.body

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
  getVerify,
  postVerify,
}
