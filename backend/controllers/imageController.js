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
  const imagePath = `/images/${fileName}.${fileExtension}`

  res.json({
    imagePath,
  })
})

module.exports = {
  uploadWrapper,
  uploadImage,
}
