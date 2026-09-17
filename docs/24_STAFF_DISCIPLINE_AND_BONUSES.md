# Staff Discipline + Weekly Bonuses

Guía operativa, técnica y de release del módulo. Todo lo descrito aquí corresponde a la implementación actual; no hay nómina, pagos ni estado `paid`.

## Alcance funcional

### Centro de Personal EMS

- `/admin/staff` muestra únicamente perfiles activos con rol operativo (`admin` o `ems`), seis tarjetas por página, búsqueda y filtros por atención, inactividad, meta, crítico y webhook faltante.
- La búsqueda y los filtros se aplican al conjunto completo antes de paginar. El estado del filtro, búsqueda y página vive en la URL.
- Cada ficha muestra estado `normal`, `attention`, `risk` o `critical`, meta semanal, inactividad, warns, strikes, multas de la semana y webhook configurado/faltante.
- Las consultas de la lista están acotadas y se ejecutan en paralelo: perfiles, turnos, entregas, disciplina, permisos, configuración y estado de webhooks (7 consultas; no hay fetch por tarjeta).

### Disciplina

- Un warn requiere motivo. Al alcanzar `warnsPerStrike`, la RPC transaccional convierte exactamente ese grupo en un strike generado y conserva los vínculos de auditoría.
- Un strike directo no depende de warns. Un strike generado puede anularse; la reversión anula el warn disparador y libera los warns anteriores vinculados. La anulación conserva historial y motivo.
- `void` no borra registros. Actor, fecha UTC, motivo, relación y estado anterior quedan disponibles en el expediente.
- Warns y strikes no descuentan automáticamente ningún bono. Sólo una multa explícita, vigente y aplicada a una semana concreta reduce el bono recomendado.
- Las multas son independientes de warns/strikes y requieren monto positivo, motivo y lunes de la semana aplicable.

### Permisos y actividad

- Un permiso justificado tiene fechas inclusivas, motivo y auditoría. Puede anularse sin borrar el registro.
- El permiso pausa el cálculo de inactividad durante su periodo; no inventa turnos ni actividad.
- La inactividad es una alerta calculada por días calendario locales. No crea una sanción automática.
- La ficha conserva expediente disciplinario, permisos, turnos y bitácora. El webhook individual pertenece a la bitácora de ese EMS.

## Estados y reglas configurables

Los siguientes son los valores iniciales de la migración y se pueden cambiar desde `/admin/bonuses/settings`:

| Regla | Default actual |
|---|---:|
| `warnsPerStrike` | 3 warns |
| `criticalStrikes` | 3 strikes |
| `inactivityAlertDays` | 3 días calendario |
| `weeklyGoalMinutes` | 300 minutos |
| `activeDayMinimumMinutes` | 30 minutos |
| `activeDaysTarget` | 5 días |
| periodo peak | 22:00–04:00, zona `APP_TIMEZONE` |
| target peak | 2,520 minutos |
| target normal | 600 minutos |
| target kits | 25 |
| pesos | peak 50, kits 25, normal 10, consistencia 15 |

Los estados combinan strikes, warns próximos a conversión, inactividad y meta semanal. El ranking de bonos es reconocimiento; no es una sanción ni cambia permisos.

## Cálculo semanal

El lunes inicia la semana. Los timestamps se guardan en UTC y el calendario se interpreta con `APP_TIMEZONE` (default `America/Monterrey`). Los turnos se recortan al intervalo semanal y se separan en horas peak y normales; los minutos no se pierden al cruzar medianoche.

Cada resultado conserva métricas de peak, kits, normalidad y consistencia, score de 0–100, tier, bono base, multas, recomendado y estado de revisión. La simulación carga en paralelo perfiles, turnos, entregas, multas, permisos, configuración y corrida (7 consultas acotadas), y persiste el borrador para conservar decisiones de revisión.

Tiers iniciales:

| Score | Bono base |
|---:|---:|
| 85–100 | $60,000 |
| 75–84 | $55,000 |
| 65–74 | $50,000 |
| 50–64 | $40,000 |
| 0–49 | $20,000 |

