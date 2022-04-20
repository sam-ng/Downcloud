const express = require('express')
const router = express.Router()

const {
  uploadWrapper,
  uploadImage,
  getImage,
} = require('../controllers/mediaController')

router.post('/upload', uploadWrapper, uploadImage)
router.get('/access/:mediaid', getImage)

// Frontend page to upload
router.get('/upload', (req, res) => {
  res.render('pages/upload')
})

module.exports = router
