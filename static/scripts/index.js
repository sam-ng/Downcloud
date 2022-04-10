const axios = require('axios')

const createBtn = document.getElementById('create-btn')
createBtn.addEventListener('click', () => {
  axios.get('/create')
})
