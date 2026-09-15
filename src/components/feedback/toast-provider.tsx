"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { enqueueToast, toastDuration, type Toast, type ToastTone } from "@/lib/feedback/toasts";

type ToastContextValue = { toast: (tone: ToastTone, message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const toast = useCallback((tone: ToastTone, message: string) => { const id = crypto.randomUUID(); setToasts((current) => enqueueToast(current, { id, tone, message })); window.setTimeout(() => dismiss(id), toastDuration(tone)); }, [dismiss]);
  return <ToastContext.Provider value={{ toast }}>{children}<div className="toast-stack" aria-live="polite">{toasts.map((item) => <div className={`toast toast-${item.tone}`} key={item.id} role={item.tone === "error" ? "alert" : "status"}><span>{item.message}</span><button aria-label="Cerrar notificación" type="button" onClick={() => dismiss(item.id)}>×</button></div>)}</div></ToastContext.Provider>;
}
export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast must be used within ToastProvider"); return { success: (message: string) => context.toast("success", message), error: (message: string) => context.toast("error", message), info: (message: string) => context.toast("info", message) }; }
