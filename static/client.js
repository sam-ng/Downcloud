const Quill = require('quill')
const { v4: uuidv4 } = require('uuid')

const SERVER_URL = 'http://localhost:8000'
const ID = uuidv4()

fetch(`${SERVER_URL}/connect/${ID}`, { mode: 'cors' }).then((data) => {
  console.log('back from fetching')
  const evtSource = new EventSource(`${SERVER_URL}/connect/${ID}`)

  let quill = new Quill('#editor', { theme: 'snow' })

  quill.on('text-change', (delta, oldDelta, source) => {
    // if (source !== user) return
    // fetch(`${SERVER_URL}/op/${ID}`, {
    //   method: 'POST',
    //   mode: 'cors',
    //   body: JSON.stringify(delta),
    // })
  })

  evtSource.onmessage = (event) => {
    const content = JSON.parse(event.data)
    quill.setContents(content)
  }
})
