const { logger } = require('../config/logger')
const asyncHandler = require('express-async-handler')
const esClient = require('../config/elastic')

// Elastic variables
const INDEX = 'downcloud'
const CUSTOM_ANALYZER_NAME = 'custom_analyzer'
const CUSTOM_ANALYZER = {
  type: 'custom',
  tokenizer: 'standard',
  char_filter: ['html_strip'],
  filter: ['lowercase', 'asciifolding', 'stop', 'porter_stem'],
}

// @desc    Get search results
// @route   GET /index/search
// @access  Private
const getSearchResults = asyncHandler(async (req, res) => {
  const searchText = req.query.q
  updatedSearchText = searchText.trim()

  const response = await esClient.search({
    index: INDEX,
    body: {
      query: updatedSearchText,
      result_fields: {
        title: {
          raw: {},
        },
        content: {
          snippet: {
            size: 100,
          },
        },
      },
    },
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json(response)
})

// @desc    Get suggestion
// @route   GET /index/suggest
// @access  Private
const getSuggestion = asyncHandler(async (req, res) => {
  // TODO:
  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({})
})

// @desc    Create index
// @route   POST /index/create
// @access  Private
const createIndex = asyncHandler(async (req, res) => {
  let { index } = req.body
  if (!index) {
    index = INDEX
  }

  const response = esClient.indices.create({
    index,
    settings: {
      analysis: {
        analyzer: {
          custom_analyzer: CUSTOM_ANALYZER,
        },
      },
    },
    mappings: {
      properties: {
        title: { type: 'text', analyzer: CUSTOM_ANALYZER_NAME },
        content: { type: 'text', analyzer: CUSTOM_ANALYZER_NAME },
        // suggest: {
        //   type: 'completion',
        // },
      },
    },
  })

  res.json(`Created: ${response}`)
})

// @desc    Clear index
// @route   POST /index/clear
// @access  Private
const clearIndex = asyncHandler(async (req, res) => {
  let { index } = req.body
  if (!index) {
    index = INDEX
  }

  const response = await client.indices.delete({
    index,
  })

  res.json(`Cleared: ${response}`)
})

// @desc    Add to index
// @route   POST /index/add
// @access  Private
const addToIndex = asyncHandler(async (req, res) => {
  let { index, title, content } = req.body
  if (!index) {
    index = INDEX
  }

  if (!title || !content) {
    throw new Error('Please enter title and content')
  }

  const response = await client.index({
    index,
    body: {
      title,
      content,
    },
  })

  res.json(`Added: ${response}`)
})

// @desc    Get everything index
// @route   POST /index/get
// @access  Private
const getIndex = asyncHandler(async (req, res) => {
  let { index } = req.body
  if (!index) {
    index = INDEX
  }

  const response = await client.search({
    index,
    body: {
      query: {
        match_all: {},
      },
    },
  })

  res.json(`Get all: ${response}`)
})

// @desc    Return tokens from custom_analyzer
// @route   POST /index/analyze
// @access  Private
const analyzeText = asyncHandler(async (req, res) => {
  let { text } = req.body

  if (!text) {
    throw new Error('Please enter some text')
  }

  const response = await client.indices.analyze({
    analyzer: CUSTOM_ANALYZER_NAME,
    text,
  })

  res.json(`Analyzed: ${response}`)
})

module.exports = {
  getSearchResults,
  getSuggestion,
  clearIndex,
  addToIndex,
  createIndex,
  getIndex,
  analyzeText,
}
