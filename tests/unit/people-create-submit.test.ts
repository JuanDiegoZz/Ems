import assert from "node:assert/strict";
import test from "node:test";
import { buildPersonCreateFormData, personCreateHttpMessage, postPersonCreate } from "../../src/lib/people/create-submit.ts";

test("builds the create payload with the captured form fields and INE file", () => {
  const form = new FormData();
  form.set("type", "civil");
  form.set("firstName", "MARI");
  form.set("lastName", "HILL");
  form.set("displayName", "MARI HILL");
  const ine = new File(["png"], "clipboard-1.png", { type: "image/png" });

  const result = buildPersonCreateFormData(form, "civil", ine, null);

  assert.equal(result.get("type"), "civil");
  assert.equal(result.get("firstName"), "MARI");
  assert.equal(result.get("lastName"), "HILL");
  assert.equal(result.get("displayName"), "MARI HILL");
  assert.equal((result.get("ine") as File).name, "clipboard-1.png");
  assert.equal(result.get("badge"), null);
});

test("keeps HTTP 400 as an API error", async () => {
  const result = await postPersonCreate(new FormData(), async () => new Response(JSON.stringify({ error: "La INE es obligatoria para civiles" }), { status: 400 }));

  assert.equal(result.kind, "http");
  if (result.kind === "http") {
    assert.equal(result.response.status, 400);
    assert.equal(personCreateHttpMessage(result.response.status, result.payload), "La INE es obligatoria para civiles");
  }
});

test("maps HTTP 401, 403, 409 and 500 without calling them network errors", async () => {
  for (const [status, payload, message] of [
    [401, { error: "No autorizado" }, "Tu sesión expiró. Inicia sesión de nuevo."],
    [403, { error: "Forbidden" }, "No tienes permisos para registrar personas."],
    [409, { error: "Posible duplicado detectado" }, "Posible duplicado detectado"],
    [500, { error: "No se pudo registrar la persona." }, "No se pudo registrar la persona."],
  ] as const) {
    const result = await postPersonCreate(new FormData(), async () => new Response(JSON.stringify(payload), { status }));
    assert.equal(result.kind, "http");
    if (result.kind === "http") assert.equal(personCreateHttpMessage(status, result.payload), message);
  }
});

test("classifies a thrown fetch as a network error", async () => {
  const result = await postPersonCreate(new FormData(), async () => { throw new TypeError("Failed to fetch"); });

  assert.equal(result.kind, "network");
});

test("reads the wrapped person from a 201 response", async () => {
  const result = await postPersonCreate(new FormData(), async () => new Response(JSON.stringify({ person: { id: "person-1" } }), { status: 201 }));

  assert.equal(result.kind, "http");
  if (result.kind === "http") assert.equal((result.payload as { person: { id: string } }).person.id, "person-1");
});
