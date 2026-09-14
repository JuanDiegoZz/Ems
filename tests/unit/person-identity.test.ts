import assert from "node:assert/strict";
import test from "node:test";
import { classifyDuplicate } from "../../src/lib/people/duplicates.ts";
import { planPoliceUpgrade, runPoliceUpgradeMutation } from "../../src/lib/people/police-upgrade.ts";
import { isDeliverableCivil, isDeliverablePolice } from "../../src/lib/deliveries/validation.ts";
import { canChangePersonType } from "../../src/lib/people/validation.ts";

const civil = { id: "civil-1", display_name: "MARI HILL", type: "civil" as const, badge_number: null, ine_path: "people/civil-1/ine.png", badge_path: null, archived_at: null };
const police = { ...civil, id: "police-1", type: "police" as const, badge_number: "0626", badge_path: "people/police-1/badge.png" };

test("new civil and police identities without matches can be created", () => {
  assert.equal(classifyDuplicate({ type: "civil", matches: [], possibleMatches: [], badgeMatches: [] }).kind, "none");
  assert.equal(classifyDuplicate({ type: "police", matches: [], possibleMatches: [], badgeMatches: [] }).kind, "none");
});

test("an exact civil match becomes an upgrade candidate only for a police request", () => {
  assert.equal(classifyDuplicate({ type: "police", matches: [civil], possibleMatches: [], badgeMatches: [] }).kind, "upgrade-candidate");
  assert.equal(classifyDuplicate({ type: "civil", matches: [civil], possibleMatches: [], badgeMatches: [] }).kind, "duplicate");
});

test("a police upgrade preserves identity, INE and delivery relation while keeping a leading-zero badge", () => {
  const plan = planPoliceUpgrade(civil, { badgeNumber: "0626", badgePath: "people/civil-1/badge.png" });
  assert.equal(plan.personId, civil.id);
  assert.equal(plan.type, "police");
  assert.equal(plan.inePath, civil.ine_path);
  assert.equal(plan.badgeNumber, "0626");
  assert.equal(plan.deliveryPersonId, civil.id);
});

test("a conflicting badge blocks an upgrade and existing police identities remain duplicates", () => {
  assert.equal(classifyDuplicate({ type: "police", matches: [civil], possibleMatches: [], badgeMatches: [police] }).kind, "badge-conflict");
  assert.equal(classifyDuplicate({ type: "police", matches: [police], possibleMatches: [], badgeMatches: [police] }).kind, "duplicate");
});

test("a police identity cannot be downgraded and fuzzy matches are never upgrade candidates", () => {
  assert.equal(classifyDuplicate({ type: "civil", matches: [police], possibleMatches: [], badgeMatches: [] }).kind, "duplicate");
  assert.equal(classifyDuplicate({ type: "police", matches: [], possibleMatches: [civil], badgeMatches: [] }).kind, "possible");
  assert.equal(canChangePersonType("police", "civil"), false);
  assert.equal(canChangePersonType("civil", "police"), true);
});

test("archived civilian matches are blocked from automatic promotion", () => {
  assert.equal(classifyDuplicate({ type: "police", matches: [], archivedMatches: [{ ...civil, archived_at: "2026-09-13T00:00:00.000Z" }], possibleMatches: [], badgeMatches: [] }).kind, "archived");
});

test("civil delivery eligibility includes police with an INE while police delivery excludes civilians", () => {
  assert.equal(isDeliverableCivil(police), true);
  assert.equal(isDeliverablePolice(civil), false);
  assert.equal(isDeliverablePolice(police), true);
});

test("failed storage or database work never leaves an upgrade mutation partially persisted", async () => {
  let saved = false;
  let cleaned: string[] = [];
  await assert.rejects(() => runPoliceUpgradeMutation({
    upload: async () => { throw new Error("storage"); },
    save: async () => { saved = true; },
    cleanup: async (paths) => { cleaned = paths; },
  }));
  assert.equal(saved, false);
  assert.deepEqual(cleaned, []);

  await assert.rejects(() => runPoliceUpgradeMutation({
    upload: async () => ["people/civil-1/badge.png"],
    save: async () => { throw new Error("database"); },
    cleanup: async (paths) => { cleaned = paths; },
  }));
  assert.deepEqual(cleaned, ["people/civil-1/badge.png"]);
});
