const express = require('express')
const router = express.Router()

const {
  getSearchResults,
  getSuggestion,
} = require('../controllers/indexController')

router.get('/search', getSearchResults)
router.get('/suggest', getSuggestion)

module.exports = router
