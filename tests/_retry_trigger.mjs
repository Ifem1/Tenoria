import "./lib/env.mjs";
import { callRead, callWrite, logCall, logOk, CONTRACT_ADDRESS } from "./lib/runtime.mjs";
import { wallets } from "./suites/_wallets.mjs";

const w = wallets();
const caseId = process.argv[2];
if (!caseId) { console.error("usage: node _retry_trigger.mjs <caseId>"); process.exit(1); }

const c = JSON.parse(await callRead(w.tenant1, "get_case", [caseId]));
console.log("case status:", c.status);

const REVIEW_FEE_WEI = 10_000_000_000_000_000n;
try {
  logCall(w.tenant1, "trigger_review", [caseId]);
  const r = await callWrite(w.tenant1, "trigger_review", [caseId], { value: REVIEW_FEE_WEI, attempts: 1, backoffMs: 8000 });
  logOk("trigger_review", r.elapsed, r.hash);
  const review = JSON.parse(await callRead(w.tenant1, "get_consensus_review", [caseId]));
  console.log("SUCCESS review:", JSON.stringify(review));
} catch (e) {
  console.error("RETRY FAILED:", e?.message || e);
  process.exit(1);
}
