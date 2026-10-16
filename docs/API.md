# Brainly API reference

Base URL: `{BACKEND_ORIGIN}/api/v1` (for local development, `http://localhost:3000/api/v1`). Send JSON request bodies with `Content-Type: application/json` where applicable.

Protected routes require:

```http
Authorization: Bearer <JWT>
```

The JWT is issued by sign-in and currently expires after one hour. All user-owned operations are scoped to the authenticated user.

## Authentication

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/signup` | Public | Create an account |
| `POST` | `/signin` | Public | Sign in and receive a JWT |

Signup/signin request body:

```json
{ "username": "your-username", "password": "at-least-8-characters" }
```

Username must be 3–30 characters after trimming. Password must contain at least 8 characters. Signup returns a message; sign-in returns `{ "token": "..." }`. Duplicate usernames return HTTP 409; invalid input returns HTTP 400; invalid credentials return HTTP 401.

## Content

All paths below are relative to `/api/v1` and require authentication.

| Method | Path | Purpose | Body / notes |
|---|---|---|---|
| `POST` | `/content` | Create content | `title`, `link`, `type`; optional `tags` array, `collectionId`, `notes` |
| `GET` | `/content` | List the current user's content | Returns `{ "content": [...] }` |
| `PUT` | `/content/:id` | Update content | `title`, `link`, `type`; optional `tags`, `collectionId`, `notes` |
| `PATCH` | `/content/:id/favorite` | Set favorite state | `{ "isFavorite": true }` or `false` |
| `PATCH` | `/content/:id/pin` | Set pinned state | `{ "isPinned": true }` or `false` |
| `DELETE` | `/content` | Delete content | `{ "contentId": "<content-id>" }` |

Supported `type` values are `youtube` and `twitter`. `link` must be a valid HTTP or HTTPS URL. `title` is required. Notes are optional and limited to 2,000 characters. Tag IDs and collection IDs must belong to the authenticated user. For updates, omitted `notes`, `tags`, or `collectionId` are not all equivalent: consult `content.controller.ts` when implementing partial-update clients.

Successful create returns `{ "message": "Content added" }`. Update and state-change endpoints return a message and updated content. Delete returns `{ "message": "Deleted" }`.

## Tags

| Method | Path | Purpose | Body |
|---|---|---|---|
| `POST` | `/tags` | Create a tag | `{ "name": "learning" }` |
| `GET` | `/tags` | List current user's tags | Returns `{ "tags": [...] }` |
| `DELETE` | `/tags/:id` | Delete a tag | No body required |

Tag names are trimmed, normalized to lowercase, and limited to 30 characters. Duplicate tag names for a user return HTTP 409. Deleting a tag removes its association from that user's content.

## Collections

| Method | Path | Purpose | Body |
|---|---|---|---|
| `POST` | `/collections` | Create a collection | `{ "name": "Reading list" }` |
| `GET` | `/collections` | List current user's collections | Returns `{ "collections": [...] }` |
| `DELETE` | `/collections/:id` | Delete a collection | No body required |

Collection names are required and limited to 50 characters. Duplicate names return HTTP 409. Deleting a collection clears the collection association from that user's content; it does not delete the content itself.

## Sharing

| Method | Path | Auth | Purpose | Body |
|---|---|---|---|---|
| `POST` | `/brain/share` | Required | Enable or disable public sharing | `{ "share": true }` or `{ "share": false }` |
| `GET` | `/:shareLink` | Public | Read a shared Brain | No body required |

Enabling sharing returns `{ "hash": "..." }`; if a link already exists, its hash is returned. Disabling sharing deletes the user's link and returns `{ "message": "Removed Link" }`. The public endpoint returns `{ "username": "...", "content": [...] }` for all content owned by the account associated with the share link; the query explicitly excludes each content item's `notes` field. The current implementation does not support selecting only certain items for sharing. A missing/invalid share link returns HTTP 404.

## Common errors

Responses generally include a JSON `message` field. Common status codes include:

- `400` — invalid request data, malformed JSON, or invalid IDs.
- `401` — missing/invalid authentication or incorrect sign-in credentials.
- `403` — supplied tag/collection does not belong to the current user.
- `404` — resource, route, or share link not found.
- `409` — duplicate username/tag/collection.
- `500` — unexpected server error; internal details are not returned to the client.

This reference was written against the Phase 13 audit snapshot. Controller behavior is authoritative if this document becomes stale.
