const express = require('express')
const router = express.Router()

const { getDocument } = require('../controllers/documentController')

router.get('/:id', getDocument)

module.exports = router
