"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/auth/types";
import { dashboardWarmupRoutes, shouldWarmDashboard, startDashboardWarmup } from "@/lib/dashboard/warmup";

function scheduleWhenIdle(task: () => void) {
  const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void) => number; cancelIdleCallback?: (id: number) => void };
  if (idleWindow.requestIdleCallback) { const id = idleWindow.requestIdleCallback(task); return () => idleWindow.cancelIdleCallback?.(id); }
  const id = window.setTimeout(task, 200); return () => window.clearTimeout(id);
}

export function DashboardWarmup({ role }: { role: Profile["role"] }) {
  const router = useRouter();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!shouldWarmDashboard(connection)) return;
    return startDashboardWarmup({ routes: dashboardWarmupRoutes(role), prefetch: router.prefetch, schedule: scheduleWhenIdle });
  }, [role, router]);
  return null;
}
