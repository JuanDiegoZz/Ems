# 15 — Plan de desarrollo

No intentar implementar todo en un solo cambio.

## Fase 0 — Scaffold

- Inicializar Next.js + TS + pnpm.
- Tailwind.
- ESLint.
- Typecheck script.
- Vitest + Testing Library.
- Playwright.
- Estructura base.
- `.env.example`.
- Página placeholder responsive.

**Aceptación:** lint/typecheck/test/build pasan.

## Fase 1 — Supabase + esquema

- Config clientes server/auth.
- Migraciones: enums, profiles, people, deliveries.
- RLS habilitado y grants cerrados según arquitectura server-only.
- Bucket privado `rp-documents` documentado/automatizado cuando sea posible.
- Helpers de normalización.

**Aceptación:** migraciones reproducibles desde limpio.

## Fase 2 — Auth + admin bootstrap

- Login username/password.
- Logout.
- `requireActiveProfile`.
- Guard de rutas.
- `pnpm admin:create` o herramienta equivalente.
- Panel Personal EMS.
- Crear, resetear, desactivar, activar.

**Aceptación:** usuario desactivado no puede seguir usando operaciones protegidas.

## Fase 3 — Shell UX/PWA

- Layout móvil/desktop.
- Inicio.
- Navegación.
- Manifest.
- Service worker sin cache sensible.
- Estados de carga/error básicos.

**Aceptación:** usable 360 px y desktop.

## Fase 4 — Personas + documentos

- Buscar personas.
- Crear civil.
- Crear policía.
- Upload privado.
- Ver documento con URL firmada corta/proxy.
- Admin editar/archivar.
- Duplicados básicos.

**Aceptación:** dos dispositivos ven la misma persona recién creada al consultar de nuevo.

## Fase 5 — OCR

- Lazy-load Tesseract.js.
- Preprocesamiento/compresión.
- Parser de labels.
- Confirmación manual.
- Integrar al alta de civil/policía.
- Fixtures sintéticos para tests.

**Aceptación:** OCR fallido nunca impide registro manual.

## Fase 6 — Entregas + Discord

- Builder Civil.
- Builder Policial.
- Multipart attachments.
- `wait=true`.
- Idempotencia `clientRequestId`.
- Estados pending/sent/failed.
- Reintento manual.

**Aceptación:** doble submit no duplica Discord/DB en condiciones normales; fallo queda recuperable.

## Fase 7 — Historial

- Historial general.
- Perfil de persona.
- Filtros civil/police.
- Búsqueda.
- Paginación.
- Mostrar estado de Discord.

**Aceptación:** historial conserva nombre del EMS aunque su cuenta esté desactivada.

## Fase 8 — Hardening/QA

- Validación central.
- Revisar permisos.
- Revisar errores/logs.
- Playwright completo.
- Responsive real.
- Probar cámara/file picker.
- Verificar bundle OCR lazy.

## Fase 9 — Deploy

- Supabase producción.
- Vercel.
- Env vars.
- Webhooks reales.
- Primer admin.
- Smoke test.
- Documentar URL y operación básica.

## Regla de parada

Al terminar Fase 9, no iniciar roadmap V2 sin aprobación del dueño.
