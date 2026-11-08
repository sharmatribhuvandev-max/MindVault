# Mind Vault frontend

React + TypeScript frontend for the Mind Vault personal knowledge dashboard. It is built with Vite and uses React Router for client-side navigation and Axios to call the Express API.

Production frontend: <https://brainly-ruddy.vercel.app>

## Requirements

- Node.js compatible with the versions in `package.json`.
- npm.
- The Mind Vault backend running locally or deployed.

## Setup

From this directory:

```powershell
npm install
Copy-Item .env.example .env.local
```

Set the API origin in `.env.local`:

```dotenv
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` is the backend origin only. The frontend adds `/api/v1` to API requests. For production, set `VITE_API_URL` to the deployed backend origin in the Vercel project's environment variables and redeploy.

Start the development server:

```powershell
npm run dev
```

## Scripts

- `npm run dev` — start Vite development server.
- `npm run build` — run TypeScript project builds and create the production bundle.
- `npm test` — run `vitest run`; ensure Vitest is declared and installed for clean installs.
- `npm run test:watch` — run Vitest in watch mode.
- `npm run lint` — run ESLint.
- `npm run preview` — locally preview the production build.

## Routes

- `/signin` — sign in.
- `/signup` — create an account.
- `/dashboard` — authenticated dashboard.
- `/share/:hash` — public shared Brain page.
- `/` redirects to `/signin`.

Vercel's `vercel.json` rewrites client-side paths to `index.html` so React Router can resolve these routes on refresh.

For full project setup, backend configuration, architecture, and API details, see the root [README](../README.md) and [documentation](../docs/).
