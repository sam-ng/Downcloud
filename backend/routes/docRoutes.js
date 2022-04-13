const express = require('express')
const router = express.Router()

const {
  getDocUI,
  openConnection,
  updateDocument,
  updatePresence,
} = require('../controllers/docController')

router.get('/edit/:docid', getDocUI)
router.get('/connect/:docid/:uid', openConnection)
router.post('/op/:docid/:uid', updateDocument)
router.post('/presence/:docid/:uid', updatePresence)

module.exports = router
