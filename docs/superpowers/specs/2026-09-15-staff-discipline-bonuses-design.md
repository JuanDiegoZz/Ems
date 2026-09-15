# Staff Discipline and Bonuses Design

## Goal

Add an admin-only staff control center, auditable discipline, and weekly bonus simulation/finalization without changing existing EMS, delivery, OCR, or shift workflows.

## Constraints

- Next.js App Router, strict TypeScript, pnpm, no new dependencies.
- All persistent timestamps are UTC `timestamptz`; calendar calculations use `America/Monterrey` from `APP_TIMEZONE`.
- Server-only Supabase service-role access; browser grants remain revoked; every mutation calls `requireAdmin()`.
- No physical delete, automatic user deactivation, automatic shift closure, payment, Discord notification, realtime, push, deploy, merge, or push.
- Reuse current AppShell, `ChoiceDialog`, ToastProvider, cards, mobile sheet behavior, `requireAdmin()`, and date helpers.

## Product surfaces

### `/admin/staff`

The control center is the default administrative triage view. Its order is fixed: heading and “Registrar sanción”, clickable summary cards, filters and EMS search, “Requieren atención”, then the complete staff list. Summary cards activate the matching filter. Desktop retains the approved two-column attention area; mobile places “Qué revisar esta semana” after the prioritized staff content or omits it when it only repeats data.

Each EMS card is a compact operational record: status label and icon, weekly hours and visible five-hour goal, inactivity, active warns, strikes, weekly fines, justified-absence label (`Permiso hasta DD MMM`), detail link, and contextual `Sancionar`. Critical cards additionally say `CRÍTICO`, `Strikes 3/3 · Límite alcanzado`, and `Revisión administrativa requerida`; no state depends on colour alone. Search filters by EMS name locally over the server-provided current staff page. Lists are server-aggregated, not one request per EMS.

The attention order is deterministic: 3+ active strikes, 7+ inactive days, 2 strikes, missed goal, 3+ inactive days, then 2 active warns. Ties order by RP name then UUID.

### `/admin/staff/[profileId]`

The administrative file is tabbed: Resumen, Rendimiento, Disciplina, Bitácoras, Bonos, Histórico. It is a compact navigation control on mobile. Discipline history is paginated and includes issued/voided actors, timestamps, reasons, conversion links, and every void state. The bonus tab links to the selected weekly simulation/result rather than rendering all bonus history up front.

### Sanction flow

`ChoiceDialog` is the confirmation mechanism; its current mobile CSS makes it a safe bottom sheet. A client form selects Warn, Strike, or Multa; requires a free-text reason; conditionally requires positive integer fine amount and affected Monday-based bonus week. Before confirmation, it calls a protected preview endpoint: if the new warn is the third active warn, the dialog explicitly says it will create one strike. A successful mutation returns enough outcome metadata to show the precise existing toast. The global action first selects the EMS, while the card action preselects it.

Void confirmation explains the irreversible audit effect. An auto-generated strike confirmation explicitly says: “Este strike fue generado por el tercer warn. Al anularlo, también se anulará el warn que provocó la conversión y permanecerán 2 warns activos.”

### `/admin/bonuses`

This is a week-at-a-time simulator, not a payment screen. It shows a period picker, configuration summary, Calculate simulation action, ranked staff cards, all score components, visible goal/review state, fines, and recommended final amount. Ranking is recognition only. A week with an unmet goal or relevant justified absence is `review_required`; simulation never silently finalizes it.

### `/admin/bonuses/settings`

Admin configuration edits the weekly goal, 22:00–04:00 peak period, active-day minimum, targets, weights, tiers, inactivity threshold, warns-per-strike, and critical strikes. Validation requires positive quantities, legal time values, sorted non-overlapping tiers, and weights summing exactly 100.

## Data model

The additive migration adds private, RLS-protected public tables; grants are revoked from `anon` and `authenticated`, and are given only to `service_role`.

### `disciplinary_actions`

- UUID primary key; `profile_id`, `issued_by`, `issued_at`, required `reason`, `type` (`warn`, `strike`, `fine`), and immutable creation fields.
- `fine_amount` is a non-negative integer pesos amount and is required only for `fine`.
- `applies_to_week` is a Monday local calendar `date`, required only for a fine.
- `converted_to_strike_id` links historical warns to their generated strike; `triggered_by_warn_id` on a generated strike identifies the third warn which caused conversion.
- `generated_from_warns` distinguishes automatic from direct strikes.
- Void audit fields: `voided_at`, `voided_by`, and mandatory `void_reason`.
- Active means no void fields and, for warns, no conversion link. No action is ever deleted.

### `justified_absences`

Profile, inclusive local start/end dates, reason, creator, timestamp, plus the same void audit fields. Overlap is permitted; the status engine de-duplicates covered calendar days. Absences never synthesize shifts, activity days, score, or money.

### Bonus configuration and history

