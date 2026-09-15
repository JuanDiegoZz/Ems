import assert from "node:assert/strict";
import test from "node:test";
import { enqueueToast, toastDuration, type Toast } from "../../src/lib/feedback/toasts.ts";
import { canPerformRemoteMutation } from "../../src/lib/connectivity/state.ts";
import { shortcutHref, shouldIgnoreShortcut } from "../../src/lib/navigation/shortcuts.ts";

test("toast queue keeps the newest three messages and assigns readable durations", () => {
  const base: Toast[] = [];
  const queued = ["one", "two", "three", "four"].reduce((items, message, index) => enqueueToast(items, { id: String(index), tone: "success", message }), base);
  assert.deepEqual(queued.map((item) => item.message), ["two", "three", "four"]);
  assert.equal(toastDuration("success"), 3500);
  assert.equal(toastDuration("error"), 7000);
});

test("offline blocks remote mutations without changing unrelated state", () => {
  assert.equal(canPerformRemoteMutation(false), false);
  assert.equal(canPerformRemoteMutation(true), true);
});

test("operational shortcuts navigate only outside editable controls", () => {
  assert.equal(shortcutHref("c"), "/deliveries/civil");
  assert.equal(shortcutHref("p"), "/deliveries/police");
  assert.equal(shortcutHref("b"), "/shifts");
  assert.equal(shortcutHref("n"), "/people/new");
  assert.equal(shouldIgnoreShortcut({ tagName: "INPUT", isContentEditable: false }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: "TEXTAREA", isContentEditable: false }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: "BUTTON", isContentEditable: false }), false);
});
