const asyncHandler = require('express-async-handler')
const path = require('path')
const multer = require('multer')
const { logger } = require('sharedb')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './images')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10000000 },
  fileFilter: (req, file, cb) => {
    const whitelist = ['image/png', 'image/jpeg', 'image/jpg']

    logger.info(`mimetype: ${file.mimetype}`)

    if (!whitelist.includes(file.mimetype)) {
      return cb(new Error('file is not allowed'))
    }

    cb(null, true)
  },
}).single('file')

const uploadWrapper = asyncHandler(async (req, res, next) => {
  logger.info(`entering upload wrapper`)

  upload(
    req,
    res,
    asyncHandler(async (err) => {
      if (err) {
        logger.info(`err.message: ${err.message}`)
        next(new Error('Something went wrong uploading image.'))
        return
      }

      logger.info('nothing wrong with uploading image')
      next()
    })
  )
})

const uploadImage = asyncHandler(async (req, res) => {
  const fileName = req.file.filename.split('.')[0]
  const fileExtension = req.file.filename.split('.')[1]
  const imageID = `${fileName}.${fileExtension}`

  logger.info(`uploadImage: ${imageID}`)

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({
    mediaid: imageID,
  })
})

const getImage = asyncHandler(async (req, res) => {
  const { mediaID } = req.params

  logger.info(`getImage: ${mediaID}`)

  res.sendFile(path.join(__dirname, '../../', `/images/${mediaID}`))
})

module.exports = {
  uploadWrapper,
  uploadImage,
  getImage,
}
