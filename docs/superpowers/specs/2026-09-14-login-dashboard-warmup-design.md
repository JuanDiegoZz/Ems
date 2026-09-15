# Login and Dashboard Warm-up Design

## Outcome

Give login immediate, accessible feedback; navigate to the operational Dashboard without waiting for secondary data; start safe, silent route warm-up only after Dashboard hydration.

## Design

The login client component owns the explicit `idle`, `submitting`, and `preparing` phases. It changes phase before `fetch`, ignores subsequent submissions while non-idle, and only resets to idle for failure. Success changes to `preparing` before `router.replace("/")`; no refresh is issued.

The page remains a Server Component. A new async statistics section is streamed independently with `Suspense`, alongside the existing streamed activity section. The Dashboard header, quick actions, and client-side shift status do not await statistics. A local error boundary keeps a statistics failure isolated.

After the Dashboard client island mounts, it schedules one route prefetch at a time. It skips constrained connections, schedules remaining work in idle time, and catches failures. It has no private data cache and no user-visible state, so logout requires no cache cleanup.

## Constraints

- No dependency, migration, push, deploy, merge, or modification of `main`.
- No fake percentages, private-document preloads, OCR preload, signed URLs, global private cache, or bulk `Promise.all` warm-up.
- Reduced motion is respected by CSS.
