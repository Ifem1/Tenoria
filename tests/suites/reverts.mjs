import { callRead, callWrite, expectRevert, logCall, assert, assertEq } from "../lib/runtime.mjs";
import { wallets, newCaseId } from "./_wallets.mjs";

export const name = "reverts";
export async function run() {
  const w = wallets();
  const caseId = newCaseId("rev");
  const checks = [];

  function record(label, res) {
    const ok = res.ok;
    console.log(`    ${ok ? "✓" : "✗"} revert: ${label} ${ok ? `(stderr=${(res.stderr||"").slice(0,80)})` : `EXEC=${res.exec}`}`);
    checks.push({ label, ok, hash: res.hash, stderr: res.stderr });
    if (!ok) { const e = new Error(`expected revert: ${label}`); e.isAssert = true; throw e; }
  }

  // Set up a base case for downstream reverts (use tenant2 → landlord2)
  const base = {
    landlordWallet: w.landlord2.__address, propertyLabel: "Unit 2A",
    category: "REPAIR_DELAY", complaintNarrative: "Hot water out for one week.",
    desiredRemedy: "Repair", urgency: "MEDIUM",
    visibilityMode: "PARTIES_KEEPER_ADMIN", createdAt: Date.now(), updatedAt: Date.now(),
  };
  logCall(w.tenant2, "open_case", [caseId, "<json>"]);
  const r = await callWrite(w.tenant2, "open_case", [caseId, JSON.stringify(base)]);
  console.log(`    ✓ baseline open_case tx=${r.hash}`);

  // 1. Duplicate case_id → "Case already exists"
  record("duplicate case_id",
    await expectRevert(w.tenant2, "open_case", [caseId, JSON.stringify(base)]));

  // 2. Missing landlordWallet → "landlordWallet required"
  const badId = newCaseId("rev");
  const noLandlord = { ...base, landlordWallet: "" };
  record("missing landlordWallet",
    await expectRevert(w.tenant2, "open_case", [badId, JSON.stringify(noLandlord)]));

  // 3. Missing complaintNarrative → "complaintNarrative required"
  const noNarrative = { ...base, complaintNarrative: "" };
  const badId2 = newCaseId("rev");
  record("missing complaintNarrative",
    await expectRevert(w.tenant2, "open_case", [badId2, JSON.stringify(noNarrative)]));

  // 4. Invalid case JSON → "Invalid case JSON"
  const badId3 = newCaseId("rev");
  record("invalid case JSON",
    await expectRevert(w.tenant2, "open_case", [badId3, "{not-json"]));

  // 5. Wrong landlord responding → "Only named landlord may respond"
  record("wrong landlord responding",
    await expectRevert(w.landlord1, "submit_landlord_response", [caseId, JSON.stringify({ responseNarrative: "x" })]));

  // 6. Response to nonexistent case → "Case not found"
  record("response to missing case",
    await expectRevert(w.landlord2, "submit_landlord_response", ["case_does_not_exist", JSON.stringify({ responseNarrative: "x" })]));

  // 7. Non-keeper calling mark_ready_for_review
  record("non-keeper mark_ready_for_review",
    await expectRevert(w.tenant2, "mark_ready_for_review", [caseId]));

  // 8. Non-keeper calling finalize_case
  record("non-keeper finalize_case",
    await expectRevert(w.tenant2, "finalize_case", [caseId]));

  // 9. Non-owner add_keeper
  record("non-owner add_keeper",
    await expectRevert(w.tenant3, "add_keeper", [w.tenant4.__address]));

  // 10. Non-owner remove_keeper
  record("non-owner remove_keeper",
    await expectRevert(w.tenant3, "remove_keeper", [w.keeper.__address]));

  // 11. Non-owner pause_protocol
  record("non-owner pause_protocol",
    await expectRevert(w.tenant3, "pause_protocol", []));

  // 12. Reconsideration by non-party (tenant3 attacking tenant2's case)
  record("reconsideration by non-party",
    await expectRevert(w.tenant3, "open_reconsideration",
      [newCaseId("rec"), caseId, JSON.stringify({ reason: "NEW_EVIDENCE_AVAILABLE", explanation: "x" })]));

  // 13. Evidence to nonexistent case → "Case not found"
  record("evidence to missing case",
    await expectRevert(w.tenant2, "add_evidence",
      [newCaseId("ev"), "case_does_not_exist", JSON.stringify({ side: "TENANT", type: "PHOTO", uri: "x" })]));

  // 14. Invalid evidence JSON → "Invalid evidence JSON"
  record("invalid evidence JSON",
    await expectRevert(w.tenant2, "add_evidence",
      [newCaseId("ev"), caseId, "{not-json"]));

  // 15. Non-keeper assess_evidence_conflicts
  record("non-keeper assess_evidence_conflicts",
    await expectRevert(w.tenant2, "assess_evidence_conflicts", [caseId]));

  // After all reverts, baseline case must still be in AWAITING_LANDLORD_RESPONSE
  const baseAfter = JSON.parse(await callRead(w.tenant2, "get_case", [caseId]));
  assertEq(baseAfter.status, "AWAITING_LANDLORD_RESPONSE", "baseline case status unchanged after reverts");

  console.log(`    ✓ all ${checks.length} revert assertions passed; baseline case state unchanged`);
  return { caseId, count: checks.length };
}
