# Despliegue Vercel + Supabase

1. Crear un proyecto Supabase y aplicar `supabase/migrations/20260913000000_phase_1_schema.sql`.
2. Confirmar que `rp-documents` sea privado y conserve sus límites MIME/tamaño.
3. Configurar en Vercel las variables de `.env.example`: `NEXT_PUBLIC_*` son públicas; `SUPABASE_SECRET_KEY` y `DISCORD_WEBHOOK_*` son exclusivamente server-side.
4. Mantener `APP_TIMEZONE=America/Monterrey` y `NEXT_PUBLIC_OCR_DEBUG=false`.
5. Crear el primer administrador con `pnpm admin:create usuario "Nombre RP" "contraseña"` en un entorno seguro.
6. Ejecutar el deploy con `pnpm build`.
7. Smoke test: `/api/health`, login, `/`, `/people`, una entrega con webhooks de prueba y `/history`.

No subir identificaciones ni datos personales reales. Nunca colocar webhooks o `SUPABASE_SECRET_KEY` en variables `NEXT_PUBLIC_*`.
