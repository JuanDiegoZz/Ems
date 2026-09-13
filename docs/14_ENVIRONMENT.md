# 14 — Variables de entorno

Crear `.env.example` durante implementación, sin secretos reales.

## Variables propuestas

```bash
# App
APP_TIMEZONE=America/Monterrey
INTERNAL_AUTH_DOMAIN=ems.invalid
NEXT_PUBLIC_APP_NAME="EMS Hospital"

# Supabase - browser safe
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Supabase - server
SUPABASE_SECRET_KEY=

# Discord - server only
DISCORD_WEBHOOK_CIVIL=
DISCORD_WEBHOOK_POLICE=
```

## Reglas

- `SUPABASE_SECRET_KEY` jamás `NEXT_PUBLIC_*`.
- Webhooks jamás `NEXT_PUBLIC_*`.
- En Vercel, configurar Production/Preview según necesidad.
- No copiar `.env.local` al repo.

## Compatibilidad de nomenclatura Supabase

Supabase ha evolucionado nombres de claves (anon/publishable y service_role/secret). Codex debe consultar la documentación actual antes de implementar.

La intención es:

- una clave pública/publishable para operaciones de Auth SSR donde corresponda,
- una clave secreta de servidor con privilegios administrativos para operaciones confiables.

## Zona horaria

Guardar UTC en DB. `APP_TIMEZONE` define presentación de fecha del servidor RP.

No usar la zona horaria del dispositivo para construir el texto de Discord, porque jugadores pueden estar en ciudades/países distintos.
