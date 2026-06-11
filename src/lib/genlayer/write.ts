"use client";
import { getWalletClient, CONTRACT_ADDRESS } from "./client";

async function write(method: string, args: any[]): Promise<string> {
  const c = await getWalletClient();
  const hash: string = await c.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    value: 0n,
  });
  return hash;
}

export const openCase = (id: string, json: string) => write("open_case", [id, json]);
export const submitLandlordResponse = (id: string, json: string) => write("submit_landlord_response", [id, json]);
export const addEvidence = (eid: string, cid: string, json: string) => write("add_evidence", [eid, cid, json]);
export const addPolicyNote = (nid: string, cid: string, json: string) => write("add_policy_note", [nid, cid, json]);
export const setCaseTimeline = (cid: string, json: string) => write("set_case_timeline", [cid, json]);
export const assignKeeper = (cid: string, keeper: string) => write("assign_keeper", [cid, keeper]);
export const markReadyForReview = (cid: string) => write("mark_ready_for_review", [cid]);
export const requestMoreInformation = (cid: string, json: string) => write("request_more_information", [cid, json]);
export const openReconsideration = (rid: string, cid: string, json: string) =>
  write("open_reconsideration", [rid, cid, json]);
export const finalizeCase = (cid: string) => write("finalize_case", [cid]);
export const addKeeper = (addr: string) => write("add_keeper", [addr]);
export const removeKeeper = (addr: string) => write("remove_keeper", [addr]);
export const pauseProtocol = () => write("pause_protocol", []);
export const unpauseProtocol = () => write("unpause_protocol", []);
export const reviewComplaint = (cid: string) => write("review_complaint", [cid]);
export const reviewReconsideration = (rid: string) => write("review_reconsideration", [rid]);
export const assessLeasePolicy = (cid: string, clause: string) => write("assess_lease_policy", [cid, clause]);
export const assessEvidenceConflicts = (cid: string) => write("assess_evidence_conflicts", [cid]);
