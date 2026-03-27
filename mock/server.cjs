const jsonServer = require('json-server')

const server = jsonServer.create()
const router = jsonServer.router('mock/db.json')
const middlewares = jsonServer.defaults()
const port = 3001

server.use(middlewares)

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const parseTime = (text) => {
  return new Date(String(text).replace(/-/g, '/')).getTime()
}

server.get('/location/list', (req, res) => {
  const locations = router.db.get('locations').value() || []
  res.jsonp({
    code: 200,
    message: 'success',
    data: locations,
  })
})

server.get('/post/list', (req, res) => {
  const locationId = toInt(req.query.locationId, Number.NaN)
  if (Number.isNaN(locationId)) {
    res.status(400).jsonp({
      code: 400,
      message: 'locationId is required',
      data: null,
    })
    return
  }

  const emotionTagId = toInt(req.query.emotionTagId, Number.NaN)
  const pageNum = Math.max(1, toInt(req.query.pageNum, 1))
  const pageSize = Math.max(1, toInt(req.query.pageSize, 10))

  let posts =
    router.db
      .get('posts')
      .filter((item) => item.locationId === locationId)
      .value() || []

  if (!Number.isNaN(emotionTagId)) {
    posts = posts.filter((item) => item.emotionTagId === emotionTagId)
  }

  posts.sort((a, b) => parseTime(b.createTime) - parseTime(a.createTime))

  const total = posts.length
  const start = (pageNum - 1) * pageSize
  const records = posts.slice(start, start + pageSize)

  res.jsonp({
    code: 200,
    message: 'success',
    data: {
      total,
      pageNum,
      pageSize,
      records,
    },
  })
})

server.get('/post/:id', (req, res) => {
  const id = toInt(req.params.id, Number.NaN)
  if (Number.isNaN(id)) {
    res.status(400).jsonp({
      code: 400,
      message: 'invalid id',
      data: null,
    })
    return
  }

  const post = router.db.get('posts').find({ id }).value()
  if (!post) {
    res.status(404).jsonp({
      code: 404,
      message: 'post not found',
      data: null,
    })
    return
  }

  res.jsonp({
    code: 200,
    message: 'success',
    data: post,
  })
})

server.use(router)

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock] server is running at http://localhost:${port}`)
})
