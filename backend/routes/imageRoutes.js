const express = require('express')
const router = express.Router()

const { uploadWrapper, uploadImage } = require('../controllers/imageController')

router.post('/', uploadWrapper, uploadImage)

module.exports = router
