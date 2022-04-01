const Quill = require('quill')
const { v4: uuidv4 } = require('uuid')

const SERVER_URL = 'http://localhost:8000'
const ID = uuidv4()

fetch(`${SERVER_URL}/connect/${ID}`, { mode: 'cors' }).then((data) => {
  const evtSource = new EventSource(`${SERVER_URL}/connect/${ID}`)

  let quill = new Quill('#editor', { theme: 'snow' })
  console.log('here')

  quill.on('text-change', (delta, oldDelta, source) => {
    // if (source !== user) return
    // fetch(`${SERVER_URL}/op/${ID}`, {
    //   method: 'POST',
    //   mode: 'cors',
    //   body: JSON.stringify(delta),
    // })
  })

  evtSource.onmessage = (event) => {
    console.log(event.data)
    if (event.data.content) quill.setContents(event.data.content)
  }
})
