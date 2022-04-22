const { logger } = require('../config/logger')
const asyncHandler = require('express-async-handler')

// @desc    Get search results
// @route   GET /index/search
// @access  Private
const getSearchResults = asyncHandler(async (req, res) => {
  // TODO:
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({})
})

// @desc    Get suggestion
// @route   GET /index/suggest
// @access  Private
const getSearchResults = asyncHandler(async (req, res) => {
  // TODO:
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({})
})

module.exports = {
  getSearchResults,
  getSuggestion,
}
