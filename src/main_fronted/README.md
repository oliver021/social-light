# socialLight web frontend

React 19 + Material UI single-page app. A small Express server (`server.ts`) serves the
build and proxies `/bff/*` to the `social-bff` gateway, so the SPA stays same-origin.

## Run locally

**Prerequisites:** Node.js and a running gateway (see the repo README, or `deploy/`).

1. Install dependencies: `npm install`
2. Set `GATEWAY_URL` if the gateway is not on `http://localhost:8088`.
3. Run the app: `npm run dev`

Production build: `npm run build && npm start` (see `deploy/Dockerfile.frontend`).
