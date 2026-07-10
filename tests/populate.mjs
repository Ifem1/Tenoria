import "./lib/env.mjs";
import { callRead, callWrite, logCall, logOk, CONTRACT_ADDRESS } from "./lib/runtime.mjs";
import { wallets, newCaseId } from "./suites/_wallets.mjs";

const REVIEW_FEE_WEI = 10_000_000_000_000_000n; // 0.01 GEN, matches contract default

let txCount = 0;
async function w(client, fn, args, opts = {}) {
  logCall(client, fn, args);
  const r = await callWrite(client, fn, args, opts);
  logOk(fn, r.elapsed, r.hash);
  txCount++;
  return r;
}

function nowMs() { return Date.now(); }

async function fullLifecycle({
  tenant, landlord, caseId, category, urgency, narrative, remedy,
  extraEvidenceFrom = null, addFlag = false, addReconsideration = false,
  requestMoreInfoFrom = null, skipPolicyAndTimeline = false,
}) {
  console.log(`\n=== case ${caseId} (${tenant.__label} vs ${landlord.__label}) ===`);

  await w(tenant, "open_case", [caseId, JSON.stringify({
    landlordWallet: landlord.__address,
    propertyLabel: `Unit ${caseId.slice(-4)}`,
    leaseReference: `lease://${caseId}`,
    category, complaintNarrative: narrative, desiredRemedy: remedy,
    urgency, visibilityMode: "PARTIES_KEEPER_ADMIN",
    createdAt: nowMs(), updatedAt: nowMs(),
  })]);

  if (requestMoreInfoFrom) {
    await w(requestMoreInfoFrom, "request_more_information", [caseId, JSON.stringify({
      requested: ["Photos of the affected area", "Copy of prior written notice to landlord"],
      note: "Need more detail before landlord response is meaningful.",
    })]);
  }

  await w(landlord, "submit_landlord_response", [caseId, JSON.stringify({
    id: `resp_${caseId}`,
    responseNarrative: "We acknowledge the report and are reviewing next steps.",
    leasePolicyPosition: "Clause 7.2 covers landlord repair obligations within a reasonable window.",
    repairActionHistory: "One prior maintenance visit logged for this unit.",
    proposedResolution: "Schedule inspection within 5 business days.",
    createdAt: nowMs(), updatedAt: nowMs(),
  })]);

  const evId1 = `ev_${caseId}_1`;
  await w(tenant, "add_evidence", [evId1, caseId, JSON.stringify({
    side: "TENANT", type: "PHOTO",
    title: "Condition photo", description: "Photo documenting the reported issue.",
    uri: "https://picsum.photos/seed/" + caseId + "/640/480",
    hash: "0x" + Buffer.from(evId1).toString("hex").slice(0, 40),
    issuedAt: new Date().toISOString(), privacy: "PUBLIC_TO_PARTIES",
  })]);

  if (extraEvidenceFrom) {
    const evId2 = `ev_${caseId}_2`;
    await w(extraEvidenceFrom, "add_evidence", [evId2, caseId, JSON.stringify({
      side: extraEvidenceFrom === landlord ? "LANDLORD" : "TENANT", type: "MESSAGE_THREAD",
      title: "Message thread", description: "Correspondence relevant to the case.",
      uri: "https://example.com/thread/" + caseId,
      privacy: "PUBLIC_TO_PARTIES",
    })]);
  }

  if (!skipPolicyAndTimeline) {
    await w(tenant, "add_policy_note", [`pn_${caseId}`, caseId, JSON.stringify({
      clauseType: "REPAIRS", clauseName: "Repair obligation",
      clauseSummary: "Landlord must remedy defects within a reasonable period after notice.",
      partyObligation: "Landlord", partyInterpretation: "Tenant cites unreasonable delay.",
    })]);

    await w(tenant, "set_case_timeline", [caseId, JSON.stringify([
      { id: "t1", caseId, eventType: "ISSUE_FIRST_NOTICED", date: nowMs() - 10 * 86400000, description: "Issue first noticed", party: tenant.__address },
      { id: "t2", caseId, eventType: "TENANT_NOTIFIED_LANDLORD", date: nowMs() - 9 * 86400000, description: "Landlord notified", party: tenant.__address },
    ])]);
  }

  if (addFlag) {
    await w(tenant, "flag_case", [`flag_${caseId}`, caseId, JSON.stringify({
      reasonCode: "OTHER", note: "Flagging for visibility during population run.",
    })]);
  }

  await w(tenant, "mark_ready_for_review", [caseId]);

  console.log(`  → triggering consensus review (this calls the LLM validators, can take 30-120s)…`);
  await w(tenant, "trigger_review", [caseId], { value: REVIEW_FEE_WEI, attempts: 1, backoffMs: 8000 });

  const review = JSON.parse(await callRead(tenant, "get_consensus_review", [caseId]));
  console.log(`  ruling=${review.ruling} credibility=${review.credibility_band} action=${review.recommended_next_action}`);

  if (addReconsideration) {
    const rid = `rec_${caseId}`;
    await w(tenant, "open_reconsideration", [rid, caseId, JSON.stringify({
      reason: "NEW_EVIDENCE_AVAILABLE",
      explanation: "Additional evidence has come to light since the original review that materially changes the picture.",
      newEvidenceRefs: [],
    })]);
    console.log(`  → triggering reconsideration consensus review…`);
    await w(landlord, "trigger_reconsideration_review", [rid], { value: REVIEW_FEE_WEI, attempts: 1, backoffMs: 8000 });
  }

  await w(tenant, "finalize_case", [caseId]);
  console.log(`  === case ${caseId} complete ===`);
}

