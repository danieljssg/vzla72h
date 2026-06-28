# venezuela-route72 — Postman Collection

## Importar

1. Abrir Postman → **Import** → seleccionar `venezuela-route72.postman_collection.json`.
2. (Opcional pero recomendado) Crear un **Environment** con la variable `host_url` apuntando a tu entorno:
   - **Local**: `http://localhost:3100/api`
   - **Staging/Prod**: `https://api.tu-dominio.com/api`

> Si **no** creas un environment, la colección trae `host_url` con default `http://localhost:3100/api`.

## Variables de la colección

| Variable         | Descripción                                           | Default                     |
| ---------------- | ----------------------------------------------------- | --------------------------- |
| `host_url`       | Base URL de la API (sin `/` final)                    | `http://localhost:3100/api` |
| `itemId`         | Se rellena al crear un Item                           | vacío                       |
| `supplyCenterId` | Se rellena al crear un SupplyCenter                   | vacío                       |
| `carrierId`      | Se rellena al crear un Carrier                        | vacío                       |
| `inventoryId`    | Se rellena al crear un Inventory                      | vacío                       |
| `dispatchId`     | Se rellena al crear un Dispatch                       | vacío                       |
| `tripCode`       | Se rellena al crear un Dispatch                       | vacío                       |
| `licensePlate`   | Placa usada en dispatches (debe existir como Carrier) | `R72-ABC1`                  |
| `needId`         | Se rellena al crear un EmergencyNeed                  | vacío                       |
| `userTagId`      | Se rellena al crear un User (tagId legible)           | vacío                       |
| `userId`         | Se rellena al crear un User (ObjectId de Mongo)       | vacío                       |

> ⚠️ Antes de correr el **Smoke Test**, edita la variable `needId` con un ObjectId real de tu colección `emergency-needs`. Si no, `POST /emergency-needs` fallará con 400.

## Estructura de la colección

- **Users** — `GET /`, `GET /by-id/:id`, `POST /` (CRUD básico; la autenticación corre en el frontend con better-auth).
- **Items** — CRUD completo (List, Get, Create, Update, Delete).
- **SupplyCenters** — CRUD + soft-delete. `POST /` acepta `photo: { data, mimeType }` (base64 opcional).
- **Carriers** — CRUD + `PATCH /:id/status` + soft-delete.
- **Inventory** — CRUD + `GET /by-center/:id` + `PATCH /:id/adjust` (delta).
- **Dispatches** — `POST /`, `GET /` (paginado + filtro `status`), `GET /lookup?q=`.
- **EmergencyNeeds** — `POST /` (multipart con audio opcional), `GET /`, `GET /public/active`, `GET /:id`, `PUT /:id`, `PATCH /:id/resolve`, `DELETE /:id`. Campo `urgency`: `baja | media | alta | critica` (default `media`).

## Ejecutar el Smoke Test

1. Cargar la colección en Postman.
2. Click derecho en **Smoke Test** → **Run folder**.
3. Verificar que los 7 pasos pasen (cada uno verifica status 2xx y persiste IDs en variables).

El Smoke Test cubre:

- Seed de catálogos base (Item, SupplyCenter, Carrier).
- Creación de un Inventory con 100 unidades.
- **Dispatch** que descuenta 10 unidades atómicamente y encola el procesamiento de la foto.
- Verificación post-dispatch: stock quedó en 90, y el `tripCode` generado es consultable por `/lookup`.

## Auto-save de IDs

Las requests `POST` y `PUT` que devuelven un `data._id` guardan automáticamente el ID en la variable correspondiente. Esto permite encadenar requests sin copiar/pegar manualmente.

## Cache de lecturas

Los GETs públicos están cacheados por **5 minutos** (TTL 300s) en Redis. Si haces un POST y luego un GET, podrías ver el dato viejo hasta que expire el cache. Para forzar un refresh, pasa `?refresh=true` en la query (soporte nativo del `cacheMiddleware`).

## Endpoints

````users
GET    /api/users/by-id/:id
POST   /api/users
DELETE /api/users/:tagId

GET    /api/items
GET    /api/items/:id
POST   /api/items
PUT    /api/items/:id
DELETE /api/items/:id

GET    /api/supply-centers
GET    /api/supply-centers/:id
POST   /api/supply-centers        (acepta photo.base64 opcional)/:id
POST   /api/supply-centers
PUT    /api/supply-centers/:id
DELETE /api/supply-centers/:id

GET    /api/carriers
GET    /api/carriers/:id
POST   /api/carriers
PUT    /api/carriers/:id
PATCH  /api/carriers/:id/status
DELETE /api/carriers/:id

GET    /api/inventory
GET    /api/inventory/by-center/:supplyCenterId
GET    /api/inventory/:id
POST   /api/inventory
PUT    /api/inventory/:id
PATCH  /api/inventory/:id/adjust
DELETE /api/inventory/:id

POST   /api/dispatches
GET    /api/dispatches
GET    /api/dispatches/lookup?q=

POST   /api/emergency-needs        (multipart formdata, audio opcional)
GET    /api/emergency-needs
GET    /api/emergency-needs/public/active
GET    /api/emergency-needs/:id
PUT    /api/emergency-needs/:id
PATCH  /api/emergency-needs/:id/resolve
DELETE /api/emergency-needs/:id

## Notas sobre foto en SupplyCenters

El campo `photo` en `POST /api/supply-centers` es opcional (JSON). Formato:

```json
"photo": {
  "data": "<base64 string (raw o data URL)>",
  "mimeType": "image/png"
}
````

Mimetypes aceptados: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`. Tamaño máximo: ~7 MB de base64 (~5 MB binarios). Se almacena en `photo` (string base64) y `photoMimeType` (string) en el documento.

```

## Notas sobre audio en EmergencyNeeds

El campo `audio` en `POST /api/emergency-needs` es opcional (multipart/form-data). Mimetypes aceptados: `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/mp4`, `audio/aac`, `audio/webm`, `audio/opus`. Tamaño máximo: 3 MB.
```
