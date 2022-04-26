const { logger } = require('../config/logger')

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode ? res.statusCode : 500

  logger.error(err.stack)

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').status(200).json({
    error: true,
    message: err.message,
    stack: err.stack,
  })
}

module.exports = {
  errorHandler,
}
