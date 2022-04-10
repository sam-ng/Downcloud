const Quill = require('quill')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')

const SERVER_URL = `http://localhost:8000`
const ID = uuidv4()

console.log(window.location.search)
// Set up event stream to listen to events from server
const evtSource = new EventSource(`/connect/${ID}`)

// Set up quill
const quill = new Quill('#editor', { theme: 'snow' })

// Send changes we made to quill
quill.on('text-change', (delta, oldDelta, source) => {
  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }
  // console.log('Delta ' + JSON.stringify(delta))
  // console.log('Delta ' + JSON.stringify(delta.ops))

  axios.post(`/op/${ID}`, [delta.ops])
})

// Update quill when message is received from server event stream
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // console.log(data)
  if (data.content) {
    // Set initial doc contents
    quill.setContents(data.content)
  } else {
    // Update doc contents
    data.forEach((oplist) => quill.updateContents(oplist))
  }
}
