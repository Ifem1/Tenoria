import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || 61999);
const CONTRACT = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "";
const KEEPER_KEY = process.env.KEEPER_PRIVATE_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const MAX_REVIEWS_PER_TICK = Number(process.env.KEEPER_MAX_PER_TICK || 5);
const MAX_RETRIES = Number(process.env.KEEPER_MAX_RETRIES || 3);

const failures: Map<string, number> = (globalThis as any).__tenoriaFailures ||= new Map<string, number>();
const inFlight: Set<string> = (globalThis as any).__tenoriaInFlight ||= new Set<string>();

type Case = { id: string; status: string; assignedKeeper?: string; urgency?: string };

function unauthorized() { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

function readyForReview(c: Case): boolean {
  return c.status === "READY_FOR_REVIEW";
}
function readyForReconsideration(c: Case): boolean {
  return c.status === "READY_FOR_RECONSIDERATION_REVIEW";
}

async function loadClient() {
  if (!CONTRACT) throw new Error("CONTRACT_NOT_CONFIGURED");
  if (!KEEPER_KEY) throw new Error("KEEPER_KEY_MISSING");
  const sdk: any = await import("genlayer-js");
  const chain = sdk.chains?.studionet || {
    id: CHAIN_ID, name: "GenLayer Studionet",
    rpcUrls: { default: { http: [RPC_URL] } },
    nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  };
  const account = sdk.createAccount(KEEPER_KEY);
  return sdk.createClient({ chain, endpoint: RPC_URL, account });
}

async function read<T>(client: any, fn: string, args: any[]): Promise<T | null> {
  try {
    const raw = await client.readContract({ address: CONTRACT, functionName: fn, args });
    if (raw == null || raw === "") return null;
    if (typeof raw !== "string") return raw as T;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  } catch { return null; }
}

async function write(client: any, fn: string, args: any[], value: bigint = 0n): Promise<string> {
  return await client.writeContract({ address: CONTRACT, functionName: fn, args, value });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    const qs = req.nextUrl.searchParams.get("secret") || "";
    if (!(auth === `Bearer ${CRON_SECRET}` || qs === CRON_SECRET)) return unauthorized();
  }
  if (!CONTRACT) return NextResponse.json({ ok: false, error: "CONTRACT_NOT_CONFIGURED" }, { status: 503 });
  if (!KEEPER_KEY) return NextResponse.json({ ok: false, error: "KEEPER_KEY_MISSING" }, { status: 503 });

  const started = Date.now();
  let client: any;
  try { client = await loadClient(); }
  catch (e: any) { return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 }); }

  const keeperAddr = (client.account?.address || "").toLowerCase();

  // Pull current review fee from contract so we always pay the correct amount
  const config = await read<any>(client, "get_config", []);
  const feeWei = BigInt(config?.review_fee_wei || "10000000000000000");
  const paused = !!config?.paused;
  if (paused) {
    return NextResponse.json({ ok: true, keeper: keeperAddr, paused: true, triggered: 0 });
  }

  const queue = (await read<Case[]>(client, "get_keeper_queue", [keeperAddr])) || [];
  const results: any[] = [];
  let triggered = 0;

  for (const c of queue) {
    if (triggered >= MAX_REVIEWS_PER_TICK) break;
    if (inFlight.has(c.id)) { results.push({ id: c.id, action: "skip", reason: "in-flight" }); continue; }
    const fails = failures.get(c.id) || 0;
    if (fails >= MAX_RETRIES) { results.push({ id: c.id, action: "skip", reason: "max-retries" }); continue; }

    inFlight.add(c.id);
    try {
      if (readyForReview(c)) {
        const hash = await write(client, "trigger_review", [c.id], feeWei);
        failures.delete(c.id); triggered++;
        results.push({ id: c.id, action: "trigger_review", hash, feeWei: feeWei.toString() });
      } else if (readyForReconsideration(c)) {
        const rid = (c as any).activeReconsiderationId;
        if (!rid) { results.push({ id: c.id, action: "skip", reason: "no-active-reconsideration-id" }); continue; }
        const hash = await write(client, "trigger_reconsideration_review", [rid], feeWei);
        failures.delete(c.id); triggered++;
        results.push({ id: c.id, action: "trigger_reconsideration_review", hash, feeWei: feeWei.toString() });
      } else {
        results.push({ id: c.id, action: "skip", reason: `status=${c.status}` });
      }
    } catch (e: any) {
      failures.set(c.id, fails + 1);
      results.push({ id: c.id, action: "error", error: e?.message || String(e), failCount: fails + 1 });
    } finally { inFlight.delete(c.id); }
  }

  return NextResponse.json({
    ok: true, keeper: keeperAddr, queueSize: queue.length, triggered,
    elapsedMs: Date.now() - started, results,
  });
}
