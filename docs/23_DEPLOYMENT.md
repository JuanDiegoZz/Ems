# Despliegue Vercel + Supabase

1. Crear/verificar el proyecto Supabase y seguir el runbook manual de [`docs/24_STAFF_DISCIPLINE_AND_BONUSES.md`](24_STAFF_DISCIPLINE_AND_BONUSES.md). Las migraciones de Staff se ejecutan en el orden indicado allí desde SQL Editor; no usar `supabase link` ni `db push` como sustituto.
2. Confirmar que `rp-documents` sea privado y conserve sus límites MIME/tamaño.
3. Configurar en Vercel todas las variables de [`docs/14_ENVIRONMENT.md`](14_ENVIRONMENT.md): `NEXT_PUBLIC_*` son públicas; `SUPABASE_SECRET_KEY`, `DISCORD_WEBHOOK_*` y `EMS_WEBHOOK_ENCRYPTION_KEY` son exclusivamente server-side.
4. Mantener `APP_TIMEZONE=America/Monterrey` y `NEXT_PUBLIC_OCR_DEBUG=false`.
5. Crear el primer administrador con `pnpm admin:create usuario "Nombre RP" "contraseña"` en un entorno seguro.
6. Ejecutar el deploy con `pnpm build`.
7. Smoke test: `/api/health`, login, `/`, `/people`, una entrega con webhooks de prueba y `/history`.

Staff Discipline + Weekly Bonuses requiere además smoke de Personal EMS, disciplina/permisos, simulación, review, override, finalización e histórico. Producción no se modifica como parte de la validación local.

No subir identificaciones ni datos personales reales. Nunca colocar webhooks o `SUPABASE_SECRET_KEY` en variables `NEXT_PUBLIC_*`.
