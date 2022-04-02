const Quill = require('quill')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')

const SERVER_URL = `http://localhost:8000`
const ID = uuidv4()

// Set up event stream to listen to events from server
const evtSource = new EventSource(`${SERVER_URL}/connect/${ID}`)

// Set up quill
const quill = new Quill('#editor', { theme: 'snow' })

// Send changes we made to quill
quill.on('text-change', (delta, oldDelta, source) => {
  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }

  axios.post(`${SERVER_URL}/op/${ID}`, delta)
})

// Update quill when message is received from server event stream
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.content) {
    // Set initial doc contents
    quill.setContents(data.content)
  } else {
    // Update doc contents
    quill.updateContents(data)
  }
}
