# 🎙️ Spotz Analysis: AI'nFold

## _Arte, Código y Latencia — Transformando datos en narrativa sonora_

AI'nFold es una plataforma que recibe datos de candidatos, los procesa mediante IA y genera un análisis completo, y mediante generación de audio, narra la relación entre sus hobbies y su perfil profesional: **Habilidades Transferibles**.

<!-- ---

## 📺 Demo en Video

<iframe width="560" height="315" src="https://www.youtube.com/embed/TU_VIDEO_ID" title="Spotz Analysis - Demo completa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

--- -->

## 💬 El Hook

> _"Uno de los retos en RRHH, sobre todo en Venezuela, es que bajo diversas circunstancias… El ingeniero aprendió repostería, la contadora es manicurista, el Dev aprendió a ser barista y el médico es locutor. No basta con la experiencia técnica; son esos detalles que pasan desapercibidos los que marcan la diferencia. AI'nFold busca ir más allá, explorando cómo lo que te apasiona se transfiere a tu trabajo diario."_

---

## 🏗️ Arquitectura de Servicios

El backend está diseñado bajo una premisa simple: **ningún proceso monolítico**. Cada tarea tiene su propio worker y ""nada"" bloquea el event loop principal.

### 🔁 El Corazón de las Colas: BullMQ + Valkey

En lugar de Redis, uso **Valkey**, el fork open source. Es 100% compatible con BullMQ y garantiza una arquitectura libre de restricciones de licenciamiento. Centralizar la lógica en colas permite que la API responda instantáneamente mientras el procesamiento pesado sucede en segundo plano.

- **`analysisStream`:** Gestiona el procesamiento de CVs. Extrae texto (PDF Service con Unpdf) y llama a la IA (AI Service con OpenRouter y Groq). Concurrencia: 3 simultáneos para balancear velocidad y carga.
- **`audioStream`:** Pasa el `ai_insight` por el modelo Kokoro-TTS. Concurrencia forzada a **1 ejecucion simultánea** para proteger la estabilidad de la CPU/RAM en la instancia GP.Micro, evitando que el proceso de síntesis agote los recursos.
- **`mainStream`:** Maneja tareas de soporte como logs de auditoría y actualizaciones de metadatos de usuario.

---

## 🛡️ Seguridad y Resiliencia

### 🌐 Configuración de CORS y Rate Limitting

Dado que operamos en una instancia **GP.Micro**, la protección de recursos es vital:

- **CORS (`src/config/corsConfig.js`):** Configurado estrictamente para permitir solo orígenes autorizados con `credentials: true`. Esto es crucial para la seguridad de las sesiones basadas en cookies y evitar ataques CSRF.
- **Rate Limiter (`src/config/limitter.js`):** Implementamos dos niveles:
  - **Global:** 100 peticiones cada 5 min para evitar abuso general.
  - **Análisis:** Limitado a 5 peticiones cada 5 min. Esto previene que un solo usuario sature el motor de IA y los créditos de OpenRouter y Groq, además de proteger la CPU de picos de extracción de texto simultáneos.

---

## 🧠 Lógica de Negocio e IA

- **IA Service (OpenRouter y Groq):** Construye prompts dinámicos inyectando el CV, el nombre y el hobby del candidato. Rota automáticamente API Keys para asegurar mayor disponibilidad.
- **TTS Service (Kokoro):** Motor de síntesis de voz autohospedado en la propia instancia. Los textos pasan por un diccionario fonético (`ttsDictionary.js`) que traduce anglicismos y tecnicismos al español para una pronunciación perfecta, por ejemplo "AI" se pronuncia "Ei Ai" y no "Ai".
- **PDF Service:** Extracción de texto mediante `unpdf` con validación de integridad para detectar archivos corruptos o ilegibles. (como documentos escaneados o con imágenes)

---

## 📂 Estructura del Backend (Folder-by-Folder)

