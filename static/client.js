const Quill = require('quill')
const { v4: uuidv4 } = require('uuid')

const SERVER_URL = 'http://localhost:8000'
const ID = uuidv4()

const evtSource = new EventSource(`${SERVER_URL}/connect/${ID}`)

let quill = new Quill('#editor', { theme: 'snow' })

quill.on('text-change', (delta, oldDelta, source) => {
  if (source !== 'user') return
  fetch(`${SERVER_URL}/op/${ID}`, {
    method: 'POST',
    body: JSON.stringify(delta),
    headers: {
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
})

evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.content) quill.setContents(data.content)
  else quill.updateContents(data)
}
