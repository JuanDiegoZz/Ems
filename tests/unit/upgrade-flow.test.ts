import assert from "node:assert/strict";
import test from "node:test";
import { getUpgradeDialogOptions, getUpgradeEndpoint, shouldSuppressAcceptedUpgrade, validateUpgradeFields } from "../../src/lib/people/upgrade-flow.ts";

test("upgrade candidate exposes the intended primary dialog action", () => {
  assert.deepEqual(getUpgradeDialogOptions().map((option) => option.label), ["Agregar datos policiales", "Ver registro", "Cancelar"]);
});

test("accepted upgrade uses the existing person endpoint without creating a person", () => {
  assert.equal(getUpgradeEndpoint("person-1"), "/api/people/person-1/upgrade-police");
});

test("upgrade validation requires a badge number and image while preserving leading zeroes", () => {
  assert.equal(validateUpgradeFields("", true), "Ingresa el número de placa.");
  assert.equal(validateUpgradeFields("0626", false), "Agrega una imagen de la placa.");
  assert.equal(validateUpgradeFields("0626", true), null);
});

test("an accepted candidate suppresses the same duplicate prompt until identity changes", () => {
  assert.equal(shouldSuppressAcceptedUpgrade("person-1", "alicia|rodriguez", "person-1", "alicia|rodriguez"), true);
  assert.equal(shouldSuppressAcceptedUpgrade("person-1", "alicia|rodriguez", "person-1", "alicia|ramirez"), false);
});
