const express = require('express')
const router = express.Router()

const { createDoc } = require('../controllers/createController')
const { deleteDoc } = require('../controllers/deleteController')
const { getList } = require('../controllers/listController')

router.post('/create', createDoc)
router.post('/delete', deleteDoc)
router.get('/list', getList)

module.exports = router
