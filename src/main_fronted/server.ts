import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Same-origin BFF: proxy /bff/* to the social-bff gateway so the SPA avoids CORS.
  // Mounted BEFORE express.json() so request bodies stream through to the gateway
  // untouched (a body parser here would consume the stream and hang the upstream).
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8088';
  // ws:true upgrades the SignalR chat hub (/bff/hubs/chat) to a real WebSocket;
  // the upgrade handler is bound to the http server below. SignalR still falls back
  // to SSE/long-polling over the same proxy if WS is unavailable.
  const bffProxy = createProxyMiddleware({
    target: GATEWAY_URL,
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/bff': '' },
  });
  app.use('/bff', bffProxy);

  app.use(express.json());

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve index.html and dist folders
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express engine running at http://0.0.0.0:${PORT}`);
  });
  // Proxy WebSocket upgrades (the SignalR hub) through the same /bff origin.
  server.on('upgrade', bffProxy.upgrade);
}

startServer().catch((err) => {
  console.error("Failed to start custom server:", err);
});
