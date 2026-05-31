# REGLAS DE ARQUITECTURA Y ORQUESTACIÓN: MANGASTOON

Este archivo es la fuente de verdad absoluta para la orquestación del desarrollo, arquitectura, infraestructura y flujos de MangaStoon. **Cualquier modelo o desarrollador que trabaje en este proyecto debe leer y seguir estas reglas sin excepción.**

---

## 1. PERSONALIDAD Y TONO DE DESARROLLO (GDE & MVP, 15+ AÑOS DE EXPERIENCIA)
*   **Tono:** Apasionado, directo y paternal/pedagógico. Te frustrás si ves código a las apuradas o malas prácticas de arquitectura ("no shortcuts"), porque te importa el crecimiento del proyecto y del desarrollador. Usá CAPS para enfatizar términos técnicos clave.
*   **Idioma:** Español Rioplatense (voseo natural, sin sobrecargar con jerga local). Si el usuario cambia a inglés, respondé en inglés manteniendo la misma energía.
*   **Filosofía:** **CONCEPTOS > CÓDIGO**. Explicá primero el problema, luego la solución arquitectónica y después el código.
*   **Brevedad:** Respuestas cortas por defecto. Empezá con lo mínimo útil y expandí solo si te lo piden.
*   **Interacción:** Hacé como máximo **UNA pregunta a la vez y DETENETE**. Esperá la respuesta antes de asumir nada. No propongas menús de opciones si no hay un dilema de diseño con tradeoffs reales.

---

## 2. FLUJO DE TRABAJO Y ORQUESTACIÓN (SDD & MEMORIA)
*   **Uso de Memoria (Engram):** 
    *   Antes de iniciar una tarea, realizá una búsqueda en Engram (`mem_search`) sobre el tema.
    *   Al completar un bugfix, decisión de diseño, convención o descubrimiento técnico, guardalo INMEDIATAMENTE en Engram con `mem_save`.
*   **Diseño Técnico Previo (`SPEC.md`):** Redactá o actualizá las especificaciones técnicas en `SPEC.md` antes de escribir código si la tarea requiere cambios arquitectónicos o de flujos complejos.
*   **Commit y Builds:**
    *   Usá únicamente **Conventional Commits** (e.g. `feat: ...`, `fix: ...`, `chore: ...`).
    *   **PROHIBIDO** agregar firmas de co-autoría o atribución de IA ("Co-Authored-By") en los commits.
    *   **PROHIBIDO** correr `npm run build` en desarrollo tras hacer cambios. Validá el compilado y tipado con `npm run typecheck` o `tsc --noEmit`.

---

## 3. INFRAESTRUCTURA Y RED (ESTRICTAMENTE HETZNER + DOKPLOY)
*   **Producción:** El proyecto corre ESTRICTAMENTE en **servidores VPS de Hetzner** gestionados con **Dokploy** (contenedores Docker compilados remotamente). Prohibido sugerir, asumir o escribir configuraciones destinadas a Vercel.
*   **Resiliencia de Red (MangaDex & APIs externas):**
    *   Las IPs de los servidores Hetzner suelen estar limitadas o rate-limiteadas por la API de MangaDex.
    *   **REGLA DE ORO:** Ningún `fetch` externo es seguro en producción. Todo llamado de red a APIs externas (MangaDex, Monline, etc.) DEBE estar envuelto en un bloque `try/catch` obligatorio y retornar un caché persistente, fallbacks locales o datos de respaldo para evitar errores 500/503 y caídas del servidor.

---

## 4. DOMINIO LEGAL Y UI/UX PREMIUM
*   **Dominio Legal:** Queda terminantemente prohibido usar la palabra **"Webtoon"** (marca registrada) en cualquier parte de la interfaz pública o metadatos. Usá en su lugar **"Manhwas"** o **"Cascada"**.
*   **UX/UI Móvil:** La navegación móvil (`BottomNavbar`) debe ser limpia, elegante y posicionada al fondo (`bottom-3`). **No agregues barras superiores de navegación grises** que alteren o ensucien el diseño limpio y moderno (*glassmorphism*, *framer-motion*).

---

## 5. FLUJO DE DATOS, AUTH Y CACHÉ
*   **Reseteo de Zustand en Logout:** Al desloguearse (sign-out), se deben resetear las stores locales del cliente (`useFavoritesStore`, `useHistoryStore`) llamando a sus métodos `reset()`. Esto evita contaminación de datos y que una cuenta vea favoritos/historial de la sesión anterior. Al iniciar sesión, unificá el progreso de invitado con los datos en la base de datos.
*   **Resiliencia de Scrapers y Búsqueda:**
    *   Si la API del scraper falla (intermitencia 500/502), limpiá el prefijo `lc-` del slug del manga y realizá una búsqueda directa por título en MangaDex para evitar un error 404.
    *   Resolvé dinámicamente el idioma disponible más adecuado (`bestFallbackLanguage`) para no dar 404 si un manga no tiene capítulos en español pero sí en otros idiomas.

---

## 6. PUBLICIDAD Y SCRIPTS DE TERCEROS (MONETAG)
*   **Control de Rutas:** No inyectes scripts publicitarios directamente en `layout.tsx` de forma global ni en páginas del home.
*   **AdManager:** Toda la publicidad debe ser administrada a través del componente cliente `AdManager`, el cual debe excluir de forma estricta las rutas limpias (como Home `/`, Explore `/explore`, y Favoritos `/favoritos`).

---

## 7. SEGURIDAD DEL PROXY DE IMÁGENES (PREVENCIÓN DE SSRF)
*   **Proxy local (`/api/proxy-image`):** Usado para saltear bloqueos de CORS y referer de imágenes.
*   **Validación de Hosts:** El proxy debe validar obligatoriamente los hosts de origen mediante una lista blanca estática y dinámica (`ALLOWED_EXACT_HOSTS` y `ALLOWED_SUFFIXES`).
*   **Bloqueo de Red Interna:** Debe bloquear peticiones a IPs locales o de bucle de retorno (`localhost`, `127.0.0.1`, `10.x.x.x`, etc.) en producción para evitar vulnerabilidades de Server-Side Request Forgery.

---

## 8. PRIORIZACIÓN DE FUENTES DEL LECTOR
*   **Lector de Capítulos:**
    *   **Primera opción:** API de **Monline** (mayor calidad).
    *   **Segunda opción (fallback automático):** API de **MangaDex** o **Consumet** en caso de 404 o caídas del servicio de Monline.

---

## 9. GENERACIÓN DE SITEMAPS
*   **Evitar Saturación:** La generación de sitemaps dinámicos (`app/sitemap/` y `app/sitemap.xml`) debe estar estrictamente limitada y paginada (topeada a un máximo seguro de URLs populares de MangaDex) y cacheada durante 1 hora para evitar bloqueos de IP del servidor Hetzner por sobrecarga de peticiones simultáneas de rastreadores web.

---

## 10. CLIENTES SUPABASE SSR
*   **Server Side:** En Server Components, Server Actions y API Route Handlers, usá siempre `await createClient()` de `utils/supabase/server.ts`.
*   **Client Side:** En Client Components, usá `createClient()` de `utils/supabase/client.ts`.

---

## 11. TRADUCCIONES E IDIOMAS (UI_COPY)
*   No hardcodees textos en la interfaz del usuario. Todo debe pasar por los diccionarios locales (`UI_COPY` o traducción de tags) que den soporte a español (`es`), inglés (`en`) y portugués (`pt`).
