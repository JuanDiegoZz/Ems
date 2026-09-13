# 12 — Testing y QA

## Estrategia

Probar más fuerte lo que puede causar duplicados, pérdidas o mensajes incorrectos.

## Unit tests

Obligatorios para:

- `normalizeUsername`.
- `toInternalEmail`.
- `normalizePersonName`.
- parser OCR de `NOMBRE`/`APELLIDO`.
- `normalizeQuantityLabel`.
- formatter de fecha por timezone.
- builder de mensaje Civil.
- builder de mensaje Policial.
- sanitización/allowed mentions.

## Integration tests

- Crear persona válida.
- Bloquear persona policial sin placa.
- Duplicado de `clientRequestId` devuelve misma entrega.
- Usuario desactivado no puede mutar.
- EMS no puede usar endpoint admin.
- Discord failure marca `failed`.
- Retry cambia a `sent` sin duplicar registro.

Mockear Discord en tests, nunca usar webhook real.

## E2E Playwright

### E2E 1 — Civil existente

- Login.
- Kit Civil.
- Buscar persona.
- Elegir `10x10`.
- Enviar.
- Ver éxito.
- Historial contiene entrega.

### E2E 2 — Civil nuevo

- Login.
- No existe.
- Subir fixture sintético de INE.
- Mock OCR o capa determinística en test.
- Confirmar nombre.
- Guardar.
- Enviar.

### E2E 3 — Policía

- Buscar por placa.
- Registrar kit.
- Ver estado enviado.

### E2E 4 — Webhook falla

- Simular fallo.
- UI muestra guardado/no enviado.
- Reintentar.
- Confirmar un solo registro.

### E2E 5 — Permisos

- EMS intenta `/admin`.
- Debe recibir redirect/403.

## Responsive manual

Chrome/browser tooling:

- 360x800.
- 390x844.
- tablet ~768.
- desktop 1366x768.
- desktop ultrawide opcional.

Verificar:

- ningún CTA fuera de pantalla,
- teclado móvil no tapa botones,
- buscador usable,
- cámara/file picker,
- OCR no congela UI,
- modales accesibles.

## DevTools

Revisar:

- cero errores de consola.
- requests sin secretos.
- imágenes comprimidas.
- no hay llamadas a Discord desde browser.
- cookies con flags correctos en producción.
- Lighthouse/PWA como orientación, sin perseguir puntuaciones a costa de UX.

## Gate de release

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Debe pasar antes de producción.
