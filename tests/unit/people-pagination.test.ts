import assert from "node:assert/strict";
import test from "node:test";
import { PEOPLE_PAGE_SIZE, getPeoplePageMeta, normalizePeoplePage, normalizePeoplePageSize, parsePeopleQuery, pageAfterCriteriaChange } from "../../src/lib/people/pagination.ts";

test("uses 25 people per page by default", () => {
  assert.equal(PEOPLE_PAGE_SIZE, 25);
  assert.equal(normalizePeoplePageSize(null), 25);
});

test("calculates first, next and last page metadata", () => {
  assert.deepEqual(getPeoplePageMeta(183, 1, 25), { page: 1, pageSize: 25, total: 183, totalPages: 8, from: 1, to: 25 });
  assert.deepEqual(getPeoplePageMeta(183, 2, 25), { page: 2, pageSize: 25, total: 183, totalPages: 8, from: 26, to: 50 });
  assert.deepEqual(getPeoplePageMeta(183, 8, 25), { page: 8, pageSize: 25, total: 183, totalPages: 8, from: 176, to: 183 });
});

test("clamps pages outside the result range and keeps empty results on page 1", () => {
  assert.equal(normalizePeoplePage("invalid"), 1);
  assert.equal(getPeoplePageMeta(183, 99, 25).page, 8);
  assert.equal(getPeoplePageMeta(0, 99, 25).page, 1);
  assert.deepEqual(getPeoplePageMeta(0, 1, 25), { page: 1, pageSize: 25, total: 0, totalPages: 1, from: 0, to: 0 });
});

test("resets to page 1 when search or type changes", () => {
  assert.equal(pageAfterCriteriaChange(6, "car", "", "car", ""), 6);
  assert.equal(pageAfterCriteriaChange(6, "car", "", "carl", ""), 1);
  assert.equal(pageAfterCriteriaChange(6, "car", "", "car", "police"), 1);
});

test("invalid query params fall back to safe values", () => {
  const result = parsePeopleQuery(new URLSearchParams("search=CAR&page=nope&pageSize=999999&type=unknown"));

  assert.deepEqual(result, { search: "CAR", type: "", page: 1, pageSize: 100, includeArchived: false });
});
