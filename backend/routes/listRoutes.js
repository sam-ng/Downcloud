const express = require('express')
const router = express.Router()

const { getList } = require('../controllers/listController')

router.get('/', getList)

module.exports = router
