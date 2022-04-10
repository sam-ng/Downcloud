const mongoose = require('mongoose')
const { logger } = require('./logger')

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    logger.info('Connected to MongoDB')
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

module.exports = connectDatabase
