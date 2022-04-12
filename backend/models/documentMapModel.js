const mongoose = require('mongoose')

const documentMapSchema = mongoose.Schema({
  docID: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
})

module.exports = mongoose.model('DocumentMap', documentMapSchema)
