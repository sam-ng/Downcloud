const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')
const DocumentMap = require('../models/documentMapModel')

const fetchDocumentMaps = async (docs) => {
  let docIDNamePairs = {}
  await Promise.all(
    docs.map(async (doc) => {
      const documentMap = await DocumentMap.findOne({ docID: doc.id }).exec()
      docIDNamePairs[documentMap.docID] = documentMap.name
    })
  )
  return docIDNamePairs
}

const renderHome = asyncHandler(async (req, res) => {
  if (req.session.auth) {
    // Render list of documents
    const query = connection.createFetchQuery(
      process.env.CONNECTION_COLLECTION,
      { $sort: { '_m.mtime': -1 }, $limit: 10 } // sort documents by modified time in descending order and limit to 10
    )
    query.on('ready', async () => {
      const docs = query.results
      const documentMaps = await fetchDocumentMaps(docs)
      res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').render('pages/index', {
        auth: req.session.auth,
        docNames: docs.map((doc) => documentMaps[doc.id]),
      })
    })
  } else {
    // Render login/signup page
    res
      .set('X-CSE356', '61f9c5ceca96e9505dd3f8b4')
      .render('pages/index', { auth: req.session.auth })
  }
})

// Get list of existing documents
const getList = asyncHandler(async (req, res) => {
  const query = connection.createFetchQuery(process.env.CONNECTION_COLLECTION, {
    $sort: { '_m.mtime': -1 },
    $limit: 10,
  })
  query.on('ready', async () => {
    const docs = query.results
    const documentMaps = await fetchDocumentMaps(docs)
    res
      .set('X-CSE356', '61f9c5ceca96e9505dd3f8b4')
      .json(docs.map((doc) => ({ id: doc.id, name: documentMaps[doc.id] })))
  })
})

module.exports = {
  renderHome,
  getList,
}
