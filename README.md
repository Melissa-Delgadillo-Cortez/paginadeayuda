# LBC — Página de Ayuda

Base de conocimiento interna de LBC Seguros: procedimientos, pólizas e
instructivos con búsqueda instantánea. Acceso solo con login.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4)
- **Supabase** (Auth + Postgres + Row Level Security)
- **Vercel** (hosting)

## Roles

| Rol | Permisos |
|---|---|
| `user` | Leer y buscar artículos |
| `admin` | Todo lo anterior + crear/editar/eliminar artículos y gestionar usuarios |

## Seguridad

- Sesiones con cookies httpOnly/secure (Supabase Auth)
- Row Level Security: escritura de artículos y gestión de perfiles solo para admin, a nivel de base de datos
- Todo el contenido (texto e imágenes `/media/*`) requiere sesión
- HTML de artículos sanitizado en guardado y renderizado (`sanitize-html`)
- Headers de seguridad: CSP, HSTS, X-Frame-Options, etc.
- Contraseñas mín. 10 caracteres; rate limiting de login por Supabase

## Desarrollo local

```bash
npm install
cp env.example .env.local          # completar claves de Supabase
npm run dev
```

## Setup de base de datos (una sola vez)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. En **SQL Editor**, ejecutar `supabase/migrations/0001_init.sql`
3. Copiar las claves a `.env.local`
4. Importar contenido y crear el primer admin:

```bash
node scripts/seed.mjs
```

## Reimportar el documento Word

```powershell
Copy-Item "PAGINA DE AYUDA..docx" doc.zip
Expand-Archive doc.zip extracted
node scripts/import-docx.mjs extracted
node scripts/seed.mjs
```

## Deploy en Vercel

1. Subir el repo a GitHub
2. En vercel.com: **Import Project** → seleccionar el repo
3. Agregar las env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
4. Deploy
