import assert from "node:assert/strict";
import test from "node:test";
import { validateSelectedIne } from "../../src/lib/people/validation.ts";

test("civil creation requires the selected INE file", () => {
  assert.equal(validateSelectedIne("civil", true), null);
  assert.equal(validateSelectedIne("civil", false), "La INE es obligatoria para civiles");
});

test("police creation keeps flexible document rules", () => {
  assert.equal(validateSelectedIne("police", false), null);
});
