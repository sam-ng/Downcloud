const Quill = require('quill')
const QuillCursors = require('quill-cursors')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')

Quill.register('modules/cursors', QuillCursors)

const ID = uuidv4()

const path = window.location.pathname
const docID = path.split('/').slice(-1)[0]
let version = -1

// Set up event stream to listen to events from server
const evtSource = new EventSource(`/doc/connect/${docID}/${ID}`)

// Toolbar options
const toolbar = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['link', 'blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
  ['image'],
]

// Set up quill
const quill = new Quill('#editor', {
  theme: 'snow',
  modules: {
    toolbar: {
      container: toolbar,
      handlers: {
        image: imageHandler,
      },
    },
    cursors: true,
  },
})

// Image handler
function imageHandler() {
  let range = this.quill.getSelection()
  let value = prompt('paste img url')
  if (value) {
    this.quill.insertEmbed(range.index, 'image', value, Quill.sources.USER)
  }
}

// Send changes we made to quill
quill.on('text-change', (delta, oldDelta, source) => {
  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }
  // console.log('Delta ' + JSON.stringify(delta))
  // console.log('Delta ' + JSON.stringify(delta.ops))

  // disable text-change in quill
  // get version number
  // await until axios post to op bas been submitted
  // enable editor

  // queue of text-changes

  axios.post(`/doc/op/${docID}/${ID}`, { version, op: delta.ops })
})

// Send cursor changes we made on quill
quill.on('selection-change', (range, oldRange, source) => {
  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }

  // If range is null, indicates focus lost => appears to everyone else that cursor is where it was before
  if (!range) return

  axios.post(`/doc/presence/${docID}/${ID}`, range)
})

// Update quill when message is received from server event stream
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log(data)
  if (data.cursor) {
    const cursors = quill.getModule('cursors')
    const { id, cursor } = data
    cursors.createCursor(id, cursor.name, '#000')
    cursors.moveCursor(id, cursor)
  } else if (data.ack) {
    // Acknowledged our change
    version += 1
  } else if (data.content) {
    // Get inital document
    quill.setContents(data.content)
    version = data.version
  } else {
    // Update doc contents from other clients
    // data.forEach((oplist) => quill.updateContents(oplist))
    console.log('update')
    quill.updateContents(data.op)
    version += 1
  }
}
