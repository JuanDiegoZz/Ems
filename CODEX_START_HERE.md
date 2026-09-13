# Codex — START HERE

Lee `AGENTS.md` y todos los documentos de `docs/` antes de programar.

## Misión

Construye la V1 del sistema descrito en este repositorio de manera incremental, verificable y desplegable gratuitamente para un uso de hobby en un servidor de FiveM.

## Primera ejecución esperada

1. Inspecciona el repositorio.
2. Lee las skills disponibles y sus instrucciones, especialmente Serena, mContext7/Context7, DevTools, Chrome/browser tooling y Superpowers/Ponytail/Caveman si existen.
3. Confirma la versión estable compatible de Next.js, React, Supabase JS, `@supabase/ssr`, Tesseract.js, Tailwind y Playwright usando documentación actual.
4. Inicializa el proyecto con pnpm.
5. Implementa la Fase 0 y Fase 1 del plan.
6. Ejecuta lint, types, tests y build.
7. Continúa fase por fase sin saltarte criterios de aceptación.

## Preferencias de implementación

- TypeScript estricto.
- Nombres de código en inglés; textos de interfaz en español.
- Componentes accesibles y mobile-first.
- CSS limpio; evitar efectos visuales pesados.
- Tema profesional de hospital/EMS, claro y legible.
- Evitar una estética “gaming dashboard” saturada.

## No bloquear por datos que faltan

Hay una ambigüedad intencional documentada en `docs/19_ASSUMPTIONS_AND_DECISIONS.md`: el significado exacto de valores como `10x10` y `40x40`.

En V1, modelar esto como `quantityLabel` (texto corto validado) con presets configurables (`10x10`, `20x20`, `40x40`) para no acoplar el esquema a una interpretación todavía no confirmada.

## Definición práctica de éxito

Desde un teléfono:

1. Usuario inicia sesión.
2. Toca **Kit Civil**.
3. Busca a una persona existente.
4. Elige `10x10`.
5. Envía.
6. El registro queda en historial y Discord recibe la plantilla junto con la INE.

Y para persona nueva:

1. No aparece en búsqueda.
2. Toca registrar.
3. Selecciona/toma foto de INE.
4. OCR propone nombre/apellido.
5. Usuario confirma.
6. Guarda.
7. Envía kit.

No considerar V1 lista hasta que ambos recorridos funcionen de extremo a extremo.