console.log(`Populate run`);
console.log(`Contract: ${CONTRACT_ADDRESS}`);

const w_ = wallets();

// Case A — full path incl. reconsideration
await fullLifecycle({
  tenant: w_.tenant1, landlord: w_.landlord1, caseId: newCaseId("popA"),
  category: "REPAIR_DELAY", urgency: "HIGH",
  narrative: "Heating has been broken for 12 days. Three repair requests sent, no engineer dispatched.",
  remedy: "Send a qualified engineer within 48 hours and apply rent abatement for affected days.",
  extraEvidenceFrom: w_.landlord1, addReconsideration: true,
});

// Case B — full path incl. flag
await fullLifecycle({
  tenant: w_.tenant2, landlord: w_.landlord1, caseId: newCaseId("popB"),
  category: "UNSAFE_CONDITION", urgency: "CRITICAL",
  narrative: "Exposed wiring near the kitchen sink reported twice, landlord has not responded.",
  remedy: "Immediate electrician inspection and repair.",
  addFlag: true,
});

// Case C — full path, extra evidence from landlord
await fullLifecycle({
  tenant: w_.tenant3, landlord: w_.landlord2, caseId: newCaseId("popC"),
  category: "DEPOSIT_RELATED", urgency: "MEDIUM",
  narrative: "Deposit not returned 45 days after move-out with no itemized deductions provided.",
  remedy: "Return deposit in full or provide itemized deduction list.",
  extraEvidenceFrom: w_.landlord2,
});

// Case D — landlord requests more info before responding
await fullLifecycle({
  tenant: w_.tenant4, landlord: w_.landlord2, caseId: newCaseId("popD"),
  category: "NOISE_OR_HARASSMENT", urgency: "MEDIUM",
  narrative: "Repeated late-night noise from adjoining unit, multiple written complaints ignored.",
  remedy: "Enforce quiet-hours clause against the neighboring tenant.",
  requestMoreInfoFrom: w_.landlord2,
});

// Case E — cancelled before review (exercises cancel_case)
{
  const caseId = newCaseId("popE");
  console.log(`\n=== case ${caseId} (${w_.tenant1.__label} vs ${w_.landlord2.__label}) — cancel path ===`);
  await w(w_.tenant1, "open_case", [caseId, JSON.stringify({
    landlordWallet: w_.landlord2.__address,
    propertyLabel: `Unit ${caseId.slice(-4)}`,
    category: "OTHER", complaintNarrative: "Filed in error, withdrawing.",
    desiredRemedy: "N/A", urgency: "LOW", visibilityMode: "PARTIES_KEEPER_ADMIN",
    createdAt: nowMs(), updatedAt: nowMs(),
  })]);
  await w(w_.tenant1, "cancel_case", [caseId, "Filed in error"]);
}

// Case F — minimal path, no policy note/timeline, extra flag
await fullLifecycle({
  tenant: w_.tenant2, landlord: w_.landlord2, caseId: newCaseId("popF"),
  category: "UTILITY_ISSUE", urgency: "MEDIUM",
  narrative: "Water heater has been out for a week, no hot water in the unit.",
  remedy: "Repair or replace the water heater within 72 hours.",
  skipPolicyAndTimeline: true, addFlag: true,
});

const stats = JSON.parse(await callRead(w_.admin, "get_protocol_stats", []));
console.log(`\n──── DONE ────`);
console.log(`Total write calls issued this run: ${txCount}`);
console.log(`Protocol stats: ${JSON.stringify(stats)}`);
