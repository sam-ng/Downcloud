const express = require('express')
const port = 8000

const app = express()

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Routes
app.use('/connect', require('./routes/connectRoutes'))
app.use('/op', require('./routes/opRoutes'))
app.use('/doc', require('./routes/docRoutes'))

// Error handler
// app.use(errorHandler)

app.listen(port, () => {
  console.log(`Server started on port: ${port}`)
})
