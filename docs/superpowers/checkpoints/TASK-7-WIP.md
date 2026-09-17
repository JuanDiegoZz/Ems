# TASK 7 — WIP checkpoint

## Completado

- Extendí `src/server/bonus-runs.ts` con servicios administrativos para cargar simulaciones, resolver revisiones, guardar overrides, finalizar mediante el RPC `finalize_bonus_run`, cargar una semana finalizada desde su snapshot y consultar histórico acotado.
- Añadí mapping/DTOs de auditoría para resolución de revisión, override, monto efectivo y estado draft/finalized.
- Conservé las razones de revisión y el motivo de resolución dentro del campo existente `bonus_results.review_reason`, sin migration nueva.
- Añadí endpoints admin para review, override y finalize:
  - `src/app/api/admin/bonuses/[weekStart]/review/route.ts`
  - `src/app/api/admin/bonuses/[weekStart]/override/route.ts`
  - `src/app/api/admin/bonuses/[weekStart]/finalize/route.ts`
- Añadí endpoints bounded para histórico global y expediente:
  - `src/app/api/admin/bonuses/history/route.ts`
  - `src/app/api/admin/bonuses/staff/[profileId]/route.ts`
- Añadí helpers puros iniciales en `src/lib/staff-control/bonus-finalization.ts`.

## Implementación actual

- El siguiente paso inmediato era reemplazar `src/components/admin/bonuses/bonus-simulator.tsx` para integrar cola de revisiones, diálogo de aprobar/override, confirmación de finalización, estado FINALIZADA, histórico y freshness sin F5.
- La edición intentada del simulador no se aplicó: `apply_patch` falló antes de modificar ese archivo, por lo que conserva su versión previa.

## Falta

- Completar UI de review/approve/override/finalize y estado inmutable.
- Integrar histórico y detalle `/admin/bonuses/[weekStart]`.
- Hacer real la pestaña Bonos del expediente EMS usando `getStaffBonusHistory`.
- Añadir estilos mínimos responsive/accesibles para los nuevos diálogos, auditoría, cola e histórico.
- Añadir tests unitarios de helpers, servicios/mapping y contratos UI requeridos.
- Browser QA local de simulación, review, override, finalización, histórico, inmutabilidad y responsive.
- Ejecutar gates finales completos y revisar console/network.

## Archivos creados/modificados

- Modificado: `src/server/bonus-runs.ts`.
- Creado: `src/lib/staff-control/bonus-finalization.ts`.
- Creados: las cinco route handlers admin indicadas arriba.
- Sin cambios aplicados todavía al simulador ni a la pestaña de expediente durante esta operación.
- Existen cambios previos de Tasks 4.1–6 y archivos locales no versionados del trabajo anterior; no fueron deshechos.

## Tests/gates

- Último comando ejecutado: `corepack pnpm typecheck`.
- Resultado conocido: PASS (`tsc --noEmit`).
- No se ejecutaron todavía en este punto `pnpm test`, `pnpm lint`, `pnpm build` ni Browser QA de Task 7.

## Bugs encontrados/corregidos

- Se detectó que el schema existente sólo tiene `review_reason` como texto; se evitó una migration usando un encoding estable de códigos + motivo de resolución dentro de ese campo.
- Se mantuvo la finalización atómica en el RPC existente y se añadieron guards de estado draft/review en servidor.
- La primera edición masiva del simulador falló de forma segura en `apply_patch`; no dejó archivos a medias.

## Decisiones tomadas

- No crear migration ni dependencia nueva.
- Usar `requireAdmin()` en todos los servicios y DTOs explícitos, sin devolver secretos.
- Finalized se lee desde `bonus_results`/`config_snapshot` y no se recalcula.
- Review/override operan sobre un único resultado con condiciones de estado; la finalización usa exclusivamente `finalize_bonus_run`.
- Histórico bounded a 20 runs y staff history a 10 elementos por página.

## Blocker

- No hay blocker real. El trabajo se pausa únicamente por solicitud del usuario.

## Reanudación exacta

1. Reanudar editando `src/components/admin/bonuses/bonus-simulator.tsx` desde la integración UI pendiente descrita arriba.
2. Ejecutar `corepack pnpm typecheck` inmediatamente después de esa edición.
3. Continuar con expediente/histórico, tests, Browser QA y gates finales.

## Entorno local

- Worktree: `C:\Dev\ems-rp-hospital-staff-control`.
- Supabase LOCAL y Next dev server podían estar corriendo desde la sesión anterior; no se tocó producción.
- No se ejecutaron push, merge ni deploy.

## Reanudación y cierre técnico

- Integré UI de revisión/aprobación, override con motivo, confirmación de finalización, estado `FINALIZADA · INMUTABLE`, histórico semanal y detalle `/admin/bonuses/[weekStart]`.
- La pestaña Bonos del expediente carga histórico paginado y enlaza al resultado semanal congelado con métricas y auditoría.
- Añadí helpers puros de ciclo de vida y pruebas de snapshots, bloqueo de recálculo, override, revisión pendiente y aprobación.
- Gates locales: `corepack pnpm test` PASS (175/175), `corepack pnpm lint` PASS, `corepack pnpm typecheck` PASS, `corepack pnpm build` PASS, `git diff --check` PASS.
- Browser QA completo: Supabase/Auth local respondió, login admin validado y los flujos autenticados de Task 7 quedaron validados en desktop/mobile.
- No producción, push, merge ni deploy.

## TASK 7 — Validación final

- Causa de `AuthRetryableFetchError`: el entorno local Docker/WSL de Supabase estaba detenido/incompleto; no fue un defecto del frontend ni de la arquitectura de autenticación.
- Resolución: se restauraron los servicios locales Auth/REST/DB, se verificaron las variables locales contra `supabase status`, se reinició Next cargando `.env.local` y se confirmó login con el fixture admin local `task6admin`.
- Correcciones QA: constraint local para permitir razones de revisión pendientes, preservación de auditoría review/override al recalcular draft, desglose recomendado/ajuste/final y responsive sin overflow; no se modificó Supabase Auth.
- Browser QA: simulación, cola, aprobación, auditoría, override, guard de finalización, finalize atómico, doble finalize rechazado, UX immutable, snapshot histórico, cambio de configuración sin recálculo, histórico, detalle semanal, expediente EMS, freshness sin F5, responsive 1440/390/430/320/375, consola y red.
- La fixture `Task1 Direct` confirmó multa histórica activa de $15,000; el resultado mostró recomendado $5,000 y final $5,000.
- Tests/gates finales: 175/175, lint PASS, typecheck PASS, build PASS, diff-check PASS.
- Configuración local restaurada a meta semanal de 300 minutos. No se copiaron secretos de producción.
- TASK 7 = CLOSED / VALIDATED.
