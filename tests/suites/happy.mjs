import { callRead, callWrite, logCall, logOk, assert, assertEq } from "../lib/runtime.mjs";
import { wallets, newCaseId } from "./_wallets.mjs";

export const name = "happy";
export async function run() {
  const w = wallets();
  const caseId = newCaseId("happy");
  const evId = `ev_${caseId}_1`;
  const noteId = `pn_${caseId}_1`;

  // open_case (tenant1)
  const casePayload = {
    landlordWallet: w.landlord1.__address,
    propertyLabel: "Unit 4B, North Court",
    leaseReference: "lease://demo/1",
    category: "REPAIR_DELAY",
    complaintNarrative: "Heating has been broken for 12 days. Three repair requests sent, no engineer dispatched.",
    desiredRemedy: "Send a qualified engineer within 48 hours and apply rent abatement for affected days.",
    urgency: "HIGH",
    visibilityMode: "PARTIES_KEEPER_ADMIN",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  logCall(w.tenant1, "open_case", [caseId, "<json>"]);
  let r = await callWrite(w.tenant1, "open_case", [caseId, JSON.stringify(casePayload)]);
  logOk("open_case", r.elapsed, r.hash);

  let onchain = JSON.parse(await callRead(w.tenant1, "get_case", [caseId]));
  assertEq(onchain.status, "AWAITING_LANDLORD_RESPONSE", "case status after open_case");
  assertEq(onchain.landlordWallet?.toLowerCase(), w.landlord1.__address.toLowerCase(), "landlordWallet stored");
  assert(onchain.complaintNarrative === casePayload.complaintNarrative, "narrative round-trip");

  // submit_landlord_response (landlord1)
  const respPayload = {
    id: `resp_${caseId}`,
    responseNarrative: "Acknowledged. Engineer was scheduled but tenant was not home on attempted visit.",
    leasePolicyPosition: "Clause 7.2 requires reasonable access during 9–5 weekdays.",
    repairActionHistory: "Two engineer dispatches in past 10 days; both unanswered.",
    proposedResolution: "Rebook engineer for Saturday morning at tenant's convenience.",
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  logCall(w.landlord1, "submit_landlord_response", [caseId, "<json>"]);
  r = await callWrite(w.landlord1, "submit_landlord_response", [caseId, JSON.stringify(respPayload)]);
  logOk("submit_landlord_response", r.elapsed, r.hash);

  onchain = JSON.parse(await callRead(w.tenant1, "get_case", [caseId]));
  assertEq(onchain.status, "READY_FOR_KEEPER_CHECK", "case status after landlord response");
  const respOnchain = JSON.parse(await callRead(w.tenant1, "get_landlord_response", [caseId]));
  assertEq(respOnchain.status, "SUBMITTED", "response status");

  // add_evidence (tenant1)
  const evPayload = {
    side: "TENANT", type: "PHOTO",
    title: "Thermostat reading at 11°C",
    description: "Photo of indoor thermostat at 11°C, taken 2026-06-08.",
    uri: "ipfs://demo-evidence-1", hash: "0xabc",
    issuedAt: "2026-06-08T08:30:00Z", privacy: "PUBLIC_TO_PARTIES",
  };
  logCall(w.tenant1, "add_evidence", [evId, caseId, "<json>"]);
  r = await callWrite(w.tenant1, "add_evidence", [evId, caseId, JSON.stringify(evPayload)]);
  logOk("add_evidence", r.elapsed, r.hash);

  const evList = JSON.parse(await callRead(w.tenant1, "get_case_evidence", [caseId]));
  assert(Array.isArray(evList) && evList.length === 1, `evidence list len=${evList?.length}`);
  assertEq(evList[0].id, evId, "evidence id");

  // add_policy_note (tenant1 — no role gate)
  const notePayload = {
    clauseType: "REPAIRS", clauseName: "Repair obligation",
    clauseSummary: "Landlord must remedy heating defects within 14 days of notice during heating season.",
    partyObligation: "Landlord", partyInterpretation: "Tenant cites breach due to 12-day delay.",
  };
  logCall(w.tenant1, "add_policy_note", [noteId, caseId, "<json>"]);
  r = await callWrite(w.tenant1, "add_policy_note", [noteId, caseId, JSON.stringify(notePayload)]);
  logOk("add_policy_note", r.elapsed, r.hash);

  const notes = JSON.parse(await callRead(w.tenant1, "get_policy_notes", [caseId]));
  assert(Array.isArray(notes) && notes.length === 1, `notes len=${notes?.length}`);

  // set_case_timeline (tenant1)
  const timeline = [
    { id: "t1", caseId, eventType: "ISSUE_FIRST_NOTICED", date: Date.now() - 12*86400000, description: "Heating stopped", party: w.tenant1.__address },
    { id: "t2", caseId, eventType: "TENANT_NOTIFIED_LANDLORD", date: Date.now() - 11*86400000, description: "Repair request 1", party: w.tenant1.__address },
  ];
  logCall(w.tenant1, "set_case_timeline", [caseId, "<json>"]);
  r = await callWrite(w.tenant1, "set_case_timeline", [caseId, JSON.stringify(timeline)]);
  logOk("set_case_timeline", r.elapsed, r.hash);

  const tlRaw = await callRead(w.tenant1, "get_case_timeline", [caseId]);
  const tl = JSON.parse(tlRaw);
  assertEq(tl.length, 2, "timeline len");

  // mark_ready_for_review (keeper)
  logCall(w.keeper, "mark_ready_for_review", [caseId]);
  r = await callWrite(w.keeper, "mark_ready_for_review", [caseId]);
  logOk("mark_ready_for_review", r.elapsed, r.hash);

  onchain = JSON.parse(await callRead(w.keeper, "get_case", [caseId]));
  assertEq(onchain.status, "READY_FOR_KEEPER_CHECK", "status after mark_ready");

  // finalize_case (keeper)
  logCall(w.keeper, "finalize_case", [caseId]);
  r = await callWrite(w.keeper, "finalize_case", [caseId]);
  logOk("finalize_case", r.elapsed, r.hash);

  onchain = JSON.parse(await callRead(w.keeper, "get_case", [caseId]));
  assertEq(onchain.status, "FINALIZED", "status after finalize");

  // protocol stats reflect at least 1 case + 1 evidence
  const stats = JSON.parse(await callRead(w.admin, "get_protocol_stats", []));
  assert(Number(stats.case_count) >= 1, `case_count=${stats.case_count}`);
  assert(Number(stats.evidence_count) >= 1, `evidence_count=${stats.evidence_count}`);

  return { caseId, evId, noteId };
}
