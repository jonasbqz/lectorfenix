# LectorFenix

MVP de lectura y exploracion de mangas construido con Next.js App Router, React, Tailwind CSS y MangaDex.

## Desarrollo

```bash
npm install
npm run dev
```

## Variables de entorno

Crea un archivo `.env.local` usando `.env.example` como base:

```bash
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

Esta URL se usa para `metadataBase`, `robots.txt` y `sitemap.xml`.

## Verificacion antes de produccion

```bash
npm run check
```

Este comando ejecuta TypeScript y luego el build de Next.js.

## Auditoria de dependencias

```bash
npm audit --audit-level=moderate
```

Actualmente npm puede reportar una vulnerabilidad moderada heredada de `next@16.2.4` por su dependencia interna de `postcss`. No ejecutes `npm audit fix --force`: npm propone bajar Next a una version antigua y romperia el proyecto. Actualiza Next cuando exista una version estable superior con el parche.

## Produccion

```bash
npm run build
npm run start
```

Nota: despues de cambiar `next.config.mjs` o variables de entorno, reinicia el servidor de desarrollo.
