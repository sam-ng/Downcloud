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
const { renderHome } = require('./controllers/collectionController')
const port = process.env.SERVER_PORT || 8000

// Dictionary of client tabs
const clients = {}

// Dictionary of client versions
const docVersions = {}

// Dictionary of docids to docs
const docIDToDocs = {}

module.exports = { clients, docVersions, docIDToDocs }

connectDatabase()
const app = express()

// Render pages using ejs
app.set('view engine', 'ejs')

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
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: false }))

// Serve static files
app.use(express.static('static'))
app.use(express.static('node_modules/quill/dist')) // for quill css

// Endpoints
app.use('/users', require('./routes/userRoutes'))
app.use('/collection', protect, require('./routes/collectionRoutes'))
app.use('/doc', protect, require('./routes/docRoutes'))
app.use('/media', protect, require('./routes/mediaRoutes'))
app.use('/index', protect, require('./routes/indexRoutes'))

// Frontend Home + Sign up
app.get('/home', renderHome)
app.get('/signup', (req, res) => {
  res.render('pages/signup')
})
app.get('/', renderHome)

// Error handler
app.use(errorHandler)

app.listen(port, () => {
  logger.info(`Server started on port: ${port}`)
})
