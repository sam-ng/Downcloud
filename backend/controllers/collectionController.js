const asyncHandler = require('express-async-handler')
const connection = require('../config/connection')
const DocumentMap = require('../models/documentMapModel')
const { v4: uuidv4 } = require('uuid')
const { logger } = require('../config/logger')

// Fetches document mappings for queried documents
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

// Creates a document
const createDoc = asyncHandler(async (req, res) => {
  logger.info('creating a new doc')
  if (!req.body) {
    logger.error('[createController]: name was not specified')
  }
  const docID = uuidv4()
  const doc = connection.get(process.env.CONNECTION_COLLECTION, docID)
  doc.fetch((err) => {
    if (err) {
      throw err
    }

    if (doc.type === null) {
      doc.create([], 'rich-text')
      DocumentMap.create({ docID, name: req.body.name })
      res
        .set('X-CSE356', '61f9c5ceca96e9505dd3f8b4')
        .status(200)
        .json({ docid: docID })
    } else {
      // FIXME:
      logger.error(
        '[createController]: doc id already exists (should not happen)'
      )
      res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
    }
  })
})

// Deletes a document
const deleteDoc = asyncHandler(async (req, res, next) => {
  if (!req.body) {
    logger.error('[deleteController]: doc ID was not specified')
  }

  const docID = req.body.docid
  const doc = connection.get(process.env.CONNECTION_COLLECTION, docID)
  doc.fetch((err) => {
    if (err) {
      throw err
    }

    if (doc.type !== null) {
      doc.del()
      doc.destroy()
      DocumentMap.deleteOne({ docID })
    } else {
      next(new Error('docid does not exist'))
    }

    res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').sendStatus(200)
  })
})

// Lists top 10 most recently modified documents
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
        docIDNameList: docs.map((doc) => ({
          docID: doc.id,
          name: documentMaps[doc.id],
        })),
      })
    })
  } else {
    // Render login/signup page
    res
      .set('X-CSE356', '61f9c5ceca96e9505dd3f8b4')
      .render('pages/index', { auth: req.session.auth })
  }
})

module.exports = { createDoc, deleteDoc, getList, renderHome }