El recomendado es `max(0, bono base - multas explícitas)`. Un objetivo no cumplido produce `WEEKLY_GOAL_NOT_MET`; un permiso que intersecta la semana produce `JUSTIFIED_ABSENCE`. Cualquiera de las dos razones requiere revisión. No se penaliza el bono por warns/strikes de forma implícita.

## Reviews, overrides y finalización

- Una revisión pendiente bloquea la finalización tanto en UI como en servidor.
- Aprobar conserva el recomendado, exige motivo y registra actor, timestamp y razón.
- Un override exige monto entero no negativo y motivo. La UI mantiene visibles `Recomendado`, `Ajuste administrativo` y `Final`; no oculta el monto original.
- La finalización exige cero revisiones pendientes y llama a la RPC transaccional `finalize_bonus_run`. Un segundo intento es rechazado.
- Una semana `DRAFT` puede recalcularse. Una semana `FINALIZED` se muestra como `FINALIZADA · INMUTABLE` y no permite recalcular, volver a draft ni sobrescribir resultados.
- La corrida final guarda snapshot de configuración, tiers, métricas, recomendado, override y monto final. Cambiar settings, turnos, entregas, multas o permisos después no recalcula silenciosamente el histórico.

El histórico está disponible desde `/admin/bonuses` y en `/admin/bonuses/[weekStart]`. La lista está limitada a 20 corridas; el expediente individual muestra semanas de bonos con paginación de 10 resultados. Las consultas de histórico usan la corrida y sus snapshots, no vuelven a calcular cada componente.

## Auditoría

Se conserva actor, timestamp UTC, motivo y relación para:

- sanciones y multas;
- conversión de warns a strike y reversión;
- creación y anulación de permisos;
- resolución de reviews;
- overrides, con recomendado original y monto final;
- finalización, actor y timestamp.

Las respuestas de staff sólo exponen `webhookConfigured: boolean`. Las URLs individuales se cifran server-side con AES-256-GCM usando `EMS_WEBHOOK_ENCRYPTION_KEY`; la tabla contiene IV, ciphertext y tag, no plaintext. La URL no se devuelve al navegador ni se registra.

## Variables de entorno

### Seguras para cliente

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave pública para Auth SSR/browser |
| `NEXT_PUBLIC_APP_NAME` | nombre visible de la aplicación |
| `NEXT_PUBLIC_OCR_DEBUG` | `true` sólo para laboratorio OCR local; `false` en producción |

### Sólo servidor

| Variable | Uso |
|---|---|
| `SUPABASE_SECRET_KEY` | operaciones administrativas server-side; nunca `NEXT_PUBLIC_*` |
| `APP_TIMEZONE` | calendario y presentación; default `America/Monterrey` |
| `INTERNAL_AUTH_DOMAIN` | dominio sintético permitido para usuarios internos, normalmente `ems.invalid` |
| `DISCORD_WEBHOOK_CIVIL` | webhook server-side de entregas civiles |
| `DISCORD_WEBHOOK_POLICE` | webhook server-side de entregas policiales |
| `EMS_WEBHOOK_ENCRYPTION_KEY` | base64 de exactamente 32 bytes para webhooks individuales |

No guardar valores reales en documentación, Git, navegador, logs, capturas o fixtures. En Vercel se configuran en Project Settings → Environment Variables, separando Production/Preview según corresponda. No copiar variables locales con URLs `localhost` a Production.

## Migraciones y base limpia local

El SQL oficial está en estos archivos, en este orden:

1. `supabase/migrations/20260915000000_staff_discipline_and_bonuses.sql`
2. `supabase/migrations/20260917000000_fix_bonus_review_audit.sql`

El segundo es la corrección final de la constraint de auditoría de review: permite una razón ausente mientras la review está pendiente y exige actor, timestamp y motivo cuando se resuelve. No se creó SQL ad-hoc para reemplazarlos.

La validación desde cero local se ejecuta únicamente con Docker/Supabase local:

```powershell
pnpm dlx supabase@2.117.0 db reset --local --no-seed
```

