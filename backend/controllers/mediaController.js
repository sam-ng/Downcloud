const asyncHandler = require('express-async-handler')
const path = require('path')
const multer = require('multer')

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
  // limits: { fileSize: 1048576 },
}).single('image')

const uploadWrapper = asyncHandler(async (req, res, next) => {
  upload(
    req,
    res,
    asyncHandler(async (err) => {
      if (err) {
        next(new Error('Something went wrong uploading image.'))
      }

      next()
    })
  )
})

const uploadImage = asyncHandler(async (req, res) => {
  const fileName = req.file.filename.split('.')[0]
  const fileExtension = req.file.filename.split('.')[1]
  const imageID = `${fileName}.${fileExtension}`

  res.set('X-CSE356', '61f9c5ceca96e9505dd3f8b4').json({
    imageID,
  })
})

const getImage = asyncHandler(async (req, res) => {
  const { mediaID } = req.params

  res.sendFile(path.join(__dirname, '../../', `/images/${mediaID}`))
})

module.exports = {
  uploadWrapper,
  uploadImage,
  getImage,
}
