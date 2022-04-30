const { logger } = require('../config/logger')
const asyncHandler = require('express-async-handler')
const esClient = require('../config/elastic')

// Elastic variables
const INDEX = 'downcloud'
const CUSTOM_ANALYZER_NAME = 'custom_analyzer'

// @desc    Get search results
// @route   GET /index/search
// @access  Private
const getSearchResults = asyncHandler(async (req, res) => {
  const searchText = req.query.q
  updatedSearchText = searchText.trim()

  const response = await esClient.search({
    index: INDEX,
    body: {
      query: {
        multi_match: {
          query: updatedSearchText,
          type: 'phrase',
          fields: ['title', 'content'],
        },
      },
      highlight: {
        number_of_fragments: 1,
        fragment_size: 400,
        fields: {
          content: {},
        },
      },
    },
  })

  const results = response.hits.hits.map((hit) => {
    return {
      docid: hit._id,
      name: hit._source.title,
      snippet: hit.highlight.content[0],
    }
  })

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json(results)
})

// @desc    Get suggestion
// @route   GET /index/suggest
// @access  Private
const getSuggestion = asyncHandler(async (req, res) => {
  const searchText = req.query.q
  updatedSearchText = searchText.trim()

  const response = await esClient.search({
    index: INDEX,
    body: {
      suggest: {
        autocomplete_suggest: {
          prefix: updatedSearchText,
          // regex: searchText + '(.+)',
          completion: {
            field: 'suggest',
            size: 3,
            skip_duplicates: true,
          },
        },
      },
    },
  })

  const results = response.suggest.autocomplete_suggest[0].options
    .map((suggestion) => {
      if (suggestion.text != updatedSearchText) {
        return suggestion.text
      }
    })
    .filter((word) => word)

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json(results)
})

// @desc    Create index
// @route   POST /index/create
// @access  Private
const createIndex = asyncHandler(async (req, res) => {
  let { index } = req.body
  if (!index) {
    index = INDEX
  }

  const response = await esClient.indices.create({
    index,
    settings: {
      analysis: {
        // filter: {
        //   autocomplete_filter: {
        //     type: 'edge_ngram',
        //     min_gram: 1,
        //     max_gram: 20,
        //   },
        // },
        analyzer: {
          custom_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            char_filter: ['html_strip'],
            filter: ['lowercase', 'asciifolding', 'stop', 'porter_stem'],
          },
          // autocomplete_analyzer: {
          //   type: 'custom',
          //   tokenizer: 'standard',
          //   char_filter: ['html_strip'],
          //   filter: [
          //     'lowercase',
          //     'asciifolding',
          //     'stop',
          //     'porter_stem',
          //     'autocomplete_filter',
          //   ],
          // },
        },
      },
    },
    mappings: {
      // _source: {
      //   enabled: false,
      // },
      properties: {
        title: {
          type: 'text',
          analyzer: CUSTOM_ANALYZER_NAME,
          // search_analyzer: CUSTOM_ANALYZER_NAME,
          // analyzer: 'autocomplete_analyzer',
        },
        content: {
          type: 'text',
          analyzer: CUSTOM_ANALYZER_NAME,
          // search_analyzer: CUSTOM_ANALYZER_NAME,
          // analyzer: 'autocomplete_analyzer',
        },
        id: {
          type: 'keyword',
        },
        suggest: {
          type: 'completion',
          analyzer: CUSTOM_ANALYZER_NAME,
          // fields: {
          //   text: {
          //     type: 'text',
          //   },
          // },
        },
      },
    },
  })

  res.json(response)
})

// @desc    Clear index
// @route   POST /index/clear
// @access  Private
const clearIndex = asyncHandler(async (req, res) => {
  let { index } = req.body
  if (!index) {
    index = INDEX
  }

  const response = await esClient.indices.delete({
    index,
  })

  res.json(response)
})

