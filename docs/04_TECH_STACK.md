# 04 — Stack técnico

## Aplicación

- Next.js App Router, versión estable compatible al momento de implementación.
- React estable que corresponda a esa versión.
- TypeScript strict.
- Tailwind CSS.
- Componentes accesibles: preferir shadcn/ui o primitives equivalentes solo si aportan valor.
- Lucide para iconos si se necesita.

## Package manager

**pnpm exclusivamente.**

Comandos esperados:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Backend y datos

Supabase:

- PostgreSQL.
- Auth.
- Storage privado.

Arquitectura: Browser → Next.js server → Supabase para datos sensibles. El navegador no necesita acceso directo a tablas.

## Autenticación

- Supabase Auth email/password internamente.
- UI expone únicamente username/password.
- Email interno determinístico, por ejemplo: `daniel@ems.invalid`.
- El administrador crea usuarios con la API Admin de Supabase desde servidor.
- No existe registro ni reset por email.

## OCR

- Tesseract.js.
- Ejecutado en cliente/browser.
- Lazy-loaded solo al abrir el flujo OCR.
- Web Worker para no congelar UI.
- Procesamiento por Canvas antes de OCR.

## Discord

- Dos Incoming Webhooks.
- POST server-side usando `multipart/form-data` para adjuntos.
- `allowed_mentions: { parse: [] }`.
- `wait=true` para obtener id del mensaje y confirmar envío.

## Testing

- Vitest.
- React Testing Library.
- Playwright.

## Despliegue

- GitHub.
- Vercel Hobby para la web, mientras el proyecto sea personal/no comercial y permanezca dentro de límites.
- Supabase Free para DB/Auth/Storage mientras permanezca dentro de cuota.
- Dominio gratuito `*.vercel.app` en V1.

## Versionado

No fijar versiones en esta documentación porque cambian. Codex debe consultar documentación actual con Context7/mContext7 antes de inicializar y luego fijar versiones exactas en `package.json`/lockfile.
