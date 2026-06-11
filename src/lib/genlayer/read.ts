"use client";
import { getClient, CONTRACT_ADDRESS } from "./client";
import type {
  ComplaintCase, LandlordResponse, CaseEvidence, PolicyNote,
  TimelineEvent, ConsensusReview, Reconsideration, ReconsiderationReview,
} from "@/types";

async function read<T>(method: string, args: any[]): Promise<T | null> {
  const c = await getClient();
  try {
    const raw: string = await c.readContract({
      address: CONTRACT_ADDRESS,
      functionName: method,
      args,
    });
    if (!raw) return null;
    if (typeof raw !== "string") return raw as T;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  } catch (e) {
    console.warn("read failed", method, e);
    return null;
  }
}

export const getCase = (id: string) => read<ComplaintCase>("get_case", [id]);
export const getLandlordResponse = (id: string) => read<LandlordResponse>("get_landlord_response", [id]);
export const getCaseEvidence = (id: string) => read<CaseEvidence[]>("get_case_evidence", [id]);
export const getPolicyNotes = (id: string) => read<PolicyNote[]>("get_policy_notes", [id]);
export const getCaseTimeline = (id: string) => read<TimelineEvent[]>("get_case_timeline", [id]);
export const getConsensusReview = (id: string) => read<ConsensusReview>("get_consensus_review", [id]);
export const getReconsideration = (id: string) => read<Reconsideration>("get_reconsideration", [id]);
export const getReconsiderationReview = (id: string) => read<ReconsiderationReview>("get_reconsideration_review", [id]);
export const getUserCases = (addr: string) => read<string[]>("get_user_cases", [addr]);
export const getKeeperQueue = (addr: string) => read<ComplaintCase[]>("get_keeper_queue", [addr]);
export const getProtocolStats = () => read<Record<string, any>>("get_protocol_stats", []);
export const isKeeper = (addr: string) => read<boolean>("is_keeper", [addr]);
export const getOwner = () => read<string>("get_owner", []);
