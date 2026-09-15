import assert from "node:assert/strict";
import test from "node:test";
import { mobileMoreItems, mobilePrimaryItems, routeIsActive } from "../../src/lib/navigation/mobile.ts";

test("mobile navigation always has exactly five primary destinations", () => {
  assert.deepEqual(mobilePrimaryItems.map((item) => item.label), ["Inicio", "Personas", "Entregas", "Bitácora", "Más"]);
});

test("only admins receive administration actions in More", () => {
  assert.deepEqual(mobileMoreItems("ems").map((item) => item.label), ["Historial", "Perfil"]);
  assert.deepEqual(mobileMoreItems("admin").map((item) => item.label), ["Historial", "Perfil", "Personal EMS", "Bonos semanales", "Rendimiento EMS", "Configuración"]);
});

test("navigation active state matches nested routes without marking home active", () => {
  assert.equal(routeIsActive("/people", "/people/abc/edit"), true);
  assert.equal(routeIsActive("/", "/people"), false);
});
