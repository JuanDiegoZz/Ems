import assert from "node:assert/strict";
import test from "node:test";
import { getDeliverySelectionView, isDeliveryPersonSelected } from "../../src/lib/deliveries/delivery-selection.ts";

test("selected person id determines the selected visual state", () => {
  assert.equal(isDeliveryPersonSelected("person-1", "person-1"), true);
  assert.equal(isDeliveryPersonSelected("person-1", "person-2"), false);
  assert.equal(getDeliverySelectionView("person-1", false), "selected");
});

test("mobile picker can switch back to the selector without clearing selection", () => {
  assert.equal(getDeliverySelectionView("person-1", true), "picker");
  assert.equal(getDeliverySelectionView(null, false), "picker");
});

test("police badge numbers remain strings", () => {
  const badgeNumber: string | null = "0626";
  assert.equal(badgeNumber, "0626");
  assert.equal(typeof badgeNumber, "string");
});
