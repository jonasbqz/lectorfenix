# ESPECIFICACIÓN TÉCNICA (SPEC.md) - MEJORAS DE DOMINIO, OPTIMIZACIÓN Y SEGURIDAD

Este documento detalla los cambios planificados para mejorar el flujo de MangaStoon, resolver violaciones de marca de dominio ("Webtoon"), optimizar el UI/UX y documentar flujos de despliegue eficientes.

---

## 1. Regla de Dominio (Eliminación de la palabra "Webtoon")

Para evitar problemas legales de marcas registradas, el término **"Webtoon"** queda estrictamente prohibido en áreas públicas de MangaStoon. Se reemplazará por **"Manhwas"** o **"Cascada"**.

### Archivos Afectados y Modificaciones:

#### [MODIFY] [reader-client.tsx](file:///c:/Users/josel/Documents/New%20project/mangastoon/app/comics/%5Bslug%5D/chapters/%5Bid%5D/reader-client.tsx)
- Reemplazar las traducciones de la preferencia de lectura vertical:
  - **Español (es):** `"Modo Vertical (Webtoon)"` $\rightarrow$ `"Modo Vertical (Manhwas)"`
  - **Inglés (en):** `"Vertical Mode (Webtoon)"` $\rightarrow$ `"Vertical Mode (Manhwas)"`
  - **Portugués (pt):** `"Modo Vertical (Webtoon)"` $\rightarrow$ `"Modo Vertical (Manhwas)"`

#### [MODIFY] [ProfileForm.tsx](file:///c:/Users/josel/Documents/New%20project/mangastoon/app/profile/ProfileForm.tsx)
- Reemplazar las traducciones de visualización de perfil en las preferencias de lectura por defecto:
  - **Español (es):** `cascadeWebtoon: "Cascada / Webtoon"` $\rightarrow$ `cascadeWebtoon: "Cascada / Manhwas"`
  - **Inglés (en):** `cascadeWebtoon: "Cascade / Webtoon"` $\rightarrow$ `cascadeWebtoon: "Cascade / Manhwas"`
  - **Portugués (pt):** `cascadeWebtoon: "Cascata / Webtoon"` $\rightarrow$ `cascadeWebtoon: "Cascata / Manhwas"`

#### [MODIFY] [tagTranslations.ts](file:///c:/Users/josel/Documents/New%20project/mangastoon/app/utils/tagTranslations.ts)
- Cambiar la traducción de la etiqueta `"Long Strip"` (el formato oficial de cómic en cascada vertical):
  - `es: "Webtoon"` $\rightarrow$ `es: "Manhwas"`
  - `pt: "Webtoon"` $\rightarrow$ `pt: "Manhwas"`

---

## 2. Optimización y Seguridad (UI/UX & Auditoría)

- **UI/UX Móvil:** 
  - La navegación flotante `BottomNavbar` se encuentra perfectamente posicionada en el fondo (`bottom-3 left-1/2 -translate-x-1/2`). Es minimalista, moderna y premium con efecto *glassmorphism* y animaciones de `framer-motion`.
  - Se valida que **no se incluyan barras de navegación superiores grises** en ningún dispositivo móvil para evitar romper el diseño original.
- **Auditoría de Inyección XSS:**
  - Se analizó el uso de `dangerouslySetInnerHTML` en `search-results-content.tsx` (línea 477). Se confirmó que el valor de la variable `matchedName` no proviene directamente de la entrada de búsqueda de usuario no sanitizada, sino que es mapeado desde una lista estática de palabras clave (`POPULAR_MANGAS_KEYWORDS`), garantizando inmunidad a inyecciones.
- **Auditoría de SSRF (Server-Side Request Forgery):**
  - La ruta `/api/proxy-image` está protegida mediante una lista estática y dinámica de dominios permitidos (`ALLOWED_EXACT_HOSTS` y `ALLOWED_SUFFIXES`). Bloquea direcciones IP locales y de bucle de retorno (`localhost` / `127.0.0.1`) en producción, previniendo ataques a la red interna del servidor.

---

## 3. Infraestructura y Despliegue Automatizado (Hetzner + Dokploy)

Para mantener control absoluto de costos y evitar limitaciones de proxies en plataformas serverless, la infraestructura de producción corre ESTRICTAMENTE en **servidores VPS de Hetzner** gestionados con **Dokploy**.

### Arquitectura de Despliegue:
1. **GitHub Webhooks / GitHub Actions -> Dokploy:**
   - Cada commit en la rama `main` dispara un webhook automático hacia Dokploy.
   - Dokploy compila el contenedor Docker de Next.js de manera remota en el servidor, evitando sobrecargar las computadoras de desarrollo.
2. **Proxy Inverso y SSL:**
   - Traefik (integrado en Dokploy) maneja el ruteo, terminación SSL automática y balanceo de carga.
3. **Resiliencia de Red ante Rate-Limits (MangaDex):**
   - Dado que los servidores VPS de Hetzner comparten rangos de IP propensos a bloqueos o rate-limiting por parte de la API de MangaDex, se implementa una política estricta de try/catch en todas las llamadas de red, fallback hacia la base de datos o APIs alternativas (como Consumet/Monline), y caché en memoria para reducir peticiones concurrentes. No se deben desplegar proxies que no cuenten con estas salvaguardas.

---

## 4. Plan de Ejecución y Pruebas

1. Aplicar los cambios en `reader-client.tsx`, `ProfileForm.tsx` y `tagTranslations.ts`.
2. Verificar estáticamente que el proyecto compila correctamente sin la palabra "Webtoon" en las interfaces.
3. Guardar las decisiones en el registro de Engram (`mem_save`).
