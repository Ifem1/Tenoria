import { callRead, callWrite, logCall, logOk, assert } from "../lib/runtime.mjs";
import { wallets, newCaseId } from "./_wallets.mjs";

export const name = "nondet";

const ALLOWED_RULINGS = new Set(["ACTIONABLE","PARTIALLY_ACTIONABLE","NEEDS_MORE_EVIDENCE","NOT_ACTIONABLE","LANDLORD_RESPONSE_REQUIRED","ESCALATE_TO_MEDIATION","URGENT_ESCALATION"]);
const ALLOWED_URGENCY = new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);
const ALLOWED_RISK = ALLOWED_URGENCY;
const ALLOWED_BAND = new Set(["LOW","MEDIUM","HIGH"]);
const ALLOWED_CREDIBILITY_BAND = new Set(["WEAK","MODERATE","STRONG"]);
const ALLOWED_LEASE = new Set(["STRONG","PARTIAL","WEAK","NONE","UNCLEAR"]);
const ALLOWED_EV = new Set(["STRONG","MODERATE","WEAK","INSUFFICIENT","CONFLICTING"]);
const ALLOWED_LL = new Set(["COMPLETE","PARTIAL","WEAK","MISSING","CONTRADICTORY"]);
const ALLOWED_REC = new Set(["ORIGINAL_RULING_UPHELD","ORIGINAL_RULING_ADJUSTED","MORE_EVIDENCE_REQUIRED","ESCALATE_TO_HUMAN_MEDIATION","RECONSIDERATION_REJECTED"]);
const ALLOWED_NEXT_ACTION = new Set([
  "REQUEST_LANDLORD_REPAIR_SCHEDULE","REQUEST_TENANT_ADDITIONAL_EVIDENCE","REQUEST_BOTH_PARTIES_EVIDENCE",
  "SCHEDULE_PROPERTY_INSPECTION","ESCALATE_TO_MEDIATION","ESCALATE_URGENT_SAFETY_RISK",
  "DISMISS_INSUFFICIENT_EVIDENCE","AWAIT_LANDLORD_RESPONSE","APPLY_RENT_ABATEMENT",
  "ENFORCE_LEASE_TERM","NO_ACTION_REQUIRED",
]);
const ALLOWED_REASON_CODES = new Set([
  "REPAIR_DELAY","HABITABILITY_ISSUE","LEASE_BACKED","LEASE_UNCLEAR",
  "LANDLORD_NONRESPONSIVE","LANDLORD_PARTIAL_RESPONSE","LANDLORD_ACKNOWLEDGED_OBLIGATION",
  "TENANT_NOTIFIED_LANDLORD","EVIDENCE_INSUFFICIENT","EVIDENCE_MODERATE","EVIDENCE_STRONG",
  "TIMELINE_INCONSISTENT","PRIOR_REQUESTS_DOCUMENTED","URGENCY_SAFETY_RISK",
  "NOTIFICATION_DISPUTE","CONFLICTING_PARTY_NARRATIVES","RETALIATION_CONCERN",
  "DEPOSIT_DISPUTE","ACCESS_DISPUTE","OTHER",
]);

function validateReview(r) {
  assert(ALLOWED_RULINGS.has(r.ruling), `ruling enum: ${r.ruling}`);
  assert(ALLOWED_CREDIBILITY_BAND.has(r.credibility_band), `credibility_band enum: ${r.credibility_band}`);
  assert(ALLOWED_BAND.has(r.actionability_band), `actionability_band enum: ${r.actionability_band}`);
  assert(ALLOWED_BAND.has(r.confidence_band), `confidence_band enum: ${r.confidence_band}`);
  assert(ALLOWED_RISK.has(r.risk_level), `risk_level enum: ${r.risk_level}`);
  assert(ALLOWED_URGENCY.has(r.urgency), `urgency enum: ${r.urgency}`);
  assert(ALLOWED_LEASE.has(r.lease_support), `lease_support enum: ${r.lease_support}`);
  assert(ALLOWED_EV.has(r.evidence_strength), `evidence_strength enum: ${r.evidence_strength}`);
  assert(ALLOWED_LL.has(r.landlord_response_quality), `landlord_response_quality enum: ${r.landlord_response_quality}`);
  assert(ALLOWED_NEXT_ACTION.has(r.recommended_next_action), `recommended_next_action enum: ${r.recommended_next_action}`);
  assert(Array.isArray(r.reason_codes) && r.reason_codes.length >= 1 && r.reason_codes.length <= 5, `reason_codes 1..5: ${r.reason_codes?.length}`);
  for (const code of r.reason_codes) assert(ALLOWED_REASON_CODES.has(code), `reason_code: ${code}`);
}

