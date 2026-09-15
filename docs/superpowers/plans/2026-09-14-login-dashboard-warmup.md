# Login Dashboard Warm-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make login visibly responsive and stream the operational Dashboard before secondary data, with silent post-mount route warm-up.

**Architecture:** Keep the Dashboard as a Server Component and stream slow server sections through isolated Suspense boundaries. Use small pure state/scheduling helpers so node:test can prove login and warm-up behavior without adding a browser-test dependency.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, node:test, CSS.

**Spec:** `docs/superpowers/specs/2026-09-14-login-dashboard-warmup-design.md`

## Global Constraints

- Work only in `C:\Dev\ems-rp-hospital-perf-v2` on `perf/login-dashboard-warmup`.
- Do not add dependencies, fake percentages, shared private-data cache, OCR/document preload, push, deploy, merge, or commit.
- Keep ActiveShiftProvider as the sole active-shift source.

---

### Task 1: Login state contract

**Files:**
- Create: `src/lib/auth/login-feedback.ts`
- Create: `tests/unit/login-feedback.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Produces `beginLogin`, `prepareLogin`, and `failLogin`, returning `"idle" | "submitting" | "preparing"`.

- [ ] Write tests proving first submit enters submitting, repeated submit preserves it, success enters preparing, and each failure returns idle.
- [ ] Run `pnpm test`; tests must fail because the module is missing.
- [ ] Implement the three pure state transitions with no async work.
- [ ] Run `pnpm test`; login state tests pass.

### Task 2: Responsive Login UI

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes `beginLogin`, `prepareLogin`, and `failLogin`.

- [ ] Use the state contract before the authentication `fetch`; disable form controls and expose one polite status message.
- [ ] Change success to preparing before `router.replace("/")`; remove `router.refresh()`.
- [ ] Add a fixed-size CSS spinner and a 180ms visual transition that reduced-motion CSS disables.
- [ ] Run `pnpm lint` and `pnpm typecheck`.

### Task 3: Streamed Dashboard stats

**Files:**
- Create: `src/components/dashboard/dashboard-stats.tsx`
- Create: `src/components/dashboard/dashboard-stats-error.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/unit/dashboard-streaming.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Produces `DashboardStats`, `DashboardStatsSkeleton`, and a client error boundary for statistics.

- [ ] Write tests for a pure Dashboard load contract showing base content does not depend on stats and a stats failure preserves the base result.
- [ ] Run `pnpm test`; tests must fail because the module is missing.
- [ ] Move `deliveryStats()` into an async server section nested under Suspense and wrap it in the local error boundary.
- [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck`.

### Task 4: Silent post-mount warm-up

**Files:**
- Create: `src/lib/dashboard/warmup.ts`
- Create: `src/components/dashboard/dashboard-warmup.tsx`
- Create: `tests/unit/dashboard-warmup.test.ts`
- Modify: `tests/unit/run.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces `shouldWarmDashboard` and `dashboardWarmupRoutes(role)`.

- [ ] Write tests proving constrained connections skip work, routes are sequentially selected only after mount, errors do not escape, and duplicate StrictMode effects cannot run a critical route twice concurrently.
- [ ] Run `pnpm test`; tests must fail because the module is missing.
- [ ] Implement the pure route policy, then a mount-only client island that prefetches one route and queues later routes in idle time with caught errors.
- [ ] Run `pnpm test`, `pnpm lint`, and `pnpm typecheck`.

### Task 5: Full verification

**Files:**
- Modify only implementation/test files required by Tasks 1-4.

- [ ] Review the diff for private preload/cache violations and removed duplicate refresh.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check`.
- [ ] Perform the requested manual browser checks when a local environment is available; record any unavailable check precisely.
