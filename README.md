# Socket Calling [Use it](socket-calling.vercel.app)

Real-time chat with **React** (Vercel) + **Node/Socket.io** (Render).

## Local development

```bash
npm run install:all
npm run dev
```

- UI: http://localhost:3000  
- API / sockets: http://localhost:3001  

## Deploy (Vercel + Render)

### 1. Backend on Render

1. Push this repo to GitHub.
2. In [Render](https://render.com) → **New** → **Blueprint** (or Web Service).
3. Connect the repo; Render picks up `render.yaml` (`rootDir: server`).
4. Set environment variable **`CLIENT_ORIGIN`** to your Vercel production URL, e.g.  
   `https://socket-calling.vercel.app`  
   (comma-separate multiple URLs if needed.)
5. **`ALLOW_VERCEL_PREVIEWS`** is `true` in `render.yaml` so preview deploys work.
6. Deploy and copy the service URL, e.g. `https://socket-calling-api.onrender.com`.
7. Check: `https://<your-render-url>/health` → `{"status":"ok",...}`.

### 2. Frontend on Vercel

1. Import the same GitHub repo in [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Add environment variable:  
   **`REACT_APP_SERVER_URL`** = your Render URL (no trailing slash).
4. Deploy.

### 3. Wire them together

| Where   | Variable                 | Value                          |
|---------|--------------------------|--------------------------------|
| Render  | `CLIENT_ORIGIN`          | `https://your-app.vercel.app`  |
| Vercel  | `REACT_APP_SERVER_URL`   | `https://your-api.onrender.com` |

Redeploy both after changing env vars. Open the Vercel URL in two tabs, same room ID, different names — messages should sync.

**Note:** Render free tier sleeps when idle; the first join may take ~30s while the service wakes. The app uses a longer socket timeout in production for that.

## Tech stack

| Layer      | Tech |
| ---------- | ---- |
| Frontend   | React |
| Backend    | Node.js, Express |
| Realtime   | Socket.io |
