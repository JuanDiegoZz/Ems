import assert from "node:assert/strict";
import test from "node:test";
import { globalSearchActions, shouldSearch } from "../../src/lib/people/global-search.ts";
import { DASHBOARD_ACTIVITY_LIMIT } from "../../src/lib/dashboard/activity.ts";

test("global search waits for two characters", () => {
  assert.equal(shouldSearch(""), false);
  assert.equal(shouldSearch("A"), false);
  assert.equal(shouldSearch("AL"), true);
  assert.equal(shouldSearch("0626"), true);
});

test("civil and police results expose only valid quick actions", () => {
  assert.deepEqual(globalSearchActions({ id: "civil", type: "civil" }).map((item) => item.href), ["/people/civil", "/deliveries/civil?personId=civil"]);
  assert.deepEqual(globalSearchActions({ id: "0626", type: "police" }).map((item) => item.href), ["/people/0626", "/deliveries/civil?personId=0626", "/deliveries/police?personId=0626"]);
});

test("dashboard activity uses a small fixed server-side limit", () => {
  assert.equal(DASHBOARD_ACTIVITY_LIMIT, 5);
});
