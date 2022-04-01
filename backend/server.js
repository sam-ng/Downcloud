const express = require('express')
const port = 8000

const app = express()

const clients = {}
module.exports = { clients }

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Serve static files
app.use(express.static('static'))
app.use(express.static('node_modules/quill/dist')) // for quill css

// Routes
app.use('/connect', require('./routes/connectRoutes'))
app.use('/op', require('./routes/opRoutes'))
app.use('/doc', require('./routes/docRoutes'))
app.use('/', (req, res) => {
  res.send(200)
})

// Error handler
// app.use(errorHandler)

app.listen(port, () => {
  console.log(`Server started on port: ${port}`)
})
