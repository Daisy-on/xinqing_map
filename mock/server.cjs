const jsonServer = require('json-server')

const server = jsonServer.create()
const router = jsonServer.router('mock/db.json')
const middlewares = jsonServer.defaults()
const port = 3001

server.use(middlewares)

server.get('/location/list', (req, res) => {
  const locations = router.db.get('locations').value() || []
  res.jsonp({
    code: 200,
    message: 'success',
    data: locations,
  })
})

server.use(router)

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock] server is running at http://localhost:${port}`)
})
