const express = require('express')
const router = express.Router()

const { openConnection } = require('../controllers/connectController')

router.get('/:id', openConnection)

module.exports = router
