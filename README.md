# Mind Vault

Mind Vault is a full-stack personal knowledge dashboard for saving useful links, organizing them with tags and collections, marking content as favorite or pinned, adding private notes, and sharing a public view of your saved content.

Live frontend: <https://mindvault-ruddy.vercel.app>

**Try it without signing up:** <https://mindvault-ruddy.vercel.app/guest> opens a demo account with sample content. Guest accounts are private to each visitor and are deleted after 24 hours.

## Project layout

```text
.
├── mindvault-backend/       # Express + TypeScript API and MongoDB models
├── mindvault-frontend/      # React + TypeScript + Vite frontend
├── docs/
│   ├── ARCHITECTURE.md      # Components and request/data flow
│   ├── API.md               # API routes and request bodies
│   └── DEPLOYMENT.md        # Local setup and hosting configuration
└── .gitignore
```

## Features

- Sign up and sign in using a username and password, or continue as a guest with a temporary demo account.
- Save YouTube videos, Twitter/X posts, GitHub repos and profiles, Instagram and LinkedIn posts, articles from any site, and plain-text notes. The type is detected automatically from the pasted link.
- Edit saved items and organize them with tags and collections.
- Add private notes to saved items.
- Mark items as favorites or pinned.
- Create and revoke a public sharing link for your saved content.
- Browse a shared Brain; private notes are excluded from the public API response.
- Responsive React dashboard.

## Technology stack

- Frontend: React, TypeScript, Vite, React Router, Axios, Tailwind CSS.
- Backend: Node.js, Express, TypeScript, Mongoose.
- Database: MongoDB.
- Authentication: bcrypt password hashing and signed JWT bearer tokens.
- Hosting: Vercel frontend and a separately hosted backend (the documented deployment setup uses Render).

## Prerequisites

- A supported Node.js version compatible with the installed Vite/TypeScript versions.
- npm.
- A MongoDB instance, local or hosted.

## Local development

### 1. Backend

```powershell
cd mindvault-backend
npm install
Copy-Item .env.example .env
```

Edit `mindvault-backend/.env` with local values. At minimum, set `JWT_SECRET` to a strong random secret. For local MongoDB, the example URI is `mongodb://localhost:27017/mindvault`.

```powershell
npm run build
npm start
```

The API listens on `http://localhost:3000` by default. `npm run dev` currently builds the TypeScript project and starts the compiled server; it is not a watch-mode command.

### 2. Frontend

Open a second PowerShell window:

```powershell
cd mindvault-frontend
npm install
Copy-Item .env.example .env.local
```

Set `VITE_API_URL=http://localhost:3000` in `mindvault-frontend/.env.local`, then run:

```powershell
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. The frontend appends `/api/v1` to `VITE_API_URL`, so set the variable to the backend origin only, without `/api/v1`.

## Useful commands

| Location | Command | Purpose |
|---|---|---|
| `mindvault-backend/` | `npm run build` | Compile/check backend TypeScript |
| `mindvault-backend/` | `npm start` | Start compiled backend |
| `mindvault-backend/` | `npm run dev` | Build then start backend |
| `mindvault-backend/` | `npm test` | Run backend API tests (Vitest + Supertest, models mocked; no MongoDB needed) |
| `mindvault-frontend/` | `npm run dev` | Start Vite development server |
| `mindvault-frontend/` | `npm run build` | Type-check and build frontend |
| `mindvault-frontend/` | `npm test` | Run frontend component tests (Vitest + Testing Library, jsdom) |
| `mindvault-frontend/` | `npm run lint` | Run ESLint |
| `mindvault-frontend/` | `npm run preview` | Preview the production frontend build |

## Configuration and secrets

See [Deployment and environment configuration](docs/DEPLOYMENT.md). Never commit real `.env` files, database credentials, or JWT secrets. `.env.example` files should contain placeholders or local-only sample values, never production secrets.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Deployment and environment configuration](docs/DEPLOYMENT.md)

## Security notes

- Authenticated API routes require a bearer token in the `Authorization` header.
- JWTs currently expire after one hour; sign in again when a token expires.
- Sign-in (10 failed attempts per 15 minutes) and sign-up (10 per hour) are rate-limited per IP. Behind a reverse proxy, `TRUST_PROXY` must match the number of proxy hops (see [Deployment](docs/DEPLOYMENT.md)).
- Public share links use 10-character random hashes generated with a cryptographically secure RNG.
- The public sharing endpoint omits the `notes` field from shared content.
- A share link exposes all of the account’s saved content to anyone who has the URL, except private notes, which the public API excludes. Disable sharing to revoke the generated link.
- Use HTTPS in production and keep production secrets in the hosting provider's environment-variable settings.

## Current scope

This repository documentation describes the source layout and scripts present in the Phase 13 audit snapshot. Keep documentation synchronized with code changes. No claim is made here that a fresh install or deployment has been independently re-tested by this documentation update.
