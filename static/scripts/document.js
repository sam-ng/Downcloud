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

// Image
// const imgBlot = new QuillImage(Quill, { handler: imageHandler })

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
  },
  // modules: {
  //   keyboard: {
  //     bindings: {
  //       ...QuillImageBindings,
  //     },
  //   },
  // },
})

// Image handler
function imageHandler() {
  let range = this.quill.getSelection()
  let value = prompt('paste img url')
  if (value) {
    this.quill.insertEmbed(range.index, 'image', value, Quill.sources.USER)
  }
}

// /**
//  * Do something to our dropped or pasted image
//  * @param.quill - the quill instance
//  * @param.guid - a unique guid for this image, if required
//  * @param.imageDataUrl - image's base64 url
//  * @param.type - image's mime type
//  */
// // Image handler
// async function handler(quill, guid, dataUrl, type) {
//   // give a default mime type if the type was null
//   if (!type) type = 'image/png'

//   // Convert base64 to blob
//   const blob = await fetch(b64Image).then((res) => res.blob())

//   // Generate a filename
//   const filename = `${guid}.${type.match(/^image\/(\w+)$/i)[1]}`

//   // Generate a form data
//   const formData = new FormData()
//   formData.append('filename', filename)
//   formData.append('file', blob)

//   // Upload your file here – promise should resolve with the public URL
//   return new Promise((resolve) => {
//     setTimeout(
//       () => resolve('https://media2.giphy.com/media/RQgzLsPYlzrBC/source.gif'),
//       3000
//     )
//   })
// }

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
