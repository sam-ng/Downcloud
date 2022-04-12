const express = require('express')
const router = express.Router()

const {
  addUser,
  loginUser,
  logoutUser,
  verifyUser,
} = require('../controllers/userController')

router.post('/signup', addUser)
router.post('/login', loginUser)
router.post('/logout', logoutUser)
router.get('/verify', verifyUser)

module.exports = router
