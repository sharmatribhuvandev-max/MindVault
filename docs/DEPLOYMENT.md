# Deployment and environment configuration

The current deployment setup uses Vercel for the frontend and a separately hosted Node.js backend (the existing setup uses Render). The frontend URL is `https://brainly-ruddy.vercel.app`. Do not add production secrets to this document or commit real `.env` files.

## Environment variables

### Backend (`mindvault-backend/`)

| Variable | Required / behavior | Example for local development |
|---|---|---|
| `PORT` | Optional; defaults to `3000` | `3000` |
| `NODE_ENV` | Set to `production` in production | `development` |
| `MONGO_URI` | MongoDB connection string; required in production | `mongodb://localhost:27017/mindvault` |
| `JWT_SECRET` | Required; use a strong, random secret | `replace_with_a_random_secret` (placeholder only; replace it) |
| `FRONTEND_URL` | Allowed frontend origin for CORS; required in production | `http://localhost:5173` |
| `TRUST_PROXY` | Optional; number of reverse proxies in front of the API, used so rate limiting sees real client IPs. Defaults to `1` in production (correct for Render) and `0` otherwise | unset |

`mindvault-backend/src/config.ts` throws during startup if `JWT_SECRET` is missing, and in production if `MONGO_URI` or `FRONTEND_URL` is missing.

### Frontend (`mindvault-frontend/`)

| Variable | Purpose | Example for local development |
|---|---|---|
| `VITE_API_URL` | Backend origin; frontend code appends `/api/v1` | `http://localhost:3000` |

Do not include `/api/v1` in `VITE_API_URL`, or the frontend would append it a second time. Vite variables prefixed with `VITE_` are embedded into the client build and must never contain secrets.

## Vercel frontend

1. Set the Vercel project root directory to `mindvault-frontend`.
2. Configure `VITE_API_URL` to the deployed backend origin (origin only, no `/api/v1`).
3. Confirm the build command is `npm run build` and the output directory is `dist` (Vite default).
4. Keep `vercel.json`'s SPA rewrite so direct visits and refreshes of `/signin`, `/signup`, `/dashboard`, and `/share/:hash` reach `index.html`.
5. Redeploy after changing environment variables; Vite environment values are build-time values.

## Render backend

1. Set the service root directory to `mindvault-backend`.
2. Install dependencies with `npm install` (or the provider's standard install step).
3. Build with `npm run build`.
4. Start with `npm start`.
5. Configure `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL`; set `PORT` only if the platform requires/configures it. `FRONTEND_URL` should be the frontend origin, for example `https://brainly-ruddy.vercel.app`, without a path.
6. Confirm the database allows network access from the backend host and credentials are stored only in provider environment settings.

The backend's source starts the listener after a successful MongoDB connection. No dedicated health-check route was found in the audited route configuration; do not configure a health-check path unless one is added and verified.

## Safe deployment checklist

- Never commit `mindvault-backend/.env` or production secrets.
- Keep `.env.example` values as local placeholders only.
- Ensure `FRONTEND_URL` exactly matches the browser origin allowed by CORS.
- Ensure `VITE_API_URL` points to the backend origin and is configured before the frontend build.
- Confirm frontend and backend production deployments use the intended Git branch.
- After pushing to the connected branch, verify both provider deployments complete and test sign-in, saving content, public sharing, and disabling sharing.
- Public share links expose shared content to anyone with the URL; private notes are excluded by the current public endpoint.
