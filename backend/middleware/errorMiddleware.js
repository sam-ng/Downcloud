const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode ? res.statusCode : 500

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').status(200).json({
    status: 'ERROR',
    // FIXME: comment out message and stack before submission
    message: err.message,
    stack: err.stack,
  })
}

module.exports = {
  errorHandler,
}
