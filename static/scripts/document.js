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
let waitingForAck = false // flag to identify waiting for server's ack
let opQueue = []

// Post an op to server
const postOp = () => {
  // console.log(`attempting to post op from client ${ID} to doc ${docID}`)
  // console.log(`op to send to server: `, op)
  // console.log(`version to send to server: ${version}`)

  axios
    .post(`/doc/op/${docID}/${ID}`, {
      version,
      op: opQueue[0],
    })
    .then((res) => {
      if (res.data.status === 'ok') {
        // console.log('post op succeeded with status ok')
      } else if (res.data.status === 'retry') {
        postOp()
        // console.log('post op failed with status retry')
      }
    })
}

// Attempt to send a queued op to the server
const sendAnOpFromQueue = async () => {
  // console.log('attempting to send an op from queue')
  // console.log(`waitingForAck: ${waitingForAck}`)
  // console.log(`opQueue.length: ${opQueue.length}`)
  if (!waitingForAck && opQueue.length > 0) {
    // console.log('conditions met, proceeding')
    // console.log(`waitingForAck set to true`)

    waitingForAck = true
    postOp()

    // Submit op and wait for response
    // let response = await axios.post(`/doc/op/${docID}/${ID}`, {
    //   version,
    //   op: opQueue[0],
    // })

    // console.log(`response.data.status: ${response.data.status}`)

    // Retry if server tells us to retry
    // while (response.data.status == 'retry') {
    //   response = await axios.post(`/doc/op/${docID}/${ID}`, {
    //     version,
    //     op: opQueue[0],
    //   })
    // }
  } else {
    // console.log('failed to send an op from queue, conditions not met')
  }
}

// Send changes we made to quill
quill.on('text-change', (delta, oldDelta, source) => {
  // console.log(`quill text-change event`)
  // console.log(`delta: `, delta)
  // console.log(`oldDelta: `, oldDelta)
  // console.log(`source: `, source)

  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    // console.log('source is user, changes not pushed to queue')
    return
  }

  opQueue.push(delta.ops)
  // console.log(`op pushed to queue`)
  // console.log(`op pushed: `, delta.ops)
  // console.log('opQueue: ', opQueue)

  sendAnOpFromQueue()
})

// Send cursor changes we made on quill
quill.on('selection-change', (range, oldRange, source) => {
  // console.log(`quill selection-change event`)
  // console.log(`range: `, range)
  // console.log(`oldRange: `, oldRange)
  // console.log(`source: `, source)

  // Don't send changes to shareDB if we didn't make the change
  if (source !== 'user') {
    // console.log('source is user, selection change not sent to server')
    return
  }

  // If range is null, indicates focus lost => appears to everyone else that cursor is where it was before
  if (!range) {
    // console.log(`range is null, indicates focus lost`)
    return
  }

  // console.log(`posting presence from client ${ID} to doc ${docID}`)
  axios.post(`/doc/presence/${docID}/${ID}`, range).then((res) => {
    // console.log(`presence update callback with res.status: `, res.status)
  })
})

// Update quill when message is received from server event stream
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // console.log(`received message from event source: `, data)
  if (data.presence) {
    // Presence data
    // console.log(`presence: `, data)
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
    // console.log('initial doc: ', data)
    quill.setContents(data.content)
    version = data.version
  } else if (data.ack) {
    // Acknowledged our change
    // console.log('acked op: ', data)
    version += 1
    waitingForAck = false
    opQueue.shift() // remove from queue after we have acknowledged

    sendAnOpFromQueue()
  } else {
    // Update our doc contents based on ops from other clients
    // console.log('op from other clients: ', data)
    version += 1

    // Apply transformations
    let incomingOp = new Delta(data)
    let updatedIncomingOp = new Delta(data)
    // console.log(`opQueue before tranforms: `, opQueue)
    // console.log(`incomingOp before tranforms: `, incomingOp)
    opQueue = opQueue.map((queueOp) => {
      queueOp = new Delta(queueOp)

      const newQueueOp = incomingOp.transform(queueOp, true)
      updatedIncomingOp = queueOp.transform(updatedIncomingOp, false)

      return newQueueOp
    })
    // console.log(`opQueue after tranforms: `, opQueue)
    // console.log(`incomingOp after tranforms: `, updatedIncomingOp)

    quill.updateContents(updatedIncomingOp)
  }
}
