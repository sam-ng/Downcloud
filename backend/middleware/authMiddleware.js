const asyncHandler = require('express-async-handler')

const protect = asyncHandler(async (req, res, next) => {
  if (req.session.auth) {
    next()
  }

  res.status(401)
  throw new Error('Not authorized')
})

module.exports = { protect }
