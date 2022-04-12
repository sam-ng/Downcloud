const express = require('express')
const router = express.Router()

const {
  getDocUI,
  openConnection,
  updateDocument,
} = require('../controllers/docController')

router.get('/edit/:docid', getDocUI)
router.get('/connect/:docid/:uid', openConnection)
router.post('/:docid/:uid', updateDocument)

module.exports = router
