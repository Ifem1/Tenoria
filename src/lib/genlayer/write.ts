"use client";
import { getWalletClient, getReadClient, CONTRACT_ADDRESS } from "./client";

let _cachedFeeWei: bigint | null = null;
let _feeFetchedAt = 0;
const FEE_TTL = 30_000;

async function getReviewFeeWei(): Promise<bigint> {
  const now = Date.now();
  if (_cachedFeeWei != null && now - _feeFetchedAt < FEE_TTL) return _cachedFeeWei;
  try {
    const c = await getReadClient();
    const raw: any = await c.readContract({ address: CONTRACT_ADDRESS, functionName: "get_config", args: [] });
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const wei = BigInt(parsed?.review_fee_wei || "0");
    _cachedFeeWei = wei; _feeFetchedAt = now;
    return wei;
  } catch {
    return 10_000_000_000_000_000n; // 0.01 GEN fallback
  }
}

async function write(method: string, args: any[], payable = false): Promise<string> {
  console.log("[write]", method, args, payable ? "payable" : "");
  const { client, account } = await getWalletClient();
  const value: bigint = payable ? await getReviewFeeWei() : 0n;
  console.log("[write] using account", account, "contract", CONTRACT_ADDRESS, "value", value.toString());
  const hash: string = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    value,
  });
  console.log("[write] tx hash", method, hash);
  // Consensus (including LLM-judged reviews) isn't done just because we have a hash —
  // wait for the network to accept the transaction before callers refresh contract state.
  try {
    await client.waitForTransactionReceipt({
      hash,
      status: "ACCEPTED",
      interval: 3000,
      retries: 60,
    });
    console.log("[write] accepted", method, hash);
  } catch (e) {
    console.warn("[write] waitForTransactionReceipt failed/timed out", method, hash, e);
  }
  return hash;
}

// case writes
export const openCase = (id: string, json: string) => write("open_case", [id, json]);
export const submitLandlordResponse = (id: string, json: string) => write("submit_landlord_response", [id, json]);
export const addEvidence = (eid: string, cid: string, json: string) => write("add_evidence", [eid, cid, json]);
export const addPolicyNote = (nid: string, cid: string, json: string) => write("add_policy_note", [nid, cid, json]);
export const setCaseTimeline = (cid: string, json: string) => write("set_case_timeline", [cid, json]);
export const markReadyForReview = (cid: string) => write("mark_ready_for_review", [cid]);
export const requestMoreInformation = (cid: string, json: string) => write("request_more_information", [cid, json]);
export const cancelCase = (cid: string, reason: string) => write("cancel_case", [cid, reason]);
export const finalizeCase = (cid: string) => write("finalize_case", [cid]);
export const flagCase = (fid: string, cid: string, reasonJson: string) => write("flag_case", [fid, cid, reasonJson]);

// payable GenLayer triggers
export const triggerReview = (cid: string) => write("trigger_review", [cid], true);
export const reviewComplaint = (cid: string) => write("review_complaint", [cid], true);
export const triggerReconsiderationReview = (rid: string) => write("trigger_reconsideration_review", [rid], true);
export const reviewReconsideration = (rid: string) => write("review_reconsideration", [rid], true);

// reconsideration
export const openReconsideration = (rid: string, cid: string, json: string) =>
  write("open_reconsideration", [rid, cid, json]);

// admin writes
export const addKeeper = (addr: string) => write("add_keeper", [addr]);
export const removeKeeper = (addr: string) => write("remove_keeper", [addr]);
export const assignKeeper = (cid: string, keeper: string) => write("assign_keeper", [cid, keeper]);
export const adminSetReviewFee = (feeWei: string) => write("admin_set_review_fee", [feeWei]);
export const adminSetKeeperRequired = (required: boolean) => write("admin_set_keeper_required", [required]);
export const pauseProtocol = () => write("pause_protocol", []);
export const unpauseProtocol = () => write("unpause_protocol", []);
export const transferOwnership = (newOwner: string) => write("transfer_ownership", [newOwner]);

// (kept for backwards-compat with old contract function naming on UI side)
export const assessLeasePolicy = (cid: string, clause: string) => write("assess_lease_policy", [cid, clause]);
export const assessEvidenceConflicts = (cid: string) => write("assess_evidence_conflicts", [cid]);
