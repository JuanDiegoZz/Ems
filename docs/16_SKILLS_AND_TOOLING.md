# 16 — Skills y tooling para Codex

El dueño quiere aprovechar Serena, DevTools, pnpm, Chrome DevTools/browser tooling, mContext7/Context7 y Superpowers/Ponytail/Caveman.

## Regla principal

Las skills son herramientas de ejecución, no dependencias del producto.

Antes de usarlas, leer su `SKILL.md`, README o instrucciones reales disponibles en el entorno. No asumir que un nombre implica una función concreta.

## Serena

Uso esperado si está disponible:

- navegación semántica del repo,
- localizar símbolos/referencias,
- entender impacto antes de modificar,
- cambios quirúrgicos en vez de reemplazar archivos completos.

Usarla especialmente después de que el proyecto ya tenga varias capas.

Fallback: ripgrep, búsqueda del editor, TypeScript language service.

## DevTools

Usar para:

- inspección de errores runtime,
- trazas,
- debugging de requests,
- revisar errores de server/client boundary.

Nunca pegar secretos en salidas compartidas.

## pnpm

Obligatorio.

- Instalar deps con `pnpm add` / `pnpm add -D`.
- Ejecutar binarios con `pnpm exec`.
- Mantener `pnpm-lock.yaml`.
- No generar `package-lock.json` ni `yarn.lock`.

## Chrome DevTools / browser tooling

Obligatorio para validar UX:

- device emulation,
- Network,
- Console,
- Application → manifest/service worker/storage,
- cookies,
- performance del OCR,
- comprobar que Discord webhook no aparece en requests del browser.

## mContext7 / Context7

Usarlo antes de implementar APIs susceptibles a cambios:

- Next.js App Router,
- Supabase SSR/Auth/Admin,
- Supabase Storage signed uploads/URLs,
- Tesseract.js,
- Playwright,
- PWA si se añade helper externo.

Objetivo: evitar código basado en APIs antiguas.

## Superpowers / Ponytail / Caveman

Si están instaladas:

- leer instrucciones de cada una,
- emplearlas cuando sus workflows ayuden a planificar, implementar, revisar o simplificar,
- no dejar que una skill expanda el alcance de producto,
- no saltarse tests ni criterios de aceptación por seguir un workflow automático.

## Secuencia recomendada por tarea

1. Leer issue/fase y docs.
2. Serena: localizar módulos/símbolos afectados.
3. Context7: confirmar APIs externas.
4. Implementar con pnpm.
5. Tests locales.
6. Browser/Chrome tooling para flujo real.
7. DevTools para errores/rendimiento.
8. Revisar diff y criterios de aceptación.

## Principio “simple pero correcto”

Cuando existan dos soluciones válidas, preferir la que:

- tenga menos moving parts,
- mantenga secretos en servidor,
- sea fácil de probar,
- sea fácil de entender dentro de seis meses,
- no requiera un servicio adicional.
