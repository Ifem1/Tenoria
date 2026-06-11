"use client";
import { getClient, CONTRACT_ADDRESS } from "./client";
import { GENLAYER_STUDIONET } from "./config";
import type {
  ComplaintCase, LandlordResponse, CaseEvidence, PolicyNote,
  TimelineEvent, ConsensusReview, Reconsideration, ReconsiderationReview, ProtocolConfig,
} from "@/types";

// Cache of per-caller read clients so view calls that gate on _sender()
// inherit the connected wallet's address as `from`.
const clientCache = new Map<string, any>();

async function clientForCaller(caller?: string | null): Promise<any> {
  if (!caller) return await getClient();
  const key = caller.toLowerCase();
  if (clientCache.has(key)) return clientCache.get(key);
  const sdk: any = await import("genlayer-js");
  const chain = sdk.chains?.studionet || {
    id: GENLAYER_STUDIONET.chainId,
    name: GENLAYER_STUDIONET.name,
    rpcUrls: { default: { http: [GENLAYER_STUDIONET.rpcUrl] } },
    nativeCurrency: { name: GENLAYER_STUDIONET.currency, symbol: GENLAYER_STUDIONET.currency, decimals: 18 },
  };
  const c = sdk.createClient({ chain, endpoint: GENLAYER_STUDIONET.rpcUrl, account: key });
  clientCache.set(key, c);
  return c;
}

async function read<T>(method: string, args: any[], caller?: string | null): Promise<T | null> {
  try {
    const c = await clientForCaller(caller);
    const raw: any = await c.readContract({ address: CONTRACT_ADDRESS, functionName: method, args });
    if (raw == null || raw === "") return null;
    if (typeof raw !== "string") return raw as T;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  } catch (e) {
    console.warn("read failed", method, e);
    return null;
  }
}

// Gated reads — pass connected wallet address as caller for on-chain access check
export const getCase = (id: string, caller?: string) => read<ComplaintCase>("get_case", [id], caller);
export const getLandlordResponse = (id: string, caller?: string) => read<LandlordResponse>("get_landlord_response", [id], caller);
export const getCaseEvidence = (id: string, caller?: string) => read<CaseEvidence[]>("get_case_evidence", [id], caller);
export const getPolicyNotes = (id: string, caller?: string) => read<PolicyNote[]>("get_policy_notes", [id], caller);
export const getCaseTimeline = (id: string, caller?: string) => read<TimelineEvent[]>("get_case_timeline", [id], caller);
export const getConsensusReview = (id: string, caller?: string) => read<ConsensusReview>("get_consensus_review", [id], caller);
export const getReconsideration = (id: string, caller?: string) => read<Reconsideration>("get_reconsideration", [id], caller);
export const getReconsiderationReview = (id: string, caller?: string) => read<ReconsiderationReview>("get_reconsideration_review", [id], caller);
export const getCaseFlags = (id: string, caller?: string) => read<any[]>("get_case_flags", [id], caller);
export const getUserCases = (addr: string, caller?: string) => read<string[]>("get_user_cases", [addr], caller || addr);
export const getKeeperQueue = (addr: string, caller?: string) => read<ComplaintCase[]>("get_keeper_queue", [addr], caller || addr);

// Public reads — no caller required
export const getProtocolStats = () => read<Record<string, any>>("get_protocol_stats", []);
export const getConfig = () => read<ProtocolConfig>("get_config", []);
export const isKeeper = (addr: string) => read<boolean>("is_keeper", [addr]);
export const checkKeeper = isKeeper;
export const getOwner = () => read<string>("get_owner", []);
