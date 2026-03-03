# Which parts of a web app need port numbers?

When running multiple apps in parallel (or in dev vs prod), you assign different ports so nothing conflicts. Here’s a typical map.

---

## Common elements that use ports

| Element | Typical env var | Role |
|--------|------------------|------|
| **Backend / API server** | `EXPRESS_PORT` (Express), `PORT` (generic) | Express, FastAPI, Flask, etc. Serves API and often the built frontend. |
| **Frontend dev server** | `VITE_DEV_PORT` (Vite), `PORT` (CRA), etc. | Hot-reload dev server (Vite, webpack-dev-server). Only in development. |
| **API proxy target** | `VITE_API_PORT` or same as `EXPRESS_PORT` | In dev, the frontend dev server proxies `/api` to this port (your backend). |
| **Database** | `DB_PORT`, `POSTGRES_PORT`, etc. | If the app talks to a DB on localhost. |
| **Redis / cache** | `REDIS_PORT` | If you run Redis locally. |
| **WebSocket / realtime** | `WS_PORT` or same as backend port | If separate from main HTTP server. |
| **Docker / compose** | `EXPRESS_PORT` in `.env` or compose | Host port mapped to container. |

---

## This project (Node + Vite + Express)

- **Express server:** `EXPRESS_PORT` (default 3000). Serves `/api`, `/uploads`, and the built `client/dist` in production.
- **Vite dev server:** `VITE_DEV_PORT` (default 5173). Used only for `npm run dev`; proxies API to `EXPRESS_PORT`.
- **Proxy target:** `VITE_API_PORT` — should match `EXPRESS_PORT` so the Vite proxy hits the right backend.

So the “ports that matter” for this stack are: **EXPRESS_PORT**, **VITE_DEV_PORT**, and **VITE_API_PORT** (usually same as EXPRESS_PORT).

---

## Checklist for your own apps

1. List every process that listens on a port (server, dev server, DB, Redis, etc.).
2. Give each an env var and a default in `.env`.
3. Use the Node or Python port util (or both) to read them in scripts and at startup so you can run multiple instances by changing `.env` per app.
