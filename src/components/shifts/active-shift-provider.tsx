"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { clearActiveShift, completeActiveShiftHydration, failActiveShiftHydration, shouldStartActiveShiftHydration, type ActiveShift } from "@/lib/shifts/active-shift-state";

type ActiveShiftContextValue = { activeShift: ActiveShift | null; loading: boolean; setActiveShift: (shift: ActiveShift | null) => void; clearActiveShift: () => void };
const ActiveShiftContext = createContext<ActiveShiftContextValue | null>(null);

export function ActiveShiftProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useRef(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (pathname === "/login") { hydrated.current = false; return; }
    if (!shouldStartActiveShiftHydration(pathname, hydrated.current)) return;
    const controller = new AbortController();
    let mounted = true;
    void fetch("/api/shifts/current", { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ shift?: ActiveShift | null }> : { shift: null })
      .then((body) => { if (mounted) { const next = completeActiveShiftHydration(body.shift ?? null); setActiveShift(next.activeShift); hydrated.current = true; setLoading(next.loading); } })
      .catch((error: unknown) => { if (mounted && !(error instanceof DOMException && error.name === "AbortError")) { const next = failActiveShiftHydration(); setActiveShift(next.activeShift); hydrated.current = true; setLoading(next.loading); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; controller.abort(); };
  }, [pathname]);
  return <ActiveShiftContext.Provider value={{ activeShift, loading, setActiveShift, clearActiveShift: () => { hydrated.current = false; setActiveShift(clearActiveShift()); setLoading(true); } }}>{children}</ActiveShiftContext.Provider>;
}

export function useActiveShift() {
  const context = useContext(ActiveShiftContext);
  if (!context) throw new Error("useActiveShift must be used within ActiveShiftProvider");
  return context;
}
