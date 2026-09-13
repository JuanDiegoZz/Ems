# 19 — Supuestos y decisiones

Documento vivo. Cambios importantes deben anotarse aquí.

## D-001 — Dos webhooks

**Decisión:** uno Civil y uno Policial.

Razón: canales/plantillas/adjuntos distintos.

## D-002 — Supabase en vez de MongoDB

**Decisión:** PostgreSQL + Auth + Storage de Supabase.

Razón: un solo proveedor resuelve relaciones, sesiones y archivos; menos piezas para V1.

## D-003 — Next.js + Vercel

**Decisión:** Next.js App Router desplegado en Vercel.

Razón: frontend y lógica server-side en el mismo repo y despliegue sencillo.

## D-004 — OCR local

**Decisión:** Tesseract.js en browser.

Razón: costo $0 por escaneo y la INE RP tiene diseño bastante uniforme.

## D-005 — Confirmación OCR obligatoria

**Decisión:** nunca guardar automáticamente sin revisión.

Razón: un error pequeño ensucia la base compartida.

## D-006 — Storage privado

**Decisión:** INE/placa no públicas.

Razón: aunque sea RP, no hay razón para exponer imágenes a Internet.

## D-007 — Username sin registro

**Decisión:** admin crea cuentas. Supabase Auth usa email interno derivado.

Razón: mantener UX solicitada sin reinventar seguridad de passwords.

## D-008 — Username inmutable V1

Razón: evita problemas con el email interno derivado.

Admin puede modificar nombre RP y rol.

## D-009 — Cantidad `10x10`

**Estado: significado exacto por confirmar.**

Ejemplos actuales: `10x10`, `40x40`.

No asumir si significa:

- cantidad x cantidad,
- vendajes x pastillas,
- tamaño,
- otro convenio interno.

**Decisión temporal V1:** almacenar `quantityLabel` como texto corto normalizado y ofrecer presets. Así no se necesita migración cuando el dueño aclare el significado.

## D-010 — Hora

La app guarda timestamp completo. Discord V1 muestra solo fecha para coincidir con las plantillas actuales. Historial sí muestra hora. Si el dueño quiere hora en Discord, es un cambio de formatter, no de DB.

## D-011 — Sin realtime inicialmente

Búsquedas consultan el servidor y ven nuevos datos de cualquier ciudad/dispositivo. No usar Supabase Realtime en V1 porque no aporta valor suficiente.

## D-012 — Sin dominio pagado

Usar `*.vercel.app` inicialmente.
