"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { shortcutHref, shouldIgnoreShortcut } from "@/lib/navigation/shortcuts";

export function ShortcutListener({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || shouldIgnoreShortcut(event.target as HTMLElement | null)) return; const href = shortcutHref(event.key); if (!href) return; event.preventDefault(); router.push(href); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [router]);
  return <>{children}</>;
}
