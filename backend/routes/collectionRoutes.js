const express = require('express')
const router = express.Router()

const {
  createDoc,
  deleteDoc,
  getList,
} = require('../controllers/collectionController')

router.post('/create', createDoc)
router.post('/delete', deleteDoc)
router.get('/list', getList)

module.exports = router
