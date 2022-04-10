const express = require('express')
const router = express.Router()

const { createDoc } = require('../controllers/createController')

router.get('/', createDoc)

module.exports = router
