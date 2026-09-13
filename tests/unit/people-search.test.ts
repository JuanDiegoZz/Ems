import assert from "node:assert/strict";
import test from "node:test";
import { rankPeople } from "../../src/lib/people/search.ts";

const people = [
  { first_name: "Carlito", last_name: "Perez", display_name: "Carlito Perez", badge_number: null },
  { first_name: "Carlitos", last_name: "Mendoza", display_name: "Carlitos Mendoza", badge_number: null },
  { first_name: "Candelaria", last_name: "Cruz", display_name: "Candelaria Cruz", badge_number: "214" },
  { first_name: "Átena", last_name: "Novoa", display_name: "Átena Novoa", badge_number: null },
];

test("people search ranks exact and prefix matches before fuzzy matches", () => {
  assert.equal(rankPeople(people, "carlitos")[0]?.display_name, "Carlitos Mendoza");
  assert.equal(rankPeople(people, "carlitos")[1]?.display_name, "Carlito Perez");
});

test("people search is accent-insensitive and preserves partial badge matches", () => {
  assert.equal(rankPeople(people, "atena")[0]?.display_name, "Átena Novoa");
  assert.equal(rankPeople(people, "21")[0]?.badge_number, "214");
});
