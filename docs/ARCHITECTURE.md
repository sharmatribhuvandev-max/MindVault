# Mind Vault architecture

## High-level structure

```text
Browser
  └── React + TypeScript + Vite (mindvault-frontend/)
       └── Axios requests to {VITE_API_URL}/api/v1
            └── Express + TypeScript API (mindvault-backend/)
                 ├── Authentication middleware (protected routes)
                 ├── Route modules and controllers
                 ├── Mongoose models
                 └── MongoDB
```

## Frontend

- `mindvault-frontend/src/App.tsx` declares `/signup`, `/signin`, `/dashboard`, and `/share/:hash`; `/` redirects to `/signin`.
- `src/components/ProtectedRoute.tsx` guards authenticated dashboard routes.
- `src/pages/` contains sign-in, sign-up, dashboard, and shared-view screens.
- `src/hooks/useContent.tsx` loads the user's saved content.
- `src/config.ts` reads `VITE_API_URL`, falling back to `http://localhost:3000`, and API calls append `/api/v1`.
- `vercel.json` rewrites paths to `index.html` for client-side routing.

## Backend

- `mindvault-backend/src/server.ts` connects to MongoDB and starts the HTTP server.
- `mindvault-backend/src/app.ts` configures JSON parsing, CORS, API routes, a JSON 404 response, and centralized error handling.
- `src/config.ts` reads environment variables and requires `JWT_SECRET`; in production it also requires `MONGO_URI` and `FRONTEND_URL`.
- `src/routes/` maps URL paths to controller functions.
- `src/controllers/` contains request validation and application behavior.
- `src/middleware/auth.middleware.ts` authenticates protected routes using a bearer token.
- `src/models/` defines Mongoose models for users, content, tags, collections, and sharing links; `src/db.ts` exports database/model access.

## Authentication flow

1. The frontend sends username and password to `POST /api/v1/signup` or `POST /api/v1/signin`.
2. Signup hashes passwords using bcrypt before storing a user record.
3. Sign-in checks the password and returns a signed JWT.
4. The frontend stores the token in browser `localStorage` and sends it as `Authorization: Bearer <token>` on protected API calls.
5. The backend verifies the token and associates protected operations with the authenticated user. JWT lifetime is currently one hour.

Because browser `localStorage` is accessible to JavaScript running on the page, avoid injecting untrusted scripts and keep dependencies updated. This documentation does not represent a separate penetration test.

## Saved content and organization

- Content records support `youtube`, `twitter`, `article`, `note`, `github`, `instagram` and `linkedin` types, an HTTP(S) link (optional for notes), title, a note `body`, tags, optional collection association, private notes, favorite state, and pinned state. The type list lives in `mindvault-backend/src/content-types.ts` and `mindvault-frontend/src/contentTypes.ts`. Embeds are rendered in the browser (`mindvault-frontend/src/components/Embeds.tsx`, URL parsing in `src/embedUrls.ts`): GitHub repo cards call the public GitHub REST API without auth (60 requests/hour per visitor IP, cached per page load); Instagram and LinkedIn posts use their official iframe embeds and fall back to a link card for profiles and other pages. The backend never fetches third-party pages.
- Tags and collections are scoped to the owning user. Controller checks validate that supplied tag/collection IDs belong to that user.
- Content update/delete/favorite/pin operations check ownership before modifying records.
- Deleting a tag removes that tag from the user's content; deleting a collection clears its association from the user's content.

## Public sharing and privacy

1. An authenticated client calls `POST /api/v1/brain/share` with `{ "share": true }` to create or retrieve a share hash.
2. The public frontend route `/share/:hash` requests `GET /api/v1/:shareLink`.
3. The public API finds the share record and returns the username and shared content.
4. The public query returns all content records owned by the linked user and explicitly excludes the `notes` field (`select("-notes")`). Sharing is not limited to a hand-picked subset of content in the current implementation.
5. An authenticated request with `{ "share": false }` deletes the share record and revokes the link.

Treat the generated share URL as public to anyone who possesses it. Verify the current controllers and tests whenever changing sharing behavior.

## Error handling

Unknown API routes return HTTP 404 with a JSON message. Malformed JSON receives HTTP 400. Unexpected backend errors are logged server-side and return a generic HTTP 500 response rather than exposing internal error details.
