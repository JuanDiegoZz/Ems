# 20 — Checklist de handoff / configuración del dueño

Codex puede construir el repo, pero para producción harán falta valores externos.

## El dueño debe crear/proporcionar

- [ ] Cuenta/proyecto Supabase Free.
- [ ] Cuenta/proyecto Vercel Hobby.
- [ ] Repo GitHub si se usará CI/CD.
- [ ] Webhook Discord Civil.
- [ ] Webhook Discord Policial.
- [ ] Nombre final visible de la aplicación.
- [ ] Icono/logo opcional.

## Secretos que NO se pegan en chats públicos o repo

- [ ] Supabase secret/service key.
- [ ] Discord webhook Civil.
- [ ] Discord webhook Policial.

Guardarlos directamente en `.env.local` durante desarrollo y en Vercel Environment Variables para producción.

## Antes de deploy real

- [ ] Confirmar `APP_TIMEZONE`.
- [ ] Confirmar presets de cantidad.
- [ ] Confirmar significado de `10x10` si ya se conoce.
- [ ] Probar INE RP de varios jugadores para ajustar OCR.
- [ ] Probar foto de placa.
- [ ] Confirmar nombres exactos de canales/webhooks.

## Cuenta inicial

Crear primer admin y guardar credenciales en un lugar privado del dueño.

Ejemplo visual, no usar literalmente:

```text
Usuario: daniel
Contraseña: una-clave-distinta-a-123
```

## Prueba con compañeros

Antes de abrirlo a todos:

- admin,
- 1 EMS adicional,
- 2 civiles,
- 1 policía,
- probar desde un teléfono y una PC diferentes.
