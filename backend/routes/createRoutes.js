const express = require('express')
const router = express.Router()

const { createDoc } = require('../controllers/createController')

router.post('/', createDoc)

module.exports = router
