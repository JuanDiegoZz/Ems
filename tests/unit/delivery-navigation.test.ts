import assert from "node:assert/strict";
import test from "node:test";
import { deliveryActionsForPerson, deliveryPreselectionMessage, parseDeliveryReturnTo, postPersonDestination } from "../../src/lib/deliveries/navigation.ts";

test("civil detail exposes only the civil delivery action", () => {
  assert.deepEqual(deliveryActionsForPerson({ type: "civil", archived_at: null }), ["civil"]);
});

test("police detail exposes civil and police delivery actions", () => {
  assert.deepEqual(deliveryActionsForPerson({ type: "police", archived_at: null }), ["civil", "police"]);
});

test("archived people cannot be preselected for either delivery", () => {
  assert.deepEqual(deliveryActionsForPerson({ type: "police", archived_at: "2026-09-13T00:00:00.000Z" }), []);
  assert.match(deliveryPreselectionMessage("archived", "civil"), /archivada/);
});

test("ineligible delivery preselection has a friendly type-specific message", () => {
  assert.match(deliveryPreselectionMessage("ineligible", "police"), /entrega policial/);
  assert.match(deliveryPreselectionMessage("ineligible", "civil"), /entrega civil/);
});

test("delivery registration preserves the selected type and person id", () => {
  assert.equal(postPersonDestination("/deliveries/civil", "civil", "person-1"), "/deliveries/civil?personId=person-1");
  assert.equal(postPersonDestination("/deliveries/police", "police", "person-1"), "/deliveries/police?personId=person-1");
  assert.equal(postPersonDestination("/deliveries/civil", "police", "same-id"), "/deliveries/police?personId=same-id");
});

test("only internal delivery return targets are accepted", () => {
  assert.equal(parseDeliveryReturnTo("/deliveries/civil"), "/deliveries/civil");
  assert.equal(parseDeliveryReturnTo("/deliveries/police"), "/deliveries/police");
  assert.equal(parseDeliveryReturnTo("https://evil.example"), null);
  assert.equal(parseDeliveryReturnTo("/people"), null);
});
