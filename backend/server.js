const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv').config()
const { errorHandler } = require('./middleware/errorMiddleware')
const port = process.env.SERVER_PORT || 8000
const userController = require('./controllers/userController')

// Set up clients dictionary
const clients = {}
module.exports = { clients }

// Express app
const app = express()

// CORS
app.use(cors())

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Serve static files
app.use(express.static('static'))
app.use(express.static('node_modules/quill/dist')) // for quill css

// Account Endpoints
app.use('/adduser', userController.addUser)
app.use('/verify', require('./routes/verifyEmailRoutes'))
app.use('/login', userController.loginUser)
app.use('/logout', userController.logoutUser)

// Doc Routes
app.use('/connect', require('./routes/connectRoutes'))
app.use('/op', require('./routes/opRoutes'))
app.use('/doc', require('./routes/docRoutes'))
app.get('/', (req, res) => {
  res.sendStatus(200)
})

// Error handler
app.use(errorHandler)

app.listen(port, () => {
  console.log(`Server started on port: ${port}`)
})
