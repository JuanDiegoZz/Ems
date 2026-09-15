export type RecentPerson = { id: string; displayName: string; type: "civil" | "police"; badgeNumber?: string };

const prefix = "ems-recent-people:";
const maxRecentPeople = 6;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
export const EMPTY_RECENT_PEOPLE: readonly RecentPerson[] = Object.freeze([]);
const snapshots = new Map<string, { raw: string | null; people: readonly RecentPerson[] }>();

function isRecentPerson(value: unknown): value is RecentPerson {
  if (!value || typeof value !== "object") return false;
  const person = value as Record<string, unknown>;
  return typeof person.id === "string" && person.id.length > 0 && typeof person.displayName === "string" && person.displayName.length > 0 && (person.type === "civil" || person.type === "police") && (person.badgeNumber === undefined || typeof person.badgeNumber === "string");
}

function clean(person: RecentPerson): RecentPerson {
  return person.badgeNumber === undefined ? { id: person.id, displayName: person.displayName, type: person.type } : { id: person.id, displayName: person.displayName, type: person.type, badgeNumber: person.badgeNumber };
}

export function parseRecentPeople(raw: string | null): RecentPerson[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter(isRecentPerson).map(clean).slice(0, maxRecentPeople) : [];
  } catch { return []; }
}

export function addRecentPerson(people: RecentPerson[], person: RecentPerson): RecentPerson[] {
  return [clean(person), ...people.filter((item) => item.id !== person.id).filter(isRecentPerson).map(clean)].slice(0, maxRecentPeople);
}

function key(profileId: string) { return `${prefix}${profileId}`; }
function notify(profileId: string) { if (typeof window !== "undefined") window.dispatchEvent(new Event(key(profileId))); }
function browserStorage() { return typeof window === "undefined" ? null : window.sessionStorage; }

export function readRecentPeople(profileId: string, storage: StorageLike | null = browserStorage()): readonly RecentPerson[] {
  if (!storage) return EMPTY_RECENT_PEOPLE;
  const storageKey = key(profileId);
  const raw = storage.getItem(storageKey);
  const cached = snapshots.get(storageKey);
  if (cached?.raw === raw) return cached.people;
  const people = raw ? parseRecentPeople(raw) : EMPTY_RECENT_PEOPLE;
  const snapshot = people.length ? people : EMPTY_RECENT_PEOPLE;
  snapshots.set(storageKey, { raw, people: snapshot });
  return snapshot;
}

export function markPersonRecent(profileId: string, person: RecentPerson, storage: StorageLike | null = browserStorage()) {
  if (!storage) return;
  const storageKey = key(profileId);
  const raw = JSON.stringify(addRecentPerson([...readRecentPeople(profileId, storage)], person));
  if (storage.getItem(storageKey) === raw) return;
  storage.setItem(storageKey, raw);
  snapshots.delete(storageKey);
  notify(profileId);
}

export function clearRecentPeople(storage: StorageLike | null = browserStorage()) {
  if (!storage) return;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const storageKey = storage.key(index);
    if (storageKey?.startsWith(prefix)) {
      storage.removeItem(storageKey);
      const profileId = storageKey.slice(prefix.length);
      snapshots.delete(storageKey);
      notify(profileId);
    }
  }
}

export function subscribeRecentPeople(profileId: string, callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const event = key(profileId);
  window.addEventListener(event, callback);
  return () => window.removeEventListener(event, callback);
}
