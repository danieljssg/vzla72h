# Plan: Venezuela Route 72 — API Cleanup & Migration to Fastify

## Context

The project `venezuela-route72` started as a humanitarian logistics API but contained significant residual code from a previous AI/CV analysis project (AI'nFold / Spotz Analysis). The user requested:

1. Remove all AI-related code and dependencies (OpenRouter, OCR, TTS, PDF processing, LLM analysis).
2. Migrate from Express to Fastify for better performance under high load.
3. Remove authentication (JWT + Google OAuth) to make the API easier to consume — auth will be handled in the frontend.

## What Was Done

### Phase 1: AI Code Removal (19 files deleted)

Deleted the following files/directories entirely:

- `src/modules/analyzes/` (entire directory — CV analysis endpoints)
- `src/modules/jobs/` (entire directory — BullMQ job tracking UI)
- `src/shared/services/` (entire directory — ai/ocr/pdf/tts services)
- `src/shared/prompts/` (entire directory — analysis prompt templates)
- `src/shared/models/Analysis.js`, `AnalysisAudio.js`, `Job.js`
- `src/utils/aiPromptBuilder.js`, `ttsDictionary.js`, `modelsPool.js`, `buildStrategies.js`, `texts.utils.js`
- `src/jobs/workers/analysis.worker.js`, `tts.worker.js`
- `src/utils/validations/schemas/analyzeSchema.js`

### Phase 2: Dead Code Removal (4 files deleted)

- `src/config/csrfConfig.js` + dep `csrf-csrf` (configured but never applied in app.js)
- `src/api/middlewares/enqueue.js` (defined `enqueueTask` but no route used it)
- `src/api/middlewares/hierarchy.js` (defined `checkHierarchy`/`requireRole`/`canManageUser` but unused)
- `src/api/middlewares/multer.js` (only `analyzes.routes.js` used it)

### Phase 3: Express → Fastify Migration

**New stack:**

- `fastify@5` (3x faster than Express, ~50k req/s)
- `@fastify/cors`, `@fastify/helmet`, `@fastify/multipart`, `@fastify/rate-limit`, `@fastify/sensible`, `@fastify/static`
- `pino@9` + `pino-pretty@11` (native Fastify logger, 5x faster than Winston)
- `fastify-plugin` for encapsulation escape

**New file structure:**

- `src/server.js` — `buildServer()` factory that registers all plugins and routes
- `src/plugins/auth.js` — JWT `app.authenticate` preHandler (later removed)
- `src/plugins/cache.js` — `cachePreHandler` / `cacheOnSend` / `clearCache`
- `src/plugins/validate.js` — `app.validateBody` / `validateParams` / `validateQuery` (Zod)
- `src/plugins/errorHandler.js` — global `setErrorHandler`
- `src/modules/*/X.routes.js` — converted to Fastify plugins: `export default async function X(app) { app.get/post(...) }`

**Migration patterns:**

- `(req, res) =>` → `(request, reply) =>`
- `res.status(N).json(X)` → `reply.code(N).send(X)`
- `Router` of Express → async plugin function for Fastify
- Express middleware → `preHandler` hook
- Custom cache via `res.json` override → Fastify `onSend` hook + preHandler
- Multer → `@fastify/multipart` with `request.file()`
- `express-session` + `connect-redis` → JWT in headers (later removed)
- `csrf-csrf` → removed entirely

**Critical fix:** `app.authenticate` decoration wasn't leaking to route plugins due to Fastify encapsulation. Fixed by wrapping the auth plugin with `fastify-plugin` (`fp(authPlugin, { name: 'auth-plugin' })`).

### Phase 4: Authentication Removal

**User decision:** Protect the API in the frontend, so the backend should be fully public. All auth was removed.

**Files deleted (8):**

- `src/modules/auth/` (entire directory — signup/signin/Google OAuth)
- `src/plugins/auth.js`
- `src/config/jwt.js` (token generation/verification)
- `src/config/oauth.js` (Google OAuth2 client)

**Files modified (8):**

- `src/server.js` — removed `@fastify/jwt` registration and `authPlugin` register
- `src/modules/users/user.routes.js` — removed `app.addHook('preHandler', app.authenticate)`
- `src/modules/users/user.controller.js` — removed all `request.user?.id` references
- `src/modules/users/user.service.js` — removed `bcryptjs` password encryption, `modifierId` parameter
- `src/shared/models/User.js` — removed `password`, `oAuthId`, `oAuthProvider` fields; removed `encryptPassword`/`comparePassword` statics
- `src/utils/validations/schemas/userSchema.js` — removed `signInSchema`, `signUpUserSchema`; removed `password` from `createUserSchema` and `updateUserSchema`
- `index.js` — removed `JWT_SECRET` dependency
- `env.example` — removed `JWT_SECRET`, `JWT_EXPIRES_IN`, `GOOGLE_*` variables
- `package.json` — removed 4 deps: `@fastify/jwt`, `bcryptjs`, `google-auth-library`, `jsonwebtoken`
- `README.md` — updated docs to reflect public API

**Dependencies removed (4):**

- `@fastify/jwt` 9.1.0
- `bcryptjs` 3.0.3
- `google-auth-library` 10.6.2
- `jsonwebtoken` 9.0.3

### Phase 5: API Tester HTML

Created `public/index.html` — a standalone HTML/JS file that consumes the entire API:

- **Sidebar navigation** grouped by resource (Users, Items, SupplyCenters, Carriers, Inventory, Dispatches, EmergencyNeeds)
- **Base URL config** persisted in localStorage
- **Saved IDs bar** — auto-fills IDs created by previous requests
- **Pre-filled forms** with valid example data
- **Multipart support** for audio uploads to `/emergency-needs`
- **Response display** with status code, timing, headers, formatted JSON body
- **No build step** — vanilla JS, can be opened as `file://` or served statically
- **28 endpoints** covered across 7 resource groups
- **Dark mode design** with method-colored badges (GET/POST/PUT/PATCH/DELETE)

## Final State

| Metric          | Value                                   |
| --------------- | --------------------------------------- |
| Files in `src/` | 44 JS files                             |
| Production deps | 15                                      |
| Endpoints       | 28 (all public)                         |
| Linter          | 0 errors (biome)                        |
| Syntax          | 0 errors (node --check)                 |
| Runtime         | Server builds + registers all routes OK |

## Endpoints (all public, no auth)

```
GET    /health
GET    /api

GET    /api/users/                                    List users
POST   /api/users/                                    Create user
POST   /api/users/batch/create                        Batch create
GET    /api/users/:tagId                              Get profile
PUT    /api/users/:tagId                              Update user
DELETE /api/users/:tagId                              Soft delete
GET    /api/users/:tagId/team                         Team members
GET    /api/users/:tagId/hierarchy                    Full hierarchy
PATCH  /api/users/:tagId/move                         Move in hierarchy

GET    /api/items/                                    List
POST   /api/items/                                    Create
GET    /api/items/:id                                 Get
PUT    /api/items/:id                                 Update
DELETE /api/items/:id                                 Delete

GET    /api/supply-centers/                           List
POST   /api/supply-centers/                           Create
GET    /api/supply-centers/:id                        Get
PUT    /api/supply-centers/:id                        Update
DELETE /api/supply-centers/:id                        Soft delete

GET    /api/carriers/                                 List
POST   /api/carriers/                                 Create
GET    /api/carriers/:id                              Get
PUT    /api/carriers/:id                              Update
PATCH  /api/carriers/:id/status                       Change status
DELETE /api/carriers/:id                              Soft delete

GET    /api/inventory/                                List
POST   /api/inventory/                                Create
GET    /api/inventory/by-center/:supplyCenterId       By center
GET    /api/inventory/:id                             Get
PUT    /api/inventory/:id                             Update stocks
PATCH  /api/inventory/:id/adjust                      Adjust stock
DELETE /api/inventory/:id                             Delete

POST   /api/dispatches/                               Create dispatch
GET    /api/dispatches/                               List
GET    /api/dispatches/lookup                         Search by plate/tripCode

POST   /api/emergency-needs/                          Report (audio optional)
GET    /api/emergency-needs/                          List
GET    /api/emergency-needs/public/active             Active (public)
GET    /api/emergency-needs/:id                       Get
PUT    /api/emergency-needs/:id                       Update
PATCH  /api/emergency-needs/:id/resolve               Mark resolved
DELETE /api/emergency-needs/:id                       Delete
```

## Future Considerations

- If auth is ever needed, wrap a new auth plugin with `fastify-plugin` to ensure decoration leaks to route plugins.
- The frontend will handle all authentication/authorization.
- The HTML tester (`public/index.html`) is a useful dev tool but should be excluded from production builds.
- Consider adding OpenAPI/Swagger generation for auto-generated client SDKs.

Crea el archivo en lugar de en public, crealo dentro de "docs" solamente un index.html, no es necesario que tenga librerías o algo debe ser un html simple que consuma la API y tenga un menú lateral con los endpoints, un formulario para cada endpoint y un área para mostrar la respuesta, además de tailwind con su cdn para los estilos.
