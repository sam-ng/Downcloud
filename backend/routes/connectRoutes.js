const express = require('express')
const router = express.Router()

const { openConnection } = require('../controllers/connectController')

router.post('/:id', openConnection)

module.exports = router
