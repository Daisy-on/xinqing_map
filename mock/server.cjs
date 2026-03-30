const jsonServer = require('json-server')

const server = jsonServer.create()
const router = jsonServer.router('mock/db.json')
const middlewares = jsonServer.defaults()
const port = 3001

server.use(middlewares)
server.use(jsonServer.bodyParser)

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const parseTime = (text) => {
  return new Date(String(text).replace(/-/g, '/')).getTime()
}

const ok = (res, data) => {
  res.jsonp({
    code: 200,
    message: 'success',
    data,
  })
}

const fail = (res, status, message) => {
  res.status(status).jsonp({
    code: status,
    message,
    data: null,
  })
}

const buildToken = (userId) => `mock-token-${userId}`

const getBearerToken = (req) => {
  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) {
    return ''
  }
  return authorization.slice(7)
}

server.post('/user/register', (req, res) => {
  const account = String(req.body?.account || '').trim()
  const nickname = String(req.body?.nickname || '').trim()
  const password = String(req.body?.password || '')

  if (!account || !nickname || !password) {
    fail(res, 400, 'account, nickname and password are required')
    return
  }

  if (password.length < 6) {
    fail(res, 400, 'password length must be at least 6')
    return
  }

  const users = router.db.get('users')
  const existed = users.find({ account }).value()
  if (existed) {
    fail(res, 409, 'account already exists')
    return
  }

  const currentUsers = users.value() || []
  const nextId = currentUsers.length ? Math.max(...currentUsers.map((item) => item.id)) + 1 : 1

  users
    .push({
      id: nextId,
      account,
      nickname,
      password,
      avatar: '',
    })
    .write()

  ok(res, { userId: nextId })
})

server.post('/user/login', (req, res) => {
  const account = String(req.body?.account || '').trim()
  const password = String(req.body?.password || '')

  if (!account || !password) {
    fail(res, 400, 'account and password are required')
    return
  }

  const user =
    router.db
      .get('users')
      .find({ account, password })
      .value() || null

  if (!user) {
    fail(res, 401, 'invalid account or password')
    return
  }

  const userInfo = {
    id: user.id,
    account: user.account,
    nickname: user.nickname,
    avatar: user.avatar,
  }

  ok(res, {
    token: buildToken(user.id),
    userInfo,
  })
})

server.get('/user/me', (req, res) => {
  const token = getBearerToken(req)
  const matched = /^mock-token-(\d+)$/.exec(token)
  if (!matched) {
    fail(res, 401, 'unauthorized')
    return
  }

  const userId = Number.parseInt(matched[1], 10)
  const user = router.db.get('users').find({ id: userId }).value()
  if (!user) {
    fail(res, 401, 'unauthorized')
    return
  }

  ok(res, {
    id: user.id,
    account: user.account,
    nickname: user.nickname,
    avatar: user.avatar,
  })
})

server.get('/location/list', (req, res) => {
  const locations = router.db.get('locations').value() || []
  ok(res, locations)
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

  ok(res, {
    total,
    pageNum,
    pageSize,
    records,
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

  ok(res, post)
})

server.use(router)

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock] server is running at http://localhost:${port}`)
})
