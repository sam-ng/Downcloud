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
  getSearchResults2,
  getSuggestion2,
  updateDocInIndex,
  getDocInIndex,
} = require('../controllers/indexController')

router.get('/search', getSearchResults)
router.get('/suggest', getSuggestion)
router.post('/create', createIndex)
router.post('/clear', clearIndex)
router.post('/add', addToIndex)
router.post('/get', getIndex)
router.post('/analyze', analyzeText)
router.post('/search2', getSearchResults2)
router.post('/suggest2', getSuggestion2)
router.post('/update', updateDocInIndex)
router.post('/getdocinindex', getDocInIndex)

module.exports = router
