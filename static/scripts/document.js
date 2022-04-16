const Quill = require('quill')
const QuillCursors = require('quill-cursors')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')
const tinycolor = require('tinycolor2')

const ID = uuidv4()
const path = window.location.pathname
const docID = path.split('/').slice(-1)[0]

// Set up event stream to listen to events from server
const evtSource = new EventSource(`/doc/connect/${docID}/${ID}`)

// Set up quill
Quill.register('modules/cursors', QuillCursors)
let colors = {}
const toolbar = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['link', 'blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
  ['image'],
]
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
const cursors = quill.getModule('cursors')
const Delta = Quill.import('delta')

// Quill image handler
function imageHandler() {
  let range = this.quill.getSelection()
  let value = prompt('paste img url')
  if (value) {
    this.quill.insertEmbed(range.index, 'image', value, Quill.sources.USER)
  }
}

// Variables for submitting ops to server
let version = -1
let opQueue = []

// Post an op to server
const postOp = () => {
  axios
    .post(`/doc/op/${docID}/${ID}`, {
      version,
      op: opQueue[0],
    })
    .then((res) => {
      if (res.data.status == 'ok') {
      } else if (res.data.status == 'retry') {
        postOp()
      }
    })
}

// Send changes we made to quill
quill.on('text-change', (delta, oldDelta, source) => {
  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }

  opQueue.push(delta.ops)

  if (opQueue.length === 1) {
    postOp()
  }
})

// Send cursor changes we made on quill
quill.on('selection-change', (range, oldRange, source) => {
  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }

  // If range is null, indicates focus lost => appears to everyone else that cursor is where it was before
  if (!range) {
    return
  }

  axios.post(`/doc/presence/${docID}/${ID}`, range).then((res) => {})
})

// Update quill when message is received from server event stream
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.presence) {
    // Presence data
    const { id, cursor } = data.presence
    colors[id] = colors[id] || tinycolor.random().toHexString()
    if (cursor) {
      cursors.createCursor(id, cursor.name, colors[id])
      cursors.moveCursor(id, cursor)
    } else {
      cursors.removeCursor(id)
    }
  } else if (data.content) {
    // Get inital document
    // console.log(data)
    quill.setContents(data.content)
    version = data.version
  } else if (data.ack) {
    // Acknowledged our change
    version += 1
    opQueue.shift() // remove from queue after we have acknowledged

    if (opQueue.length > 0) {
      postOp()
    }
  } else {
    // Update our doc contents based on ops from other clients
    version += 1

    // Apply transformations
    let incomingOp = new Delta(data)
    let updatedIncomingOp = new Delta(data)
    opQueue = opQueue.map((queueOp) => {
      queueOp = new Delta(queueOp)

      const newQueueOp = incomingOp.transform(queueOp, true)
      updatedIncomingOp = queueOp.transform(updatedIncomingOp, false)

      return newQueueOp
    })

    quill.updateContents(updatedIncomingOp)
    // quill.updateContents(data)
  }
}
