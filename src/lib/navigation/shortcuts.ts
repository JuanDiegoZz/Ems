const destinations = { c: "/deliveries/civil", p: "/deliveries/police", b: "/shifts", n: "/people/new" } as const;
export function shortcutHref(key: string) { return destinations[key.toLowerCase() as keyof typeof destinations] ?? null; }
export function shouldIgnoreShortcut(target: Pick<HTMLElement, "tagName" | "isContentEditable"> | null) { return !target || target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName); }
