const express = require('express')
const session = require('express-session')
const MongoDBSession = require('connect-mongodb-session')(session)
const cors = require('cors')
const dotenv = require('dotenv').config()
const path = require('path')
const connection = require('./config/connection')
const connectDatabase = require('./config/db')
const { logger } = require('./config/logger')
const { errorHandler } = require('./middleware/errorMiddleware')
const { protect } = require('./middleware/authMiddleware')
const userController = require('./controllers/userController')
const listController = require('./controllers/listController')
const port = process.env.SERVER_PORT || 8000

// Dictionary of client tabs
const clients = {}
module.exports = { clients }

connectDatabase()
const app = express()

// TODO: switch to React.js
app.set('view engine', 'ejs')

/*/////////////
 MIDDLEWARE
/////////////*/

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoDBSession({
      uri: process.env.MONGO_URI,
      collection: 'sessions',
    }),
  })
)

// CORS
app.use(cors())

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Serve static files
app.use(express.static('static'))
app.use(express.static('node_modules/quill/dist')) // for quill css

/*/////////////
 ENDPOINTS
/////////////*/

// Account Endpoints
app.use('/users', require('./routes/userRoutes'))

// Document Create/Edit/Access Endpoints
app.use('/create', protect, require('./routes/createRoutes')) // SUBJECT TO CHANGE: Logged in users can create new documents
app.use('/connect', protect, require('./routes/connectRoutes'))
app.use('/op', protect, require('./routes/opRoutes'))
app.use('/presence', protect, require('./routes/presenceRoutes'))
app.use('/document', protect, require('./routes/documentRoutes')) // HEAVILY SUBJECT TO CHANGE: Logged in users can connect new editing sessions to existing documents
app.use('/upload', protect, require('./routes/imageRoutes')) // SUBJECT TO CHANGE: Logged in users can upload image files;;;

// Document Info Endpoints
app.use('/list', protect, require('./routes/listRoutes')) // SUBJECT TO CHANGE: Logged in users can see a list of existing documents
app.use('/doc', protect, require('./routes/docRoutes'))

// Frontend Auth
app.get('/signup', (req, res) => {
  res.render('pages/signup')
})

// Frontend Images
app.use('/images', express.static('images'))
app.get('/upload-image', (req, res) => {
  res.render('pages/upload')
})

// Frontend Home
app.get('/', listController.renderHome)

// Error handler
app.use(errorHandler)

app.listen(port, () => {
  logger.info(`Server started on port: ${port}`)
})
