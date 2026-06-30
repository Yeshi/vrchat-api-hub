import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

const playlist = {
  playlistName: 'プレイリスト1',
  tracks: [
    {
      "title": "オネンネネンネ / でびでび・でびる",
      "url": "https://www.youtube.com/watch?v=wjMRRw0pmNg"
    },
    {
      "title": "でびタスマゴリー / でびでび・でびる",
      "url": "https://www.youtube.com/watch?v=iGDG3bb6j_E"
    },
    {
      "title": "TAIDADA / ずっと真夜中でいいのに。",
      "url": "https://www.youtube.com/watch?v=IeyCdm9WwXM"
    },
    {
      "title": "ひっひっふー / しぐれうい",
      "url": "https://www.youtube.com/watch?v=VXUbEH0DvSM"
    }
  ],
}

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
})

app.get('/status', (c) => {
  return c.json({
    message: 'Hello VRChat',
    updatedAt: new Date().toISOString(),
  })
})

app.get('/playlist', (c) => {
  return c.json({
    ...playlist,
    updatedAt: new Date().toISOString(),
  })
})

export default app
