export type DashboardStatsState<T> = { state: "ready"; value: T } | { state: "unavailable" };

export async function loadDashboardStats<T>(load: () => Promise<T>): Promise<DashboardStatsState<T>> {
  try { return { state: "ready", value: await load() }; } catch { return { state: "unavailable" }; }
}
