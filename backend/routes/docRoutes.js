const express = require('express')
const router = express.Router()

const { getDoc } = require('../controllers/docController')

router.get('/:id', getDoc)

module.exports = router