async function prepareCase(w, label, landlord, tenant) {
  const caseId = newCaseId(label);
  const casePayload = {
    landlordWallet: landlord.__address, propertyLabel: "Unit X",
    leaseReference: "lease://demo", category: "REPAIR_DELAY",
    complaintNarrative: "Mold around bathroom ceiling for 3 weeks. Two repair requests sent, no response. Photo attached.",
    desiredRemedy: "Professional mold removal and repaint within 14 days.",
    urgency: "HIGH", visibilityMode: "PARTIES_KEEPER_ADMIN",
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  logCall(tenant, "open_case", [caseId, "<json>"]);
  let r = await callWrite(tenant, "open_case", [caseId, JSON.stringify(casePayload)]);
  logOk("open_case", r.elapsed, r.hash);

  const resp = {
    id: `r_${caseId}`, responseNarrative: "We were not notified of the second request. Will dispatch within 7 days.",
    leasePolicyPosition: "Habitability clause 9.1 obligates landlord.",
    repairActionHistory: "One inspection completed two months ago.",
    proposedResolution: "Dispatch contractor within 7 days; abate 10% rent for the affected month.",
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  logCall(landlord, "submit_landlord_response", [caseId, "<json>"]);
  r = await callWrite(landlord, "submit_landlord_response", [caseId, JSON.stringify(resp)]);
  logOk("submit_landlord_response", r.elapsed, r.hash);

  const ev = { side: "TENANT", type: "PHOTO", title: "Mold photo", description: "Ceiling corner", uri: "ipfs://x", privacy: "PUBLIC_TO_PARTIES", issuedAt: new Date().toISOString() };
  const evId = `ev_${caseId}`;
  logCall(tenant, "add_evidence", [evId, caseId, "<json>"]);
  r = await callWrite(tenant, "add_evidence", [evId, caseId, JSON.stringify(ev)]);
  logOk("add_evidence", r.elapsed, r.hash);

  const note = { clauseType: "HABITABILITY", clauseName: "Habitability", clauseSummary: "Landlord must keep premises habitable.", partyObligation: "Landlord", partyInterpretation: "Mold is a habitability breach." };
  logCall(tenant, "add_policy_note", [`pn_${caseId}`, caseId, "<json>"]);
  r = await callWrite(tenant, "add_policy_note", [`pn_${caseId}`, caseId, JSON.stringify(note)]);
  logOk("add_policy_note", r.elapsed, r.hash);

  return caseId;
}

export async function run() {
  const w = wallets();

  // ---- review_complaint
  const caseId1 = await prepareCase(w, "ndt", w.landlord1, w.tenant1);
  logCall(w.keeper, "review_complaint", [caseId1]);
  let r = await callWrite(w.keeper, "review_complaint", [caseId1], { attempts: 2, backoffMs: 10000 });
  logOk("review_complaint", r.elapsed, r.hash);

  const reviewRaw = await callRead(w.keeper, "get_consensus_review", [caseId1]);
  assert(reviewRaw, "consensus_review persisted");
  const review = JSON.parse(reviewRaw);
  validateReview(review);
  console.log(`    ruling=${review.ruling} cred_band=${review.credibility_band} act_band=${review.actionability_band} conf_band=${review.confidence_band} risk=${review.risk_level} action=${review.recommended_next_action} reasons=${review.reason_codes.join(",")}`);
  // case status flipped off UNDER_CONSENSUS_REVIEW
  const c1 = JSON.parse(await callRead(w.keeper, "get_case", [caseId1]));
  assert(c1.status !== "UNDER_CONSENSUS_REVIEW", `status after review = ${c1.status}`);

  // ---- assess_lease_policy
  logCall(w.keeper, "assess_lease_policy", [caseId1, "HABITABILITY"]);
  r = await callWrite(w.keeper, "assess_lease_policy", [caseId1, "HABITABILITY"], { attempts: 2, backoffMs: 10000 });
  logOk("assess_lease_policy", r.elapsed, r.hash);

  // ---- assess_evidence_conflicts
  logCall(w.keeper, "assess_evidence_conflicts", [caseId1]);
  r = await callWrite(w.keeper, "assess_evidence_conflicts", [caseId1], { attempts: 2, backoffMs: 10000 });
  logOk("assess_evidence_conflicts", r.elapsed, r.hash);

  // ---- review_reconsideration (need fresh case + a reconsideration request)
  const caseId2 = await prepareCase(w, "ndt2", w.landlord2, w.tenant3);
  logCall(w.keeper, "review_complaint", [caseId2]);
  r = await callWrite(w.keeper, "review_complaint", [caseId2], { attempts: 2, backoffMs: 10000 });
  logOk("review_complaint", r.elapsed, r.hash);

  const recId = `rec_${caseId2}`;
  const recPayload = { reason: "NEW_EVIDENCE_AVAILABLE", explanation: "New plumber report confirms mold extends behind drywall.", newEvidenceRefs: ["ipfs://report"] };
  logCall(w.tenant3, "open_reconsideration", [recId, caseId2, "<json>"]);
  r = await callWrite(w.tenant3, "open_reconsideration", [recId, caseId2, JSON.stringify(recPayload)]);
  logOk("open_reconsideration", r.elapsed, r.hash);

  logCall(w.keeper, "review_reconsideration", [recId]);
  r = await callWrite(w.keeper, "review_reconsideration", [recId], { attempts: 2, backoffMs: 10000 });
  logOk("review_reconsideration", r.elapsed, r.hash);

  const recReviewRaw = await callRead(w.keeper, "get_reconsideration_review", [recId]);
  assert(recReviewRaw, "reconsideration_review persisted");
  const recReview = JSON.parse(recReviewRaw);
  assert(ALLOWED_REC.has(recReview.reconsideration_decision), `recon decision enum: ${recReview.reconsideration_decision}`);
  assert(ALLOWED_RULINGS.has(recReview.new_ruling), `new_ruling enum: ${recReview.new_ruling}`);
  assert(typeof recReview.reasoning_summary === "string" && recReview.reasoning_summary.trim(), "recon reasoning_summary non-empty");
  console.log(`    recon decision=${recReview.reconsideration_decision} new_ruling=${recReview.new_ruling}`);

  return { caseId1, caseId2, recId };
}