- **`src/api/`**: Contiene la definición de rutas y controladores. Es la puerta de entrada para todas las peticiones del frontend.
- **`src/config/`**: El cerebro de la configuración. Aquí reside la lógica de CORS, Rate Limitting, conexión a DB, Redis, y estrategias de JWT/OAuth.
- **`src/jobs/`**: El motor de procesamiento asíncrono.
  - **`queues/`**: Definición técnica de las colas de BullMQ.
  - **`workers/`**: La lógica real que procesa cada tarea (Análisis, TTS, Logs). Cada worker corre de forma aislada.
- **`src/modules/`**: Lógica de negocio segmentada por dominio (Auth, Usuarios, Análisis). Cada módulo orquestra sus propios controladores y servicios específicos.
- **`src/shared/`**: Recursos que atraviesan todo el sistema.
  - **`models/`**: Definición de esquemas de Mongoose.
  - **`services/`**: Abstracciones para interactuar con IA, TTS y envío de correos.
  - **`prompts/`**: Plantillas dinámicas de IA para asegurar resultados consistentes.
- **`src/utils/`**: Helpers utilitarios como el builder de prompts y el extractor de texto de PDFs.

---

## 🗄️ Modelos de Datos (MongoDB)

- **`User`**: Gestiona la identidad, perfiles de Google y roles (Demo/Admin).
- **`Analysis`**: El "core" del dato. Almacena la extracción de texto, el análisis JSON generado por la IA y referencias al audio.
- **`AnalysisAudio`**: Rastrea los archivos de voz generados, su ubicación en el volumen compartido y metadatos de generación.
- **`Job`**: Mapea el estado de las colas de BullMQ a la base de datos para permitir al frontend hacer polling del progreso en tiempo real.
- **`AuditLog`**: Registro de acciones críticas para trazabilidad y debugging.
- **`File`**: Gestión de metadatos de los CVs subidos.

---

## 🏗️ Infraestructura Cubepath (GP.Micro)

Esta es la pieza clave: **Todo el ecosistema convive en una sola instancia de 2 vCPU / 4 GB RAM.** Orquestado con **Dokploy**.

- **Optimización de Recursos:** La instancia cuenta con 4 GB de SWAP activo para absorber picos de carga durante la ejecución del modelo TTS.
- **Comunicación Interna:** Los servicios se conectan usando IDs internos de Dokploy, evitando tráfico por red pública y reduciendo la latencia al mínimo.
- **Persistencia Compartida:** Se utiliza un directorio bindeado en la VM para que la API, el Worker y el Frontend puedan acceder a los archivos `.mp3` generados sin transferencias innecesarias.
- **Seguridad Epímera:** Todos los registros (análisis, jobs, audios) tienen un **TTL de 1 hora** en MongoDB. Al ser una demo, la prioridad es la privacidad y la limpieza automática de datos.

Distribución de recursos en la instancia GP.Micro (2 vCPU / 4 GB RAM):
| Servicio | vCPU | RAM |
| :--- | :--- | :--- |
| frontend (Next.js) | 0.75 vCPU | 768 MB |
| api (Express) | 0.5 vCPU | 512 MB |
| worker (BullMQ + IA) | 1 vCPU | 1 GB |
| kokoro-tts | 1 vCPU | 2 GB |
| MongoDB | 0.25 vCPU | 512 MB |
| Valkey/Redis | 0.15 vCPU | 256 MB |
| worker-monitor | 0.15 vCPU | 128 MB |

---

## 🛠️ Instalación y Configuración

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/danieljssg/ainfold-backend
    ```
2.  **Instala las dependencias:**
    ```bash
    pnpm install
    ```
3.  **Configura las variables de entorno:**
    Copia el archivo de ejemplo y rellena los valores necesarios (puedes ver todos los nombres requeridos en `env.example`):
    ```bash
    cp env.example .env
    ```
4.  **Ejecución del Sistema:**
    El backend se divide en dos procesos independientes que deben correr simultáneamente:
    - **Para la API (Servidor Express):**
      - Desarrollo: `pnpm run dev`
      - Producción: `pnpm run start`
    - **Para el Worker (Procesamiento de Colas):**
      - Desarrollo: `pnpm run dev:worker`
      - Producción: `pnpm run start:worker`

---

> Desarrollado desde **Venezuela** por Daniel Saud. Porque contar historias que se escriben con código también es una forma de arte. 🇻🇪
