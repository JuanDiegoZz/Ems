import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { categoryOptions, filterPrices, searchPrices, validatePriceInput, type PriceCatalogItem } from "../../src/lib/prices/catalog.ts";
import { formatPesos } from "../../src/lib/staff-control/bonus.ts";

const items: PriceCatalogItem[] = [
  { id: "1", name: "Vendajes", category: "Productos", price: 300, unit: "c/u", description: "La ganancia es para ustedes.", active: true, sortOrder: 2, updatedAt: null, updatedBy: null },
  { id: "2", name: "Ultrasonido", category: "Diagnóstico", price: 15000, unit: null, description: "Estudio de imagen.", active: false, sortOrder: 1, updatedAt: null, updatedBy: null },
];

test("price input accepts integer non-negative money and optional text", () => {
  assert.deepEqual(validatePriceInput({ name: " Vendajes ", category: " Productos ", price: 300, unit: " c/u ", description: " Ganancia " }), { name: "Vendajes", category: "Productos", price: 300, unit: "c/u", description: "Ganancia", active: true, sortOrder: 0 });
  assert.throws(() => validatePriceInput({ name: "X", category: "Servicios", price: -1 }), /entero no negativo/);
  assert.throws(() => validatePriceInput({ name: "X", category: "Servicios", price: 1.5 }), /entero no negativo/);
});

test("price search covers name, category and description", () => {
  assert.deepEqual(searchPrices(items, "imagen").map((item) => item.id), ["2"]);
  assert.deepEqual(searchPrices(items, "productos").map((item) => item.id), ["1"]);
  assert.deepEqual(searchPrices(items, "  ").map((item) => item.id), ["1", "2"]);
});

test("price filters keep EMS active-only behavior and expose dynamic categories", () => {
  assert.deepEqual(filterPrices(items, { active: "active", category: "all" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterPrices(items, { active: "inactive", category: "all" }).map((item) => item.id), ["2"]);
  assert.deepEqual(filterPrices(items, { active: "all", category: "Diagnóstico" }).map((item) => item.id), ["2"]);
  assert.deepEqual(categoryOptions(items), ["Servicios", "Productos", "Diagnóstico"]);
});

test("price migration seeds the four requested entries without daily limits", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/20260917010000_price_catalog.sql", import.meta.url), "utf8");
  for (const name of ["Reanimación", "Vendajes", "Analgésicos", "Curación"]) assert.match(sql, new RegExp(name));
  assert.match(sql, /price integer not null check \(price >= 0\)/i);
  assert.match(sql, /revoke all on table public\.price_catalog from anon, authenticated/i);
  assert.doesNotMatch(sql, /Ultrasonido/);
  assert.doesNotMatch(sql, /max.*persona|persona.*max|daily/i);
});

test("price amounts use the existing peso formatter", () => {
  assert.equal(formatPesos(300), "$300");
  assert.equal(formatPesos(15000), "$15,000");
});
