const express = require('express')
const router = express.Router()

const { getDocument } = require('../controllers/docController')

router.get('/:id', getDocument)

module.exports = router
