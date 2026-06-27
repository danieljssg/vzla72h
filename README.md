# Venezuela Route 72 — API

API de logística humanitaria para la **Ruta 72 de Venezuela**: transportistas (carriers), despachos, centros de acopio, inventario, necesidades de emergencia y gestión de usuarios (jerarquía).

Stack: **Node.js + Fastify 5 + Mongoose 9 + BullMQ + Pino + Zod**.

**API pública**: sin autenticación — todos los endpoints están abiertos para simplificar el consumo interno.

---

## 🚀 Características

- **Framework HTTP**: [Fastify 5](https://fastify.dev/) (alto rendimiento, ~3x más rápido que Express).
- **Logger**: [Pino](https://getpino.io/) (incluido nativamente en Fastify) con `pino-pretty` en desarrollo.
- **Validación**: [Zod](https://zod.dev/) 4 via `app.validateBody / validateParams / validateQuery`.
- **Cache**: Redis (Valkey) con cache por usuario/identificador en GETs (TTL configurable).
- **Colas**: [BullMQ](https://docs.bullmq.io/) sobre Redis para tareas asíncronas (audit log, OAuth photo, dispatch photos).
- **Uploads**: `@fastify/multipart` para archivos de audio (necesidades de emergencia).
- **Estáticos**: `@fastify/static` para servir fotos de transportistas y audios de necesidades.
- **Seguridad**: `@fastify/helmet` + `@fastify/cors` + `@fastify/rate-limit` (100 req / 5 min).

---

## 📁 Estructura

```
.
├── index.js                       # Entry point del servidor HTTP
├── worker.js                      # Entry point del worker de BullMQ
├── package.json
├── biome.json
├── env.example
├── docs/postman/                  # Colección Postman
└── src/
    ├── server.js                  # Fastify server builder (registra plugins + rutas)
    ├── config/
    │   ├── corsConfig.js          # CORS (desarrollo = *, producción = whitelist)
    │   ├── db.js                  # Conexión Mongoose
    │   ├── logger.js              # Pino + pino-pretty + archivo logs/combined.log
    │   └── redis.js               # Conexiones Redis (BullMQ + Cache)
    ├── plugins/
    │   ├── cache.js               # cachePreHandler / cacheOnSend / clearCache
    │   ├── validate.js            # app.validateBody / validateParams / validateQuery
    │   └── errorHandler.js        # setErrorHandler global
    ├── modules/
    │   ├── carriers/              # CRUD de transportistas
    │   ├── dispatches/            # Crear despachos + deducción atómica de stock + queue de fotos
    │   ├── emergency-needs/       # CRUD de necesidades + upload de audio
    │   ├── inventory/             # Stock por centro de acopio + ajuste atómico
    │   ├── items/                 # Catálogo de artículos
    │   ├── supply-centers/        # Centros de acopio
    │   └── users/                 # CRUD de usuarios + jerarquía
    ├── shared/
    │   └── models/                # Modelos Mongoose
    ├── jobs/
    │   ├── queues/main.queue.js   # Cola única mainStream
    │   └── workers/main.worker.js # Worker único
    └── utils/
        ├── audit.logger.js        # saveAuditLog / createLogEntry
        ├── counter.helper.js      # getNextTagId
        └── validations/
            ├── index.js
            └── schemas/           # carrierSchema, itemSchema, userSchema, etc.
```

---

## 🛠️ Endpoints

**Todos los endpoints son públicos (sin autenticación).**

### Recursos públicos

- `/api/users` (CRUD + jerarquía `/team`, `/hierarchy`, `/move`, `/batch/create`)
- `/api/items` (CRUD)
- `/api/supply-centers` (CRUD)
- `/api/carriers` (CRUD + `/status` PATCH)
- `/api/inventory` (CRUD + `/by-center/:supplyCenterId` + `/adjust` PATCH)
- `/api/dispatches` (POST crea, GET lista, GET `/lookup?q=...` busca)
- `/api/emergency-needs` (POST con audio, CRUD, GET `/public/active`, PATCH `/resolve`)

### Utilidad

- `GET /health` — Health check (status, uptime, version)
- `GET /api` — Info de la API

---

## ⚙️ Variables de entorno

Copia `env.example` a `.env` y completa los valores:

```env
HOST=0.0.0.0
PORT=3100
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000

MONGO_URI=
MONGO_DB_NAME=
MONGO_QUERY_PARAMS=

VALKEY_HOST=
VALKEY_PORT=
VALKEY_PASSWORD=

API_VERSION=1.0.0
LOG_LEVEL=info
```

---

## 🏃 Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev              # nodemon sobre index.js
pnpm dev:worker       # nodemon sobre worker.js

# Producción
pnpm start            # node index.js
pnpm start:worker     # node worker.js

# Calidad
pnpm lint             # biome lint
pnpm lint:fix         # biome lint --write
pnpm format           # biome format --write
pnpm check            # biome check --write (format + lint + organizeImports)
```

---

## 🧰 Stack técnico

| Componente     | Tecnología                                                     |
| -------------- | -------------------------------------------------------------- |
| HTTP Framework | Fastify 5                                                      |
| Logger         | Pino 9 + pino-pretty 11                                        |
| Base de datos  | MongoDB + Mongoose 9                                           |
| Cache / Colas  | Redis (Valkey) + ioredis 5 + BullMQ 5                          |
| Validación     | Zod 4                                                          |
| Uploads        | @fastify/multipart 9                                           |
| Estáticos      | @fastify/static 8                                              |
| Seguridad      | @fastify/helmet 13 + @fastify/cors 11 + @fastify/rate-limit 10 |
| Linter         | Biome 2.4                                                      |

---

## 📦 Postman

Importa la colección desde [`docs/postman/venezuela-route72.postman_collection.json`](docs/postman/venezuela-route72.postman_collection.json).

---

## 📝 Notas

- **API pública**: no hay autenticación. Si necesitás proteger los endpoints en producción, agregá un reverse proxy con auth (Nginx, Cloudflare Access, etc.) o un API Gateway.
- **Stock atómico**: el endpoint `POST /api/dispatches` deduce stock con `$inc` condicional (`'stocks.quantity': { $gte: qty }`) y hace rollback si falla — previene overcommit.
- **Cache**: las respuestas GET con status 200 se cachean automáticamente en Redis. El header `x-refresh: true` o query `?refresh=true` fuerza bypass.
- **Tareas asíncronas**: el worker procesa 3 tipos de jobs (`SAVE_AUDIT_LOG`, `UPDATE_OAUTH_DATA`, `PROCESS_CARRIER_PHOTO`).
- **Auditoría**: cada `create / update / delete` que afecta un modelo registra un log vía cola (no bloquea la request).
- **Jerarquía de usuarios**: cada usuario tiene un `tagId` único y un `path` jerárquico (`parentTagId/.../tagId`). Permite queries eficientes de subárboles (`{ path: { $regex: '^parentPath/' } }`).
