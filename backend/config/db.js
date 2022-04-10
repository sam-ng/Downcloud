const mongoose = require('mongoose')

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

module.exports = connectDatabase
