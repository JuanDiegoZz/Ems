# EMS shifts and performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure EMS work shifts, per-EMS Discord shift webhooks, and admin performance analytics.

**Architecture:** Server-only Supabase access owns shifts, webhook ciphertext, and analytics. A minimal additive migration provides database concurrency protection and private storage; React only renders the current shift and derives elapsed time locally. Delivery analytics reuse `deliveries.delivered_by` and its existing index.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL, Node `crypto`, React, node:test.

**Spec:** User-approved design in this conversation.

## Global Constraints

- Use pnpm and strict TypeScript; add no dependencies.
- Store UTC `timestamptz`; interpret/display calendar boundaries in `America/Monterrey`.
- Webhook URLs, keys, ciphertext and raw Discord errors never reach a browser.
- All data access is server-only; all administrative operations call `requireAdmin()`.
- Do not alter existing deliveries/profiles, delivery webhooks, OCR, PWA, or logout semantics.

---

### Task 1: Database and pure domain helpers

**Files:**
- Create: `supabase/migrations/20260914000000_ems_shifts_and_webhooks.sql`
- Create: `src/lib/shifts/time.ts`
- Create: `src/lib/discord/shift-webhook.ts`
- Test: `tests/unit/shifts.test.ts`
- Modify: `tests/unit/run.ts`

- [ ] Write failing unit tests for elapsed duration, range overlap, open-ended shifts, Monterrey ranges, Discord message formatting, and AES-GCM round trips.
- [ ] Run `pnpm test`; verify imports fail because the helpers do not exist.
- [ ] Add the migration with `ems_shifts`, `ems_discord_webhooks`, revoked browser grants, partial unique open-shift index, and `(profile_id, started_at)` index.
- [ ] Implement pure duration/range/message helpers and AES-256-GCM encryption using a 32-byte base64 key and random 12-byte IV.
- [ ] Run `pnpm test`; verify helper tests pass.

### Task 2: Server services and protected routes

**Files:**
- Create: `src/server/shifts.ts`
- Create: `src/server/ems-performance.ts`
- Create: `src/app/api/shifts/current/route.ts`
- Create: `src/app/api/shifts/open/route.ts`
- Create: `src/app/api/shifts/close/route.ts`
- Create: `src/app/api/admin/users/[id]/webhook/route.ts`
- Create: `src/app/api/admin/users/[id]/webhook/test/route.ts`
- Create: `src/app/api/admin/ems-performance/route.ts`
- Create: `src/app/api/admin/ems-performance/[profileId]/route.ts`
- Test: `tests/unit/shifts.test.ts`

- [ ] Write failing service tests for opening/closing conflicts, no-open close, webhook privacy/configuration failures, Discord non-transactionality, attribution and admin authorization guards.
- [ ] Run `pnpm test`; verify the new service exports are absent.
- [ ] Implement server-only shift and webhook services; map expected conflicts to typed errors and sanitize external failures.
- [ ] Implement analytics queries limited by profile/range, paginate profile deliveries on the server, and calculate shift overlap server-side.
- [ ] Implement route handlers with `409` for shift conflicts and no secret fields in JSON responses.
- [ ] Run `pnpm test`; verify all unit tests pass.

### Task 3: EMS and administration UI

**Files:**
- Create: `src/app/shifts/page.tsx`
- Create: `src/components/shifts/shift-panel.tsx`
- Create: `src/app/admin/ems-performance/page.tsx`
- Create: `src/app/admin/ems-performance/[profileId]/page.tsx`
- Create: `src/components/admin/ems-performance-panel.tsx`
- Create: `src/components/admin/ems-performance-detail.tsx`
- Modify: `src/components/app-shell/app-shell.tsx`
- Modify: `src/components/admin/users-panel.tsx`
- Modify: `src/components/ui/index.tsx`

- [ ] Write/update failing tests for timer derivation and UI-safe webhook state shape.
- [ ] Run `pnpm test`; verify the requested helper/UI contract does not yet exist.
- [ ] Add the Bitácora navigation/page, local 60-second elapsed timer with focus refresh and disabled mutation controls.
- [ ] Add admin-only navigation, filtered performance pages, paged deliveries, and the webhook configuration/test dialog that never hydrates a URL.
- [ ] Run `pnpm test`; verify the focused tests pass.

### Task 4: Configuration, documentation, and verification

**Files:**
- Modify: `.env.example`
- Modify: `docs/06_DATABASE.md`
- Modify: `docs/07_AUTH_AND_PERMISSIONS.md`
- Modify: `docs/09_DISCORD_WEBHOOKS.md`
- Modify: `docs/19_ASSUMPTIONS_AND_DECISIONS.md`

- [ ] Document `EMS_WEBHOOK_ENCRYPTION_KEY` as 32 random bytes base64 encoded; document manual migration application and server-only webhook handling.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