El reset validado aplicó las dos migraciones del módulo desde una base local limpia y dejó tablas, índices, constraints, RLS, grants y RPCs creados. No usar `supabase link`, `supabase db push` ni `--linked` para esta validación.

## Revisión de seguridad e integridad

- `requireAdmin` se ejecuta en server actions, route handlers y lecturas administrativas.
- Las seis tablas del módulo tienen RLS habilitado; los grants de tabla para `anon`/`authenticated` están revocados y sólo `service_role` tiene acceso de tabla.
- Las cuatro RPC sensibles son `SECURITY DEFINER`, fijan `search_path = ''`, revocan `EXECUTE` público/browser y sólo conceden ejecución a `service_role`.
- Las RPC validan actor admin activo, bloqueo transaccional y restricciones de estado. Las mutaciones de una corrida finalizada se rechazan.
- Errores de API se sanitizan; no se devuelven errores crudos de RPC ni secretos.
- La integridad principal es transaccional: conversión de warns, reversión de strike generado, finalización, snapshot, monto final no negativo y review previa.

## Runbook de producción (manual, no ejecutado)

1. Confirmar el proyecto Supabase de producción y entender backup/recuperación.
2. Abrir Supabase Dashboard → proyecto correcto → **SQL Editor** → **New query**.
3. Abrir y copiar el contenido exacto de `20260915000000_staff_discipline_and_bonuses.sql`; revisar el proyecto y ejecutar una sola vez.
4. Verificar éxito y registrar la ejecución. Si esa migración ya existe en el historial, no repetirla.
5. Abrir una nueva query, copiar `20260917000000_fix_bonus_review_audit.sql` y ejecutarla sólo si aún no está aplicada.
6. Verificar tablas, RLS, grants, constraints y las RPC `record_disciplinary_action`, `void_disciplinary_action`, `save_bonus_settings` y `finalize_bonus_run`.
7. Configurar en Vercel las variables server/client de la tabla anterior, con la clave de cifrado nueva y respaldada de forma segura.
8. Confirmar `pnpm build` verde y desplegar manualmente la aplicación cuando el operador lo autorice.
9. Hacer smoke: login admin, Centro de Personal, entrega, turno/bitácora, permisos, disciplina, simulación, review, override, finalización e histórico.
10. Configurar webhooks individuales sólo si corresponde y observar logs sin imprimir secretos.

No ejecutar la migration dos veces sin confirmar el historial. La aplicación y la base tienen ciclos de rollback separados: Vercel puede volver al deployment anterior si falla la UI; no existe rollback destructivo automático de la base. No improvisar `DROP`, `DELETE` o SQL de reversión. La migración de producción aún no está aplicada.

### Checklist pre-deploy

- [ ] Proyecto Supabase correcto y backup/recuperación entendido
- [ ] Ambas migraciones verificadas/aplicadas en orden
- [ ] RPCs, RLS y grants verificados
- [ ] Variables de Vercel completas y sin `localhost`
- [ ] `EMS_WEBHOOK_ENCRYPTION_KEY` configurada y respaldada
- [ ] Webhooks globales server-side revisados
- [ ] Build y tests verdes
- [ ] Login admin
- [ ] Centro de Personal y expediente
- [ ] Entregas, turnos y bitácora
- [ ] Bonos, review, override, finalización e histórico
- [ ] Console sin errores y Network sin secretos/N+1

## Limitaciones intencionales

- No hay nómina, pagos ni integración automática de payroll.
- No hay realtime ni polling; las mutaciones actualizan la UI mediante respuesta e invalidación local.
- La inactividad sólo cambia estado de atención; no genera disciplina automáticamente.
- Warns y strikes no descuentan bonos automáticamente; las multas explícitas sí.
- El ranking sólo reconoce desempeño.
- La migración y el deploy de producción requieren ejecución manual posterior.

## Evidencia de Task 8

La validación local cubre rebuild limpio, smoke autenticado del módulo y rutas existentes, responsive 320/375/390/430/1440, teclado/labels/dialogs, cifrado de webhook, ausencia de fetch por tarjeta, snapshot histórico y gates automatizados. El informe final de la tarea registra los resultados y cualquier limitación observada.
