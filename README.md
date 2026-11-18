# Sunset Mar · Panel de recepción

Panel interno para la recepción del Hotel Sunset Mar (Miraflores, Lima): reservas, habitaciones, huéspedes y caja por turno.

| Capa | Tecnología |
|---|---|
| Interfaz | React 19 + Vite + TypeScript + Tailwind CSS 4 |
| Datos y acceso | Supabase (PostgreSQL + Auth) |
| Hosting | Cloudflare Pages |
| Respaldos | GitHub Actions, cifrados con AES-256 |

## Estructura

```
src/
  dto/            Tipos de datos que viajan entre capas (sin lógica)
  repositories/   Acceso a Supabase: consultas y llamadas RPC, sin reglas de negocio
  services/       Reglas de negocio y orquestación (precios, validaciones, cálculos)
  features/       Pantallas por módulo (auth, inicio, reservas, estadías, habitaciones, caja)
  components/     UI reutilizable (ui/) y estructura de la aplicación (layout/)
  context/        Sesión de Supabase y turno activo
  lib/            Utilidades: cliente Supabase, formatos, hora de Lima, CSV
supabase/
  migrations/     SQL en orden numérico (esquema, funciones, seguridad y datos iniciales)
docs/             Configuración, despliegue y guía de uso
```

Las reglas críticas viven en la base de datos (cruces de horario, cobro total, transiciones de estado, cuadre de caja) para que se cumplan aunque haya dos pestañas abiertas o falle la red a mitad de una operación.

## Puesta en marcha local

```powershell
npm install
copy .env.example .env.local   # complete URL y anon key de Supabase
npm run dev
```

La configuración completa de Supabase, Cloudflare y los respaldos está en [docs/CONFIGURACION.md](docs/CONFIGURACION.md).

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor local en http://localhost:5173 |
| `npm run build` | Verificación de tipos y compilación a `dist/` |
| `npm test` | Pruebas de reglas de negocio |
