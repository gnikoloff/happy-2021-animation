const path = require('path')
const express = require('express')
const app = express()

const PORT = process.env.PORT || 8080

app.use(express.static(path.join(__dirname, '..', 'dist')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'))
})

if (process.env.NODE_ENV === 'development') {
  app.listen(PORT, () => console.log(`App is listening on ${PORT}`))
}
module.exports = app