- `bonus_settings`: a singleton row with default settings: 300 weekly minutes, peak 22:00–04:00, 30 active minutes, targets, 50/25/10/15 weights, three days inactivity threshold, three warns per strike, and three critical strikes.
- `bonus_tiers`: normalized ordered score ranges and integer base amounts, seeded with 85→60000, 75→55000, 65→50000, 50→40000, otherwise 20000.
- `bonus_runs`: unique Monday week start, `draft|finalized|paid` status, creator/timestamps, and JSONB snapshot of validated configuration and tiers. A draft may be calculated again; finalized data is never recalculated.
- `bonus_results`: one per run and profile with raw metrics in minutes/counts, score components, score, base amount, active-fine total, recommended final amount, review flags, optional final override amount/reason/by/at, and final amount. It is a historical metric snapshot, not a view over live tables.

## Security and concurrency

All route handlers and server services call `requireAdmin()`. Tables are never accessed from browser clients. Input is validated server-side; IDs, amounts, dates, reasons, ranges, and status transitions are checked before database calls.

`record_disciplinary_action` is a `SECURITY DEFINER`, `search_path = ''` PostgreSQL function callable only by `service_role`. It validates that the supplied issuer is an active admin, obtains a transaction-scoped advisory lock keyed by target profile, inserts the requested action, locks that profile’s active warnings with `FOR UPDATE`, and converts exactly the first configured threshold warnings into one generated strike. It stores all converted warning links plus the third triggering warning. This serializes simultaneous admins and prevents four active warns or duplicate strikes.

`void_disciplinary_action` uses the same profile lock. A direct strike void only voids that strike. Voiding a generated strike atomically voids its triggering third warning, clears the conversion links from the first two warnings so they become active again, and records all void actors/timestamps/reasons. The result is two active warnings and zero active strikes. Fines are excluded from a live simulation as soon as voided; finalized bonus results are immutable and require a separately audited override rather than silent recalculation.

Functions use explicit `public.` references, an empty search path, and revoked `EXECUTE` from `anon`/`authenticated`, following current Supabase function security guidance.

## Calendar and analytics

Weeks are `[Monday 00:00, next Monday 00:00)` in `APP_TIMEZONE`. The existing shift helper is extended with pure local-calendar range construction and interval splitting. Open shifts use supplied `now` only for present-week simulation; no row is closed. Each shift is clipped to the week and split at local 22:00 and 04:00 boundaries, so cross-midnight shifts count peak and normal minutes exactly.

Activity days use local calendar intervals and require accumulated shift minutes at or above the configured minimum. Inactivity uses the last real `ems_shifts.started_at` reference, or `profiles.created_at` if absent, expressed in local calendar days. Justified-absence days are excluded from the consecutive inactivity run, not turned into artificial activity. Weekly goal is separately visible at 299/300/301 minutes.

Kits count delivered `deliveries` records by `delivered_by` in the weekly interval. The current delivery index is reused; the staff/bonus aggregate fetches profile, shift, delivery, discipline, and absence sets in bounded queries then groups in server memory. No per-card fetches occur.

## Bonus calculation

All arithmetic uses integers except the display score; money is integer pesos and durations are integer minutes.

`peak = min(peakMinutes / peakTarget, 1) * peakWeight`; analogous capped components apply to kits, normal minutes, and active days. The total is 0–100. Tier selection is absolute, never zero-sum. `recommendedFinal = max(0, baseAmount - activeFineTotal)`. A missed five-hour goal or relevant absence adds an explicit review requirement and does not choose an official final amount. Ranking sorts score descending, then peak minutes descending, then RP name and UUID for deterministic ties.

Finalization persists the complete config snapshot and metrics snapshot in one transaction. It warns the admin that values freeze. Overrides preserve the original recommendation, require a reason, and record actor/timestamp; they never replace calculation evidence.

## Accessibility and responsiveness

Existing 44–48 px controls, reduced-motion rules, focus styling, keyboard escape behavior, semantic headings, aria labels, and toast live regions are retained. The cards grid collapses to one column at mobile widths. Chips use contained horizontal scrolling only within their own strip; the document never overflows. At 320 px, summary metrics compress and action buttons stack with `Sancionar` first. Loading uses localized skeletons; empty states explain absence of data.

## Verification

Pure helpers receive node:test coverage before implementation: warn conversion and concurrent serialization contracts, direct/void paths, absence/inactivity, activity threshold, week/timezone/peak splitting, goal boundaries, score/caps/tiers/fines/ranking, snapshots, overrides, status labels, and filter/search ordering. Server routes are exercised through existing service patterns to prove admin authorization. Each phase runs focused tests, lint, typecheck, and then the complete user-mandated suite; final proof includes build, diff check, and browser checks at 320/375/390/430 px.

## Explicit non-goals

No external payroll, payment, public EMS discipline view, public registration, auth suspension, automatic disciplinary escalation beyond 3 warns→1 strike, Discord sanctions, or realtime subscription is added.
