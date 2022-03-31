const express = require('express')
const router = express.Router()

const { updateDocument } = require('../controllers/opController')

router.post('/:id', updateDocument)

module.exports = router
