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

## 🎨 Frontend — UX/UI con Propósito

El frontend está diseñado para ser visualmente aceptable y poder manejar estados asíncronos "casi" en tiempo real. --haría falta la implementación de WebSockets para una mejor experiencia en tiempo real.--

### 🛠️ Stack Tecnológico

- **Framework:** Next.js (App Router).
- **Estilos:** Tailwind CSS v4.
<!-- - **Animaciones:** Framer Motion para transiciones suaves y estados de carga. -->
- **Gráficos:** Recharts para la visualización de "Radar de Habilidades".
- **Estado Global:** Context API para autenticación y persistencia de sesión.

### 🧩 Componentes Clave

- **Radar de Habilidades:** Una visualización pentagonal que evalúa Adapabildad, Precisión Técnica, Creatividad, Resiliencia y Comunicación de Impacto.
- **Análisis Cards con Polling:** Las tarjetas del dashboard consultan el estado del `job` cada 6 segundos, mostrando progreso en tiempo real (pending → processing → completed/failed).
- **AI_Insight Audio Player:** Un reproductor integrado que consume los audios `.mp3` generados por el modelo Kokoro-TTS en el backend.

### 🔐 Seguridad y Auth

- **Protección en el Edge:** `src/proxy.js` actúa como middleware, validando JWTs antes de que lleguen a los Server Components.
- **Interceptor de Axios:** Gestión automática de tokens CSRF y redirección por expiración de sesión.
- **OAuth:** Integración funcional con Google OAuth para una entrada rápida.

---

## 🏗️ Infraestructura en Cubepath

Toda la plataforma vive en una sola instancia **GP.Micro (2 vCPU / 4 GB RAM)** de Cubepath.

- **Orquestación:** Dokploy (Docker).
- **Persistencia Visual:** Volúmenes bindeados en la VM para compartir archivos de audio entre el Worker de IA y el servidor de archivos estáticos del Frontend.
- **Optimización de RAM:** Uso estratégico de 4GB de SWAP para absorber picos de procesamiento del modelo TTS.

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

1.  Clona el repositorio: `git clone https://github.com/danieljssg/ainfold-frontend`
2.  Instala dependencias: `pnpm install`
3.  Configura las variables de entorno en `.env.local`:
    ```env
    NEXT_PUBLIC_API_URL=https://tu-api.com/api
    ```
4.  Inicia el servidor de desarrollo: `pnpm dev`

---

> Desarrollado desde **Venezuela** por Daniel Saud. Porque contar historias que se escriben con código también es una forma de arte. 🇻🇪
