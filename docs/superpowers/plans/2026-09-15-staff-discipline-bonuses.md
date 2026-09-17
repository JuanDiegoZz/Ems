# Staff Discipline and Bonuses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, auditable administrative staff center plus weekly bonus simulation, finalization, history, settings, and overrides.

**Architecture:** Server-only Supabase services own authorization, aggregation, mutation and RPC calls. One additive migration owns persistence, RLS/grants and serialized warn conversion/reversal. Pure TypeScript owns calendar, status, and bonus math; Next pages use small client controls over server-rendered data.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Supabase PostgreSQL/Auth, current CSS, node:test, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-15-staff-discipline-bonuses-design.md`

## Global Constraints

- Use pnpm, strict TypeScript, current components/CSS, and no new dependency.
- Keep UTC timestamps; calculate local calendars with `APP_TIMEZONE` / `America/Monterrey`.
- Preserve OCR, identity, daily kit, shift lifecycle, auth, Discord, and existing pages.
- RLS is enabled, browser table/function grants revoked, and only service-role server code accesses administrative data.
- Every mutation calls `requireAdmin()`; UI never authorizes a dangerous action.
- Money is integer pesos and durations are integer minutes.
- No physical delete, account suspension, payment, realtime, push, deploy, or merge.

## File Map

- `supabase/migrations/20260915000000_staff_discipline_and_bonuses.sql`: tables, checks, indexes, RLS/grants, serialized issue/void RPCs.
- `src/lib/staff-control/{types,calendar,status,bonus,bonus-settings}.ts`: contracts and pure logic.
- `src/server/{staff-control,bonus-runs}.ts`: protected queries and mutations.
- `src/app/api/admin/{staff,bonuses}/**/route.ts`: protected HTTP adapters.
- `src/app/admin/{staff,bonuses}/**`, `src/components/admin/{staff,bonuses}/**`: pages and client islands.
- `tests/unit/{staff-control,bonus}.test.ts`: pure/domain contract coverage.
- `docs/24_STAFF_DISCIPLINE_AND_BONUSES.md`: manual migration and operations guide.

## Domain Interfaces

```ts
export type DisciplineType = "warn" | "strike" | "fine";
export type StaffFilter = "all" | "attention" | "inactive" | "goal" | "critical";
export type BonusRunStatus = "draft" | "finalized";
export type IssueActionInput = { profileId: string; type: DisciplineType; reason: string; fineAmount?: number; appliesToWeek?: string; relatedActionId?: string };
export type IssueActionOutcome = { actionId: string; generatedStrikeId: string | null; nowCritical: boolean };
export type WeeklyMetrics = { weeklyMinutes: number; peakMinutes: number; normalMinutes: number; kits: number; activeDays: number };
export type BonusRecommendation = { score: number; components: { peak: number; kits: number; normal: number; consistency: number }; baseAmount: number; fineTotal: number; recommendedFinal: number; reviewRequired: boolean };
```

## Execution Order

Execute by task number, not by visual position in this document: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. This keeps data invariants and pure calendar proof ahead of protected aggregation and UI work.

---

### Task 1: Database schema, grants, and atomic discipline RPCs

**Files:**
- Create: `supabase/migrations/20260915000000_staff_discipline_and_bonuses.sql`
- Test: `tests/unit/staff-control.test.ts`
- Modify: `tests/unit/run.ts`

**Consumes:** current service-role-only migration pattern and `profiles`, `ems_shifts`, `deliveries`, `app_settings`.

**Produces:** administrative tables and `record_disciplinary_action(...)` / `void_disciplinary_action(...)` RPCs.

- [ ] **Step 1: Write failing action-contract tests**

```ts
test("third active warn previews a generated strike", () => assert.deepEqual(previewWarnConversion(2, 3), { willGenerateStrike: true }));
test("a fine linked to a warn remains independently voidable", () => assert.equal(canVoidAction({ type: "fine", relatedActionId: "warn-1" }), true));
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- tests/unit/staff-control.test.ts`

Expected: FAIL because the action helpers do not exist.

- [ ] **Step 3: Add the migration**

Create `disciplinary_actions`, `justified_absences`, singleton `bonus_settings`, normalized `bonus_tiers`, `bonus_runs`, and `bonus_results`. Use UUID relations, UTC audit columns, integer money/minutes, and checks for action/fine/week coupling, generated strike trigger, void audit completeness, Monday `applies_to_week` (`extract(isodow)=1`), and fine amount strictly greater than zero. Add optional self-FK `related_action_id`; RPC validation only permits its fine to refer to a warn or strike. Add bonus-result review resolution audit fields. Index active actions by profile, weekly fines, absence ranges, runs, and results.

Seed 300 weekly minutes, 22:00–04:00, 30 active minutes, 50/25/10/15 weights, 3 inactivity days, 3 warns per strike, 3 critical strikes, and the five required tiers. Enable RLS, revoke table grants from `anon`/`authenticated`, grant only `service_role`.

Define `SECURITY DEFINER SET search_path = ''` functions using explicit `public.` objects. Revoke EXECUTE from browser roles and grant only service_role. `record_disciplinary_action` validates active-admin issuer, locks the target profile with `pg_advisory_xact_lock`, inserts action, locks active warns with `FOR UPDATE`, reads persisted `warns_per_strike`, converts exactly that set, and stores its newest member as `triggered_by_warn_id`. `void_disciplinary_action` locks the same profile; direct strike voids alone; generated strike void selects all warnings linked by `converted_to_strike_id`, voids only `triggered_by_warn_id`, clears every other conversion link, then voids the strike atomically. Do not cascade a void to a linked fine.

Also define `save_bonus_settings(...)` and `finalize_bonus_run(...)` with the same security settings. The former locks/validates the singleton and replaces settings plus tiers atomically. The latter locks a draft run, rejects unresolved reviews, writes every result/config/metric snapshot, marks the run finalized, and commits as one database transaction.

- [ ] **Step 4: Manually prove SQL invariants**

Apply the SQL to a disposable Supabase project. In two SQL sessions issue concurrent third warns and verify one generated strike only. Void it and verify two active warnings, one voided trigger warning, and zero active strikes. Repeat after changing `warns_per_strike` to four to prove no hardcoded third-warning logic.

- [ ] **Step 5: Implement the minimal action helper and verify GREEN**

Run: `pnpm test -- tests/unit/staff-control.test.ts && pnpm typecheck`

Expected: PASS.

### Task 3: Protected staff server services and API adapters

**Files:**
- Create: `src/server/staff-control.ts`
- Create: `src/app/api/admin/staff/route.ts`
- Create: `src/app/api/admin/staff/[profileId]/route.ts`
- Create: `src/app/api/admin/staff/actions/route.ts`
- Create: `src/app/api/admin/staff/actions/[actionId]/void/route.ts`
- Create: `src/app/api/admin/staff/absences/route.ts`
- Create: `src/app/api/admin/staff/settings/route.ts`
- Test: `tests/unit/staff-control.test.ts`

**Consumes:** Task 1 RPCs, Task 2 helpers, `requireAdmin()`, `createSupabaseAdminClient()`.

**Produces:** `listStaff`, `getStaffFile`, `issueAction`, `voidAction`, `recordAbsence`, and settings services.

- [ ] **Step 1: Write failing service contracts**

```ts
test("non-admin cannot issue a sanction", async () => await assert.rejects(() => issueAction(input), /Forbidden/));
test("global name search occurs before pagination", () => assert.deepEqual(applyStaffQuery(allStaff, { q: "Carlos", page: 1 }).items.map(x => x.name), ["Carlos Méndez"]));
test("a voided fine is excluded from live total", () => assert.equal(activeFineTotal([activeFine, voidedFine]), 5000));
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- tests/unit/staff-control.test.ts`

Expected: FAIL because service exports are absent.

- [ ] **Step 3: Implement bounded staff aggregation**

Require admin, then fetch operational profiles, week-clipped shifts, week deliveries, action summaries, relevant absences, and paged file history through bounded parallel queries. Group in server memory with Task 2 helpers. Apply text/status filter to the whole aggregate, order deterministically, then paginate; never fetch per EMS. Return current permission coverage, active fines, goal/inactivity and attention reasons.

- [ ] **Step 4: Implement mutation services and thin routes**

Validate ids, reason, date, amount, related action compatibility, and settings before database calls. Call `requireAdmin()` first, then RPC with verified actor ID. Map Unauthorized/Forbidden to 401/403, malformed input to 400, absent record to 404, expected write conflict to 409, and all other errors to sanitized 500. Return no raw database errors or secrets.

- [ ] **Step 5: Verify phase**

Run: `pnpm test -- tests/unit/staff-control.test.ts && pnpm lint && pnpm typecheck`

Expected: PASS.

### Task 4: Staff center, discipline UI, and staff file

**Files:**
- Create: `src/app/admin/staff/page.tsx`
- Create: `src/app/admin/staff/loading.tsx`
- Create: `src/app/admin/staff/[profileId]/page.tsx`
- Create: `src/components/admin/staff/staff-center.tsx`
- Create: `src/components/admin/staff/staff-filters.tsx`
- Create: `src/components/admin/staff/staff-card.tsx`
- Create: `src/components/admin/staff/attention-queue.tsx`
- Create: `src/components/admin/staff/sanction-dialog.tsx`
- Create: `src/components/admin/staff/staff-file-tabs.tsx`
- Modify: `src/components/app-shell/app-shell.tsx`
- Modify: `src/components/app-shell/mobile-more-sheet.tsx`
- Modify: `src/components/ui/index.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/staff-control.test.ts`

**Consumes:** Task 3 view/action contracts and current AppShell, ChoiceDialog, ToastProvider, Card, Badge, EmptyState.

**Produces:** `/admin/staff`, `/admin/staff/[profileId]`, and clean admin navigation.

- [ ] **Step 1: Write failing UI-helper tests**

```ts
test("summary card maps to its global filter", () => assert.equal(summaryFilter("critical"), "critical"));
test("sanction preview names a pending warning conversion", () => assert.match(conversionNotice({ willGenerateStrike: true }), /convertirán en 1 strike/));
test("critical precedes missed goal in attention order", () => assert.equal(compareAttention(critical, missedGoal) < 0, true));
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- tests/unit/staff-control.test.ts`

Expected: FAIL because UI helpers are absent.

- [ ] **Step 3: Implement approved staff hierarchy**

Render `Registrar sanción`, clickable summary cards, URL-backed name search, chips, attention queue, and staff cards. Desktop uses the approved summary/queue/list arrangement. Mobile order is summary, filters, attention, staff; the lower-priority weekly-review panel follows the list. Cards always show textual status, visible five-hour goal, inactivity, warns, strikes, fine, permission label, file link and contextual `Sancionar`; critical cards add `Strikes 3/3 · Límite alcanzado` and review text. Use skeleton and explicit empty state; never add mega-tables.

- [ ] **Step 4: Implement sanctioned, void, and absence flows**

Global action selects an EMS; card action preselects it. Warn/Strike/Multa require free reason; fines capture integer amount, Monday week, and optional related warn/strike. Request preview before confirmation and tell user when the warn creates a strike. Disable duplicate submits and show only returned ToastProvider outcome. Void generated strike confirmation explains trigger-warn void plus the remaining active warnings. Use existing ChoiceDialog desktop/mobile behavior and at least 44 px touch controls.

- [ ] **Step 5: Implement file tabs and accessibility**

Use URL-addressable Resumen/Rendimiento/Disciplina/Bitácoras/Bonos/Histórico tabs. Paginate discipline history and show conversion/void audit. Add admin navigation in sidebar and mobile More, aria labels/current state, focus-visible styles, semantic headings, keyboard-safe filter controls, and no colour-only states.

- [ ] **Step 6: Verify phase**

Run: `pnpm test -- tests/unit/staff-control.test.ts && pnpm lint && pnpm typecheck`

Expected: PASS.

### Task 2: Calendar, inactivity, and staff status domain

**Files:**
- Create: `src/lib/staff-control/calendar.ts`
- Create: `src/lib/staff-control/status.ts`
- Modify: `src/lib/shifts/time.ts`
- Test: `tests/unit/staff-control.test.ts`

**Consumes:** `APP_TIMEZONE`, existing `startOfDayInTimeZone`, shift overlap behavior.

**Produces:** `weekRange`, `splitShiftMinutes`, `activeDays`, `inactiveCalendarDays`, `staffStatus`, `attentionPriority`, and display labels.

- [ ] **Step 1: Write failing time/status tests**

```ts
test("splits 21:00–02:00 into one normal and four peak hours", () => assert.deepEqual(splitShiftMinutes(shift, peak), { peakMinutes: 240, normalMinutes: 60 }));
test("absence pauses rather than resets inactivity", () => assert.equal(inactiveCalendarDays(monday, friday, [tuesdayThroughThursday]), 1));
test("three strikes exposes critical text", () => assert.match(staffStatus({ strikes: 3, warns: 0 }).detail, /Strikes 3\/3/));
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- tests/unit/staff-control.test.ts`

Expected: FAIL because calendar/status exports are absent.

- [ ] **Step 3: Implement pure local-calendar calculations**

Build Monday ranges and local day boundaries without host timezone parsing. Clip interval slices to week boundaries and split every local 22:00/04:00 edge, preserving the invariant that peak plus normal minutes equal every clipped shift minute. Accumulate a day before testing active-minute threshold. In inactivity, absence-covered days neither add to the consecutive count nor reset it; they pause it. Generate accessible normal/attention/risk/critical, goal, warning-threshold, permission, and inactivity text labels.

- [ ] **Step 4: Add the required boundary matrix**

Cover 23:00–03:00, 03:00–08:00, cross-week slice, open shift, Monterrey zone, 4h59/5h00/5h01, never-active profile, 3/4/5/7 days, overlapping absence, and 29/30 active minutes.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm test -- tests/unit/staff-control.test.ts`

Expected: PASS.

### Task 5: Bonus engine and configuration validation

**Files:**
- Create: `src/lib/staff-control/bonus.ts`
- Create: `src/lib/staff-control/bonus-settings.ts`
- Test: `tests/unit/bonus.test.ts`
- Modify: `tests/unit/run.ts`

**Consumes:** Task 2 weekly metrics/calendar helpers and persisted tier/settings shape.

**Produces:** `validateBonusSettings`, `calculateBonus`, `rankRecommendations`, `formatPesos`, and `freezeConfig`.

- [ ] **Step 1: Write failing score/config tests**

```ts
test("each score component caps at its weight", () => assert.deepEqual(calculateBonus(overTarget, settings).components, { peak: 50, kits: 25, normal: 10, consistency: 15 }));
test("weights must sum to 100", () => assert.throws(() => validateBonusSettings({ ...settings, peakWeight: 49 }), /100/));
test("fines cannot make a recommendation negative", () => assert.equal(calculateBonus({ ...metrics, fines: 90000 }, settings).recommendedFinal, 0));
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- tests/unit/bonus.test.ts`

Expected: FAIL because the bonus exports are absent.

- [ ] **Step 3: Implement integer-only score and settings validation**

Validate positive targets, legal time values, positive active-day minutes, integer threshold/critical values, exact weight sum, sorted non-overlapping tiers, and integer pesos. Calculate capped peak/kits/normal/consistency components, absolute tier amount, active fine total, `max(0, base-fines)`, goal/absence review flags, deterministic rank by score then peak minutes/name/UUID, and a JSON-safe frozen snapshot.

- [ ] **Step 4: Add boundary coverage**

Cover every target cap, tier edges, default 60000 maximum, missed goal review, justified-absence review without invented points, deterministic ties, and format output.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm test -- tests/unit/bonus.test.ts`

Expected: PASS.

### Task 6: Bonus services, simulation, and settings UI

**Files:**
- Create: `src/server/bonus-runs.ts`
- Create: `src/app/api/admin/bonuses/simulate/route.ts`
- Create: `src/app/api/admin/bonuses/settings/route.ts`
- Create: `src/app/admin/bonuses/page.tsx`
- Create: `src/app/admin/bonuses/loading.tsx`
- Create: `src/app/admin/bonuses/settings/page.tsx`
- Create: `src/components/admin/bonuses/{bonus-simulator,bonus-result-card,bonus-settings-form}.tsx`
- Modify: `src/components/app-shell/{app-shell,mobile-more-sheet}.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/bonus.test.ts`

**Consumes:** Tasks 3 and 5.

**Produces:** protected week-at-a-time simulation and configuration UI.

- [ ] **Step 1: Write failing service tests**

```ts
test("simulation is draft-only", async () => assert.equal((await simulateWeek("2026-09-07")).status, "draft"));
test("EMS cannot access a simulation", async () => await assert.rejects(() => simulateWeek("2026-09-07"), /Forbidden/));
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- tests/unit/bonus.test.ts`

Expected: FAIL because the simulation service is absent.

- [ ] **Step 3: Implement draft service and settings persistence**

Require admin; load validated settings/tiers, use bounded weekly aggregates, calculate recommendations, and create/update one draft per Monday week. A finalized run is returned from its snapshot and never recalculated. Save settings and tiers only through `save_bonus_settings`, never a sequence of Supabase JS writes. Review-required results expose an explicit approve-recommendation or override-resolution action and audit metadata.

- [ ] **Step 4: Implement the simulator and settings surfaces**

Show period, status, current config, calculate action, ranking, and cards with visible score components, goal/review state, base, fines, and recommendation. Use native number/time inputs, live weight total, tier validation, ChoiceDialog save confirmation, no financial tooltip dependency, and mobile cards without horizontal document overflow.

- [ ] **Step 5: Verify phase**

Run: `pnpm test -- tests/unit/bonus.test.ts && pnpm lint && pnpm typecheck`

Expected: PASS.

### Task 7: Finalization, history, and audited override

**Files:**
- Create: `src/app/api/admin/bonuses/[week]/finalize/route.ts`
- Create: `src/app/api/admin/bonuses/[week]/reviews/[profileId]/route.ts`
- Create: `src/app/api/admin/bonuses/[week]/override/route.ts`
- Create: `src/app/admin/bonuses/[week]/page.tsx`
- Create: `src/components/admin/bonuses/finalize-dialog.tsx`
- Modify: `src/server/bonus-runs.ts`
- Modify: `src/components/admin/bonuses/bonus-result-card.tsx`
- Test: `tests/unit/bonus.test.ts`

**Consumes:** draft runs and Task 5 snapshot/override contracts.

**Produces:** immutable finalized runs/results, explicit review resolution, and override audit.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
test("finalization preserves config and metric snapshots", () => assert.deepEqual(finalize(draft).configSnapshot, draft.configSnapshot));
test("a finalized run cannot silently recalculate", () => assert.throws(() => recalculate(finalized), /finalized/));
test("override keeps recommendation and requires reason", () => assert.throws(() => override(result, 45000, ""), /motivo/));
test("finalization rejects unresolved reviews", () => assert.throws(() => finalize(runWithUnresolvedReview), /review/));
test("approval resolves review without changing recommendation", () => assert.equal(resolveReview(result, "approved", "Meta revisada").finalAmount, result.recommendedFinal));
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- tests/unit/bonus.test.ts`

Expected: FAIL because lifecycle behavior is absent.

- [ ] **Step 3: Implement transactional finalization and override**

Resolve review-required results before finalization: approval requires review reason and records resolver/timestamp while retaining recommendation; override requires review reason, positive integer final amount, override reason, actor and timestamp. Finalization calls only `finalize_bonus_run`, which locks draft, rejects unresolved reviews, creates one snapshot row per profile and marks run finalized in one transaction. Do not mutate finalized metric/config snapshots. Later voided fine affects only a new draft; it never changes a finalized run silently.

- [ ] **Step 4: Implement history presentation**

Finalize confirmation states results freeze and lists unresolved reviews as blocking. Week detail and staff-file bonus tab show frozen config/metrics, base/fines/recommendation/final amount, status, review resolution and override audit, with no hidden recalculation.

- [ ] **Step 5: Verify phase**

Run: `pnpm test -- tests/unit/bonus.test.ts && pnpm lint && pnpm typecheck`

Expected: PASS.

### Task 8: Documentation, manual migration, and final QA

**Files:**
- Create: `docs/24_STAFF_DISCIPLINE_AND_BONUSES.md`
- Modify: `docs/06_DATABASE.md`
- Modify: `docs/07_AUTH_AND_PERMISSIONS.md`
- Modify: `docs/19_ASSUMPTIONS_AND_DECISIONS.md`
- Modify: `README.md` only when the existing behavior documentation is insufficient.

**Consumes:** all completed implementation and verification evidence.

**Produces:** SQL-editor instructions, operator guide, and final evidence.

- [x] **Step 1: Document operations and exact SQL-editor process**

Document independent linked fines, their explicit-void rule, N-warning conversion/reversal, direct strike void, absence pause, local peak/active-day math, score/config/tiers, review approval/override blocking finalization, drafts/finalization, RPC security, and RLS. Include the complete contents of the new SQL migration as the exact material to paste into Supabase SQL Editor; never instruct the operator to paste a path or PowerShell command.

- [x] **Step 2: Execute complete automated verification**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check`.

Expected: every command exits 0; capture the suite total from output.

- [x] **Step 3: Execute browser QA**

Run `pnpm dev`, authenticate as admin, then inspect staff center, file, sanction/void/absence, simulator, settings, finalized week and override at desktop plus 320/375/390/430 px. Confirm no horizontal document overflow, hydration warning, maximum-depth loop, AbortError, React loop, secret exposure, or unauthorized success. Confirm summary/search/filter results apply globally before pagination.

- [x] **Step 4: Report gaps honestly**

If Supabase migration or authenticated browser QA cannot run locally, record the exact unverified action and manual proof path. Do not push, deploy, merge, or alter historical migrations.

## Coverage Review

- Migration, RLS/grants, linked fines and variable-threshold atomic conversion/reversal: Task 1.
- Peak/normal hours, goal, activity threshold and absence-paused inactivity: Task 2.
- Admin guards, global filter-before-pagination, APIs and non-N+1 aggregation: Task 3.
- Approved desktop/mobile staff experience, sanctions, file and accessibility: Task 4.
- Score, tiers, fines, config validation and deterministic ranking: Task 5.
- Simulator/configuration: Task 6.
- Finalized snapshots and override audit: Task 7.
- Documentation, manual migration, automated/browser verification: Task 8.

## Estado de ejecución

Tasks 1–8: CLOSED / VALIDATED en entorno local. La migration de producción y el deploy de producción no se han ejecutado.
