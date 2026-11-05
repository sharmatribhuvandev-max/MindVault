# Brainly

Brainly is a full-stack personal knowledge dashboard for saving useful links, organizing them with tags and collections, marking content as favorite or pinned, adding private notes, and sharing a public view of your saved content.

Live frontend: <https://brainly-ruddy.vercel.app>

## Project layout

```text
.
├── Brainly/                 # Express + TypeScript API and MongoDB models
├── brainly-frontend/        # React + TypeScript + Vite frontend
├── docs/
│   ├── ARCHITECTURE.md      # Components and request/data flow
│   ├── API.md               # API routes and request bodies
│   └── DEPLOYMENT.md        # Local setup and hosting configuration
└── .gitignore
```

## Features

- Sign up and sign in using a username and password.
- Save supported YouTube and Twitter/X links.
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
cd Brainly
npm install
Copy-Item .env.example .env
```

Edit `Brainly/.env` with local values. At minimum, set `JWT_SECRET` to a strong random secret. For local MongoDB, the example URI is `mongodb://localhost:27017/brainly`.

```powershell
npm run build
npm start
```

The API listens on `http://localhost:3000` by default. `npm run dev` currently builds the TypeScript project and starts the compiled server; it is not a watch-mode command.

### 2. Frontend

Open a second PowerShell window:

```powershell
cd brainly-frontend
npm install
Copy-Item .env.example .env.local
```

Set `VITE_API_URL=http://localhost:3000` in `brainly-frontend/.env.local`, then run:

```powershell
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. The frontend appends `/api/v1` to `VITE_API_URL`, so set the variable to the backend origin only, without `/api/v1`.

## Useful commands

| Location | Command | Purpose |
|---|---|---|
| `Brainly/` | `npm run build` | Compile/check backend TypeScript |
| `Brainly/` | `npm start` | Start compiled backend |
| `Brainly/` | `npm run dev` | Build then start backend |
| `Brainly/` | `npm test` | Run backend API tests (Vitest + Supertest, models mocked; no MongoDB needed) |
| `brainly-frontend/` | `npm run dev` | Start Vite development server |
| `brainly-frontend/` | `npm run build` | Type-check and build frontend |
| `brainly-frontend/` | `npm test` | Run frontend component tests (Vitest + Testing Library, jsdom) |
| `brainly-frontend/` | `npm run lint` | Run ESLint |
| `brainly-frontend/` | `npm run preview` | Preview the production frontend build |

## Configuration and secrets

See [Deployment and environment configuration](docs/DEPLOYMENT.md). Never commit real `.env` files, database credentials, or JWT secrets. `.env.example` files should contain placeholders or local-only sample values, never production secrets.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Deployment and environment configuration](docs/DEPLOYMENT.md)

## Security notes

- Authenticated API routes require a bearer token in the `Authorization` header.
- JWTs currently expire after one hour; sign in again when a token expires.
- The public sharing endpoint omits the `notes` field from shared content.
- A share link exposes all of the account’s saved content to anyone who has the URL, except private notes, which the public API excludes. Disable sharing to revoke the generated link.
- Use HTTPS in production and keep production secrets in the hosting provider's environment-variable settings.

## Current scope

This repository documentation describes the source layout and scripts present in the Phase 13 audit snapshot. Keep documentation synchronized with code changes. No claim is made here that a fresh install or deployment has been independently re-tested by this documentation update.
