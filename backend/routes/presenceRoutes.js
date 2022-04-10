const express = require('express')
const router = express.Router()

const { updatePresence } = require('../controllers/presenceController')

router.post('/:id', updatePresence)

module.exports = router
