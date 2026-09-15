import assert from "node:assert/strict";
import test from "node:test";
import { addRecentPerson, clearRecentPeople, EMPTY_RECENT_PEOPLE, markPersonRecent, parseRecentPeople, readRecentPeople, subscribeRecentPeople } from "../../src/lib/people/recent-people.ts";

const civil = { id: "civil", displayName: "Mari Hill", type: "civil" as const };
const police = { id: "0626", displayName: "Alicia Rodriguez", type: "police" as const, badgeNumber: "0626" };
function storage(values = new Map<string, string>()) { return { get length() { return values.size; }, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, key: (index: number) => [...values.keys()][index] ?? null }; }

test("recent people are deduplicated, moved first and capped at six", () => {
  const people = Array.from({ length: 7 }, (_, index) => ({ id: String(index), displayName: `Person ${index}`, type: "civil" as const }));
  const capped = people.reduce(addRecentPerson, [] as typeof people);
  assert.equal(capped.length, 6);
  const moved = addRecentPerson(capped, capped[3]);
  assert.equal(moved[0]?.id, capped[3]?.id);
  assert.equal(new Set(moved.map((person) => person.id)).size, 6);
});

test("recent people preserve badge strings and discard unsafe or malformed storage values", () => {
  assert.deepEqual(parseRecentPeople(JSON.stringify([police, { ...civil, documentUrl: "https://private.example" }])), [police, civil]);
  assert.deepEqual(parseRecentPeople("not json"), []);
  assert.deepEqual(parseRecentPeople(JSON.stringify([{ id: "", displayName: "Bad", type: "civil" }])), []);
});

test("logout clears every recent-person session key", () => {
  const values = new Map([["ems-recent-people:one", "[]"], ["other", "keep"], ["ems-recent-people:two", "[]"]]);
  clearRecentPeople({ get length() { return values.size; }, getItem: (key) => values.get(key) ?? null, setItem: () => undefined, removeItem: (key) => { values.delete(key); }, key: (index) => [...values.keys()][index] ?? null });
  assert.deepEqual([...values.keys()], ["other"]);
});

test("recent snapshots stay referentially stable until storage changes", () => {
  const session = storage();
  assert.equal(readRecentPeople("one", session), readRecentPeople("one", session));
  const before = readRecentPeople("one", session);
  markPersonRecent("one", civil, session);
  const after = readRecentPeople("one", session);
  assert.notEqual(after, before);
  assert.equal(after, readRecentPeople("one", session));
});

test("empty, corrupt and cleared snapshots use one stable empty reference per profile", () => {
  const session = storage(new Map([["ems-recent-people:corrupt", "{"], ["ems-recent-people:other", JSON.stringify([civil])]]));
  assert.equal(readRecentPeople("empty", session), EMPTY_RECENT_PEOPLE);
  assert.equal(readRecentPeople("corrupt", session), EMPTY_RECENT_PEOPLE);
  assert.notEqual(readRecentPeople("corrupt", session), readRecentPeople("other", session));
  clearRecentPeople(session);
  assert.equal(readRecentPeople("other", session), EMPTY_RECENT_PEOPLE);
});

test("a subscriber runs once for one recent-person mutation", () => {
  const session = storage();
  const originalWindow = globalThis.window;
  const events = new EventTarget();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: session, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) } });
  let calls = 0;
  const unsubscribe = subscribeRecentPeople("subscriber", () => { calls += 1; });
  markPersonRecent("subscriber", civil);
  unsubscribe();
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  assert.equal(calls, 1);
});
