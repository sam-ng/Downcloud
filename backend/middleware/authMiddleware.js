const asyncHandler = require('express-async-handler')

const protect = asyncHandler(async (req, res, next) => {
  if (req.session.auth || process.env.SERVER_TYPE == 'doc') {
    next()
  } else {
    res.status(401)
    throw new Error('Not authorized')
  }
})

module.exports = { protect }
