export type LoginPhase = "idle" | "submitting" | "preparing";
type LoginNavigator = { replace: (href: string) => void; refresh: () => void };

export function beginLogin(phase: LoginPhase): LoginPhase { return phase === "idle" ? "submitting" : phase; }
export function prepareLogin(phase: LoginPhase): LoginPhase { return phase === "submitting" ? "preparing" : phase; }
export function failLogin(phase: LoginPhase): LoginPhase { return phase === "idle" ? phase : "idle"; }
export function navigateAfterLogin(router: LoginNavigator) { router.replace("/"); }
