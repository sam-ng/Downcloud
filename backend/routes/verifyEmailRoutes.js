const express = require('express')
const router = express.Router()

const {
  getVerify,
  postVerify,
} = require('../controllers/verifyEmailController')

router.get('/', getVerify)
router.post('/', postVerify)

module.exports = router
