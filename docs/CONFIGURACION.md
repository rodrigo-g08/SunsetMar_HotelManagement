# Configuración

## 1. Supabase

1. Cree un proyecto en https://supabase.com (región sugerida: São Paulo, la más cercana a Lima).
2. En **SQL Editor**, ejecute los archivos de `supabase/migrations/` **en orden numérico**, uno por uno. Cada hito agrega un archivo nuevo; ejecute solo los que aún no haya corrido.
3. En **Authentication › Users › Add user**, cree la cuenta única de recepción (correo y contraseña). Marque *Auto Confirm User*.
4. En **Authentication › Sign In / Providers**, desactive *Allow new users to sign up* para que nadie más pueda crear cuentas.
5. En **Project Settings › API**, copie *Project URL* y la clave *anon public*.

> La clave `service_role` nunca va en el frontend ni en el repositorio.

## 2. Variables locales

Cree `.env.local` (no se sube a GitHub) a partir de `.env.example`:

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## 3. Cloudflare Pages

1. **Workers & Pages › Create › Pages › Connect to Git** y elija este repositorio.
2. Framework preset: *Vite*. Build command: `npm run build`. Output directory: `dist`.
3. **Settings › Environment variables**: agregue `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `NODE_VERSION = 22`.
4. Cada `git push` a `main` publica una nueva versión. El archivo `public/_redirects` permite recargar cualquier ruta del panel.
5. En Supabase › Authentication › URL Configuration, ponga la dirección de Cloudflare (`https://<proyecto>.pages.dev`) como *Site URL*.

## 4. Respaldos nocturnos

El plan gratuito de Supabase no guarda copias automáticas. El flujo `.github/workflows/respaldo-bd.yml` hace una copia cifrada cada noche a las 03:00.

1. En Supabase › **Project Settings › Database › Connection string**, copie la cadena *Session pooler* con la contraseña de la base.
2. En GitHub › **Settings › Secrets and variables › Actions**, cree:
   - `SUPABASE_DB_URL`: la cadena anterior.
   - `BACKUP_PASSPHRASE`: una frase larga. Guárdela fuera de GitHub; sin ella no se puede abrir el respaldo.
3. Pruebe en **Actions › Respaldo diario › Run workflow**. El archivo queda como artefacto durante 30 días.

Para restaurar: `gpg -d respaldo.sql.gz.gpg | gunzip > respaldo.sql` y ejecute el SQL en un proyecto vacío.

> **Importante:** mientras el repositorio sea público, cualquiera puede ver el código (no los datos). Los respaldos van cifrados, pero se recomienda volver el repositorio **privado** en *Settings › General › Danger Zone*.

## 5. Protección de datos personales

El panel guarda DNI, fecha de nacimiento y dirección de huéspedes, por lo que aplica la Ley N.° 29733. El hotel debe revisar con la ANPD si corresponde inscribir el banco de datos. El CSV con datos personales solo debe guardarse en equipos con acceso restringido.
