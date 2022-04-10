const Quill = require('quill')
const QuillCursors = require('quill-cursors')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')

Quill.register('modules/cursors', QuillCursors)

const ID = uuidv4()

const path = window.location.pathname
const docID = path.split('/').slice(-1)[0]

// Set up event stream to listen to events from server
const evtSource = new EventSource(`/connect/${ID}/${docID}`)

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

// Send cursor changes we made on quill
quill.on('selection-change', (range, oldRange, source) => {
  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }

  // If range is null, indicates focus lost => appears to everyone else that cursor is where it was before
  if (!range) return

  axios.post(`/presence/${ID}`, range)
})

// Update quill when message is received from server event stream
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // console.log(data)
  if (data.presence) {
    const cursors = quill.getModule('cursors')
    const { id, name, color, range } = data.presence
    cursors.createCursor(id, name, color)
    cursors.moveCursor(id, range)
  } else if (data.content) {
    // Set initial doc contents
    quill.setContents(data.content)
  } else {
    // Update doc contents
    data.forEach((oplist) => quill.updateContents(oplist))
  }
}
