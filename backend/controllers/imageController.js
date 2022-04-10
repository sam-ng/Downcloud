const asyncHandler = require('express-async-handler')
const path = require('path')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './images')
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
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
  console.log(req.file)

  res.json({
    message: 'Successfully uploaded image.',
  })
})

module.exports = {
  uploadWrapper,
  uploadImage,
}
