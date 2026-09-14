export function perfTimer(action: string) {
  const startedAt = performance.now();
  if (process.env.NODE_ENV === "development") console.log("[perf] endpoint/action start", { action });
  return () => {
    if (process.env.NODE_ENV === "development") console.log("[perf] endpoint/action end", { action, durationMs: Math.round(performance.now() - startedAt) });
  };
}
