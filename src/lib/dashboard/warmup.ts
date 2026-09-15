import type { Profile } from "@/lib/auth/types";

type Connection = { saveData?: boolean; effectiveType?: string } | undefined;
type Prefetch = (route: string) => void | Promise<void>;
type Schedule = (task: () => void) => () => void;
const inFlight = new Map<string, Promise<void>>();

export function shouldWarmDashboard(connection: Connection) { return !connection?.saveData && connection?.effectiveType !== "slow-2g" && connection?.effectiveType !== "2g"; }
export function dashboardWarmupRoutes(role: Profile["role"]) { return role === "admin" ? ["/people", "/admin/settings", "/history"] : ["/people", "/history"]; }

function prefetchOnce(route: string, prefetch: Prefetch) {
  const current = inFlight.get(route);
  if (current) return current;
  const task = Promise.resolve().then(() => prefetch(route)).catch(() => undefined);
  inFlight.set(route, task);
  void task.finally(() => inFlight.delete(route));
  return task;
}

export function startDashboardWarmup({ routes, prefetch, schedule }: { routes: string[]; prefetch: Prefetch; schedule: Schedule }) {
  let stopped = false; let cancelScheduled = () => {};
  const next = (index: number) => { if (stopped || !routes[index]) return; void prefetchOnce(routes[index], prefetch).then(() => { if (!stopped) cancelScheduled = schedule(() => next(index + 1)); }); };
  next(0);
  return () => { stopped = true; cancelScheduled(); };
}
