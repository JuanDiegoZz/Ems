import assert from "node:assert/strict";
import test from "node:test";
import { clearPeopleSessionCache, joinPeopleRequest, readPeopleFirstPage, writePeopleFirstPage } from "../../src/lib/people/session-cache.ts";

type Page = { items: string[]; page: number };
const all = { profileId: "ems-a", page: 1, search: "", type: "" as const };

test("people first-page cache keeps all, civil and police separate", () => {
  clearPeopleSessionCache();
  writePeopleFirstPage(all, { items: ["all"], page: 1 });
  writePeopleFirstPage({ ...all, type: "civil" }, { items: ["civil"], page: 1 });
  writePeopleFirstPage({ ...all, type: "police" }, { items: ["police"], page: 1 });
  assert.deepEqual(readPeopleFirstPage<Page>(all), { items: ["all"], page: 1 });
  assert.deepEqual(readPeopleFirstPage<Page>({ ...all, type: "civil" }), { items: ["civil"], page: 1 });
  assert.deepEqual(readPeopleFirstPage<Page>({ ...all, type: "police" }), { items: ["police"], page: 1 });
});

test("people cache excludes later pages and searches", () => {
  clearPeopleSessionCache();
  writePeopleFirstPage({ ...all, page: 2 }, { items: ["page two"], page: 2 });
  writePeopleFirstPage({ ...all, search: "Carlos" }, { items: ["Carlos"], page: 1 });
  assert.equal(readPeopleFirstPage({ ...all, page: 2 }), undefined);
  assert.equal(readPeopleFirstPage({ ...all, search: "Carlos" }), undefined);
});

test("identical consumers share one inflight transport", async () => {
  clearPeopleSessionCache();
  let calls = 0;
  let resolve!: (value: Page) => void;
  const load = () => { calls += 1; return new Promise<Page>((done) => { resolve = done; }); };
  const one = joinPeopleRequest(all, load);
  const two = joinPeopleRequest(all, load);
  resolve({ items: ["Carlos"], page: 1 });
  assert.deepEqual(await one.promise, { items: ["Carlos"], page: 1 });
  assert.deepEqual(await two.promise, { items: ["Carlos"], page: 1 });
  assert.equal(calls, 1);
});

test("canceling one consumer does not abort a shared request", async () => {
  clearPeopleSessionCache();
  let aborted = false;
  let resolve!: (value: Page) => void;
  const load = (signal: AbortSignal) => new Promise<Page>((done) => { signal.addEventListener("abort", () => { aborted = true; }); resolve = done; });
  const one = joinPeopleRequest(all, load);
  const two = joinPeopleRequest(all, load);
  one.cancel();
  resolve({ items: ["Carlos"], page: 1 });
  assert.deepEqual(await two.promise, { items: ["Carlos"], page: 1 });
  assert.equal(aborted, false);
});

test("clearing people cache prevents the next user from reading prior data", () => {
  clearPeopleSessionCache();
  writePeopleFirstPage(all, { items: ["Carlos"], page: 1 });
  clearPeopleSessionCache();
  assert.equal(readPeopleFirstPage<Page>(all), undefined);
});

test("different profiles neither share cache nor inflight transport", async () => {
  clearPeopleSessionCache();
  writePeopleFirstPage(all, { items: ["Ana"], page: 1 });
  assert.equal(readPeopleFirstPage<Page>({ ...all, profileId: "ems-b" }), undefined);
  let calls = 0;
  const load = async () => { calls += 1; return { items: ["Carlos"], page: 1 }; };
  await Promise.all([joinPeopleRequest(all, load).promise, joinPeopleRequest({ ...all, profileId: "ems-b" }, load).promise]);
  assert.equal(calls, 2);
});
