# AGENTS.md — Instrucciones obligatorias para agentes

Este archivo contiene reglas de implementación para Codex y cualquier agente auxiliar.

## Objetivo

Construir una aplicación EMS para FiveM que sea rápida, confiable, móvil y fácil de entender. La velocidad del flujo de entrega es más importante que añadir funciones secundarias.

## Reglas no negociables

- Usar **pnpm**. No usar npm ni yarn.
- Usar TypeScript en modo estricto.
- No introducir servicios de pago en V1.
- No exponer secretos en variables `NEXT_PUBLIC_*`.
- No poner URLs de Discord Webhook en código cliente, HTML, bundle o base de datos accesible al navegador.
- No crear registro público.
- No crear recuperación de contraseña por email.
- No permitir que una acción peligrosa dependa solo de ocultar un botón en UI; validar permisos en servidor.
- No hacer públicas las INE ni placas en Supabase Storage.
- No confiar automáticamente en OCR: siempre mostrar datos detectados para confirmación.
- No guardar imágenes originales gigantes si pueden comprimirse localmente primero.
- No duplicar una persona sin antes ejecutar comprobación de duplicados.
- No enviar dos mensajes de Discord por un doble clic o reintento accidental: implementar idempotencia.
- Almacenar timestamps en UTC; mostrar fechas con `APP_TIMEZONE`.
- Preservar el historial cuando se desactive un usuario o archive una persona.
- Mantener V1 enfocada: no construir funciones listadas como fuera de alcance.

## Arquitectura preferida

- Next.js App Router.
- Server Components cuando no haya interacción.
- Client Components solo donde haga falta: OCR, cámara/subida, búsqueda interactiva y controles de cantidad.
- Route Handlers / Server Actions para lógica sensible.
- Supabase Auth para sesiones y hashing de contraseña.
- Supabase PostgreSQL para datos.
- Supabase Storage privado para documentos.
- Tesseract.js ejecutado en el navegador y cargado de forma lazy.
- Webhooks de Discord ejecutados solo desde servidor.

## Política de dependencias

Antes de añadir una dependencia:

1. Comprobar si la plataforma o una dependencia ya instalada resuelve el problema.
2. Consultar documentación actual usando Context7/mContext7 cuando esté disponible.
3. Elegir librerías mantenidas y con buen soporte de TypeScript.
4. Evitar dependencias para utilidades triviales.
5. Registrar decisiones relevantes en `docs/19_ASSUMPTIONS_AND_DECISIONS.md` si cambian arquitectura o alcance.

## Calidad mínima antes de considerar una fase completa

Ejecutar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para cambios de UI/flujo crítico, ejecutar también pruebas E2E relevantes y validación manual en navegador móvil y desktop.

## Uso de skills/herramientas

El proyecto espera el uso de las herramientas disponibles indicadas por el dueño: Serena, DevTools, pnpm, Chrome DevTools/browser tooling, mContext7/Context7 y Superpowers/Ponytail/Caveman.

Regla: **leer primero las instrucciones reales de cada skill instalada**. No inferir capacidades por el nombre. Si una skill no está disponible, continuar con las herramientas estándar del entorno sin cambiar la arquitectura.

## Forma de trabajar

- Implementar por fases de `docs/15_DEVELOPMENT_PLAN.md`.
- Evitar grandes reescrituras sin necesidad.
- Mantener cambios pequeños y verificables.
- Antes de tocar una zona existente, usar Serena o navegación semántica equivalente para entender símbolos y referencias.
- Antes de usar APIs con versiones cambiantes, consultar Context7/documentación actual.
- Usar Chrome DevTools/browser tooling para comprobar responsive, errores, red, cookies y PWA.
- Después de cada fase, actualizar `README.md` solo si cambió el comportamiento real.

## UX

Si un EMS necesita pensar dónde hacer clic, el diseño todavía no está terminado. La pantalla principal debe priorizar acciones, no métricas.

Objetivo de interacción:

- Persona existente: máximo 3 decisiones principales.
- Persona nueva: carga de documento + confirmación + cantidad + envío.
- Botones táctiles de mínimo ~44 px de alto.
- No bloquear con modales innecesarios.
- Mostrar estados claros: procesando OCR, guardando, enviando a Discord, enviado, error y reintentar.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