// @desc    Add to index
// @route   POST /index/add
// @access  Private
const addToIndex = asyncHandler(async (req, res) => {
  let { index, title, content, id } = req.body
  if (!index) {
    index = INDEX
  }

  if (!title || !content) {
    throw new Error('Please enter title and content')
  }

  const response = await addToIndexHelper(index, title, content, id)

  res.json(response)
})

const addToIndexHelper = async (index, title, content, id) => {
  const titleSuggestions = getSuggestorContent(title)
  const contentSuggestions = getSuggestorContent(content)
  const suggestions = titleSuggestions.concat(contentSuggestions)

  const response = await esClient.index({
    index,
    id,
    body: {
      title,
      content,
      // TODO: improve/optimize
      suggest: suggestions,
    },
  })

  return response
}

// @desc    Get everything index
// @route   POST /index/get
// @access  Private
const getIndex = asyncHandler(async (req, res) => {
  let { index } = req.body
  if (!index) {
    index = INDEX
  }

  const response = await esClient.search({
    index,
    body: {
      query: {
        match_all: {},
      },
    },
  })

  res.json(response)
})

// @desc    Return tokens from custom_analyzer
// @route   POST /index/analyze
// @access  Private
const analyzeText = asyncHandler(async (req, res) => {
  let { index, text } = req.body
  if (!index) {
    index = INDEX
  }

  if (!text) {
    throw new Error('Please enter some text')
  }

  const response = await esClient.indices.analyze({
    index,
    analyzer: CUSTOM_ANALYZER_NAME,
    // analyzer: 'autocomplete_analyzer',
    text,
  })

  res.json(response)
})

// @desc    Get search results from other index
// @route   POST /index/search2
// @access  Private
const getSearchResults2 = asyncHandler(async (req, res) => {
  const { index, text } = req.body
  let searchText = text.trim()

  const response = await esClient.search({
    index: INDEX,
    body: {
      query: {
        multi_match: {
          query: searchText,
          type: 'phrase',
          fields: ['title', 'content'],
        },
      },
      highlight: {
        number_of_fragments: 1,
        fragment_size: 400,
        fields: {
          content: {},
        },
      },
    },
  })

  res.json(response)
})

// @desc    Suggest word
// @route   POST /index/suggest2
// @access  Private
const getSuggestion2 = asyncHandler(async (req, res) => {
  const { index, text } = req.body
  let searchText = text.trim()

  // const response = await esClient.search({
  //   index,
  //   body: {
  //     size: 3,
  //     query: {
  //       multi_match: {
  //         query: searchText,
  //         fields: [
  //           'title',
  //           'title._2gram',
  //           'title._3gram',
  //           'content',
  //           'content._2gram',
  //           'content._3gram',
  //         ],
  //       },
  //     },
  //   },
  // })

  // TODO: sort by frequency, score

  const response = await esClient.search({
    index,
    body: {
      suggest: {
        autocomplete_suggest: {
          prefix: searchText,
          // regex: searchText + '(.+)',
          completion: {
            field: 'suggest',
            size: 3,
            skip_duplicates: true,
          },
        },
      },
    },
  })

  res.json(response)
})

const updateDocInIndex = asyncHandler(async (req, res) => {
  let { index, text, id } = req.body
  if (!index) {
    index = INDEX
  }

  const response = await esClient.update({
    index,
    id,
    body: {
      doc: {
        content: text,
        suggest: getSuggestorContent(text),
      },
    },
  })

  res.json(response)
})

const getDocInIndex = asyncHandler(async (req, res) => {
  let { index, id } = req.body
  if (!index) {
    index = INDEX
  }

  const response = await esClient.get({
    index,
    id,
  })

  res.json(response)
})

const getSuggestorContent = (text) => {
  let updatedText = text.trim()
  updatedText = updatedText.toLowerCase()

  // split on non-word characters
  let suggestContent = updatedText.split(/\W+/)

  // keep words >= length 5 only:
  suggestContent = suggestContent.filter((word) => word.length >= 5)

  // TODO: stop words
  // TODO: stem words
  // TODO: optimize, reorder operations

  return [...new Set(suggestContent)]
}

module.exports = {
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

  // Helpers
  addToIndexHelper,
}
