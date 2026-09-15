import assert from "node:assert/strict";
import test from "node:test";
import { beginLogin, failLogin, navigateAfterLogin, prepareLogin, type LoginPhase } from "../../src/lib/auth/login-feedback.ts";

test("login enters submitting immediately and ignores a second submit", () => {
  const submitting = beginLogin("idle");
  assert.equal(submitting, "submitting");
  assert.equal(beginLogin(submitting), "submitting");
});

test("a successful login remains preparing while navigation replaces the page", () => {
  assert.equal(prepareLogin("submitting"), "preparing");
  assert.equal(prepareLogin("preparing"), "preparing");
});

test("authentication and network errors restore the login form to idle", () => {
  const failures: LoginPhase[] = ["submitting", "preparing"];
  for (const phase of failures) assert.equal(failLogin(phase), "idle");
});

test("successful login replaces the route without a duplicate refresh", () => {
  const calls: string[] = [];
  navigateAfterLogin({ replace: (href) => calls.push(`replace:${href}`), refresh: () => calls.push("refresh") });
  assert.deepEqual(calls, ["replace:/"]);
});
