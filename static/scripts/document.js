const Quill = require('quill')
const QuillCursors = require('quill-cursors')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')
const tinycolor = require('tinycolor2')

Quill.register('modules/cursors', QuillCursors)

const ID = uuidv4()

const path = window.location.pathname
const docID = path.split('/').slice(-1)[0]
let version = -1
let waitingForAck = false // flag to identify waiting for server's ack
let opQueue = []

// Cursor colors
let colors = {}

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
const cursors = quill.getModule('cursors')
const Delta = Quill.import('delta')

// Image handler
function imageHandler() {
  let range = this.quill.getSelection()
  let value = prompt('paste img url')
  if (value) {
    this.quill.insertEmbed(range.index, 'image', value, Quill.sources.USER)
  }
}

// Helper to send op request
const sendOpQueue = async () => {
  // console.log('attempting to send opqueue')
  if (!waitingForAck && opQueue.length > 0) {
    // console.log('submitting: ', JSON.stringify({ version, op: opQueue[0] }))
    waitingForAck = true

    // Submit op and wait for response
    let response = await axios.post(`/doc/op/${docID}/${ID}`, {
      version,
      op: opQueue[0],
    })

    // console.log(`response.data.status: ${response.data.status}`)

    // Retry if server tells us to retry
    while (response.data.status == 'retry') {
      response = await axios.post(`/doc/op/${docID}/${ID}`, {
        version,
        op: opQueue[0],
      })
    }
  }
  // console.log('exit sending opqueue')
}

// Send changes we made to quill
quill.on('text-change', (delta, oldDelta, source) => {
  // FIXME: delete
  // console.log('delta test')
  // const a = new Delta().insert('a')
  // const b = new Delta().insert('b').retain(5).insert('c')
  // const aTrue = a.transform(b, true) // new Delta().retain(1).insert('b').retain(5).insert('c');
  // const aFalse = a.transform(b, false) // new Delta().insert('b').retain(6).insert('c');
  // console.log(aTrue)
  // console.log(aFalse)

  // console.log('opqueue: ', opQueue)

  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    return
  }
  // console.log('Delta ' + JSON.stringify(delta))
  // console.log('Delta ' + JSON.stringify(delta.ops))

  // Store op in queue
  opQueue.push(delta.ops)
  sendOpQueue()
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
  // console.log('data from evtSource: ', data)
  if (data.presence) {
    const { id, cursor } = data.presence
    colors[id] = colors[id] || tinycolor.random().toHexString()
    if (cursor) {
      cursors.createCursor(id, cursor.name, colors[id])
      cursors.moveCursor(id, cursor)
    } else {
      cursors.removeCursor(id)
    }
  } else if (data.ack) {
    // Acknowledged our change
    // console.log('acked: ', data)
    version += 1
    waitingForAck = false
    opQueue.shift() // remove from queue after we have acknowledged

    sendOpQueue()
  } else if (data.content) {
    // Get inital document
    // console.log('initial doc: ', data)
    quill.setContents(data.content)
    version = data.version
  } else {
    // Update doc contents from other clients
    // data.forEach((oplist) => quill.updateContents(oplist))
    // console.log('update doc from other clients: ', data)
    version += 1

    let incomingOp = new Delta(data)

    let updatedIncomingOp = new Delta(data)
    // Apply transformations
    opQueue = opQueue.map((queueOp) => {
      queueOp = new Delta(queueOp)

      const newQueueOp = incomingOp.transform(queueOp, true)
      updatedIncomingOp = queueOp.transform(updatedIncomingOp, false)

      return newQueueOp
    })

    quill.updateContents(updatedIncomingOp)
  }
}
