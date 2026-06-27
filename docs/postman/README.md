# venezuela-route72 — Postman Collection

## Importar

1. Abrir Postman → **Import** → seleccionar `venezuela-route72.postman_collection.json`.
2. (Opcional pero recomendado) Crear un **Environment** con la variable `host_url` apuntando a tu entorno:
   - **Local**: `http://localhost:3100/api`
   - **Staging/Prod**: `https://api.tu-dominio.com/api`

> Si **no** creas un environment, la colección trae `host_url` con default `http://localhost:3100/api`.

## Variables de la colección

| Variable         | Descripción                                            | Default                     |
| ---------------- | ------------------------------------------------------ | --------------------------- |
| `host_url`       | Base URL de la API (sin `/` final)                     | `http://localhost:3100/api` |
| `itemId`         | Se rellena al crear un Item                            | vacío                       |
| `supplyCenterId` | Se rellena al crear un SupplyCenter                    | vacío                       |
| `carrierId`      | Se rellena al crear un Carrier                         | vacío                       |
| `inventoryId`    | Se rellena al crear un Inventory                       | vacío                       |
| `dispatchId`     | Se rellena al crear un Dispatch                        | vacío                       |
| `tripCode`       | Se rellena al crear un Dispatch                        | vacío                       |
| `needId`         | Se rellena al crear un EmergencyNeed                   | vacío                       |
| `licensePlate`   | Placa usada en dispatches (debe existir como Carrier)  | `R72-ABC1`                  |
| `managerUserId`  | ObjectId de un User existente (coordinador del centro) | `65f0000000000000000000a1`  |

> ⚠️ Antes de correr **Smoke Test**, edita la variable `managerUserId` con un ObjectId real de tu colección `users`. Si no, `POST /api/supply-centers` fallará con 400.

## Estructura de la colección

- **Items** — CRUD completo (List, Get, Create, Update, Delete).
- **SupplyCenters** — CRUD + soft-delete.
- **Carriers** — CRUD + `PATCH /:id/status` + soft-delete.
- **Inventory** — CRUD + `GET /by-center/:id` + `PATCH /:id/adjust` (delta).
- **Dispatches** — `POST /`, `GET /` (paginado + filtro `status`), `GET /lookup?q=`.
- **EmergencyNeeds** — `POST /` (multipart con audio opcional), `GET /`, `GET /public/active`, `GET /:id`, `PUT /:id`, `PATCH /:id/resolve`, `DELETE /:id`.
- **Smoke Test** — flujo end-to-end (7 pasos). Se ejecuta con el **Collection Runner** en orden.

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

```
GET    /api/items
GET    /api/items/:id
POST   /api/items
PUT    /api/items/:id
DELETE /api/items/:id

GET    /api/supply-centers
GET    /api/supply-centers/:id
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

POST   /api/emergency-needs        (multipart/form-data, audio opcional)
GET    /api/emergency-needs
GET    /api/emergency-needs/public/active
GET    /api/emergency-needs/:id
PUT    /api/emergency-needs/:id
PATCH  /api/emergency-needs/:id/resolve
DELETE /api/emergency-needs/:id
```

## Photo payload en Dispatch

`emptyPhotoBase64` debe ser un string Base64 (con o sin prefijo `data:image/webp;base64,`). El controller hace `stripBase64Prefix` antes de encolarlo, y el worker lo decodifica con `Buffer.from(..., 'base64')` para escribir un `.webp` en `/app/storage/carriers/<licensePlate>/<uuid>.webp`.

Para el Smoke Test se usa un PNG mínimo (~70 bytes) válido para que el decode no falle; en producción usa un WebP de 12–15 KB pre-comprimido en el cliente.
