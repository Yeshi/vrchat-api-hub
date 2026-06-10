import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
})

app.get('/status', (c) => {
  return c.json({
    message: 'Hello VRChat',
    updatedAt: new Date().toISOString(),
  })
})

export default app
