export type ToastTone = "success" | "error" | "info";
export type Toast = { id: string; tone: ToastTone; message: string };
export function toastDuration(tone: ToastTone) { return tone === "error" ? 7000 : tone === "info" ? 4000 : 3500; }
export function enqueueToast(current: Toast[], next: Toast) { return [...current, next].slice(-3); }
