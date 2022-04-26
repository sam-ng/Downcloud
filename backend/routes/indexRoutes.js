const express = require('express')
const router = express.Router()

const {
  getSearchResults,
  getSuggestion,
  createIndex,
  clearIndex,
  addToIndex,
  getIndex,
  analyzeText,
} = require('../controllers/indexController')

router.get('/search', getSearchResults)
router.get('/suggest', getSuggestion)
router.post('/create', createIndex)
router.post('/clear', clearIndex)
router.post('/add', addToIndex)
router.get('/get', getIndex)
router.post('/analyze', analyzeText)

module.exports = router
