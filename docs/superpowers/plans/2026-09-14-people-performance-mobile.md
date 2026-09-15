# People Performance Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce people pages to 15 records, export filtered performance as XLSX, and mitigate iOS input zoom.

**Architecture:** Shared pure helpers retain one pagination and performance calculation contract. A server-only route writes SheetJS output and a small client button downloads it.

**Tech Stack:** Next.js 16, TypeScript, SheetJS CE 0.20.3, node:test.

**Spec:** `docs/superpowers/specs/2026-09-14-people-performance-mobile-design.md`

## Global Constraints

- Preserve picker limit 50, business calculations, permissions and all existing unrelated pending changes.
- No OCR, Discord, migration, push or deploy.

### Task 1: Pagination

- [ ] Add failing 15-page metadata tests; implement only the shared constant; verify `pnpm test`.

### Task 2: Shared performance export

- [ ] Add failing report-row/range/quantity/filename tests.
- [ ] Extract the existing computation to a shared report function and add protected XLSX route/UI download.
- [ ] Install SheetJS CE 0.20.3 from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`; verify tests.

### Task 3: Mobile viewport

- [ ] Add viewport and mobile-control contract tests where pure behavior is available.
- [ ] Export explicit Next viewport metadata and mobile 16px form-control CSS; verify lint/typecheck.

### Task 4: Validation

- [ ] Run lint, typecheck, test, build and diff check.
