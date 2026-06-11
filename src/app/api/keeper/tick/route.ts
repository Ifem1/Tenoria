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

const failures: Map<string, number> = (globalThis as any).__tenoriaFailures ||=
  new Map<string, number>();
const inFlight: Set<string> = (globalThis as any).__tenoriaInFlight ||= new Set<string>();

type Case = {
  id: string;
  status: string;
  responseDeadline?: number;
  assignedKeeper?: string;
  urgency?: string;
};

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function isReady(c: Case, hasResponse: boolean, evidenceCount: number): { ready: boolean; reason: string } {
  if (!c) return { ready: false, reason: "no-case" };
  if (c.status === "UNDER_CONSENSUS_REVIEW") return { ready: false, reason: "already-reviewing" };
  if (["FINALIZED", "ACTIONABLE", "PARTIALLY_ACTIONABLE", "NOT_ACTIONABLE"].includes(c.status))
    return { ready: false, reason: "already-ruled" };
  if (c.status === "AWAITING_LANDLORD_RESPONSE") {
    const deadline = Number(c.responseDeadline || 0);
    if (!deadline || deadline > Date.now()) return { ready: false, reason: "response-window-open" };
  }
  if (!hasResponse && evidenceCount === 0) return { ready: false, reason: "no-evidence-no-response" };
  return { ready: true, reason: "ok" };
}

async function loadClient() {
  if (!CONTRACT) throw new Error("CONTRACT_NOT_CONFIGURED");
  if (!KEEPER_KEY) throw new Error("KEEPER_KEY_MISSING");
  const sdk: any = await import("genlayer-js");
  const createClient = sdk.createClient || sdk.default?.createClient;
  const createAccount = sdk.createAccount || sdk.default?.createAccount;
  if (!createClient) throw new Error("genlayer-js: createClient missing");
  const account = createAccount ? createAccount(KEEPER_KEY) : undefined;
  const client = createClient({
    chain: {
      id: CHAIN_ID,
      name: "GenLayer Studionet",
      rpcUrls: { default: { http: [RPC_URL] } },
      nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
    },
    account,
  });
  return client;
}

async function read<T>(client: any, fn: string, args: any[]): Promise<T | null> {
  try {
    const raw = await client.readContract({ address: CONTRACT, functionName: fn, args });
    if (raw == null || raw === "") return null;
    if (typeof raw !== "string") return raw as T;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  } catch {
    return null;
  }
}

async function write(client: any, fn: string, args: any[]): Promise<string> {
  return await client.writeContract({ address: CONTRACT, functionName: fn, args });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    const qs = req.nextUrl.searchParams.get("secret") || "";
    const ok = auth === `Bearer ${CRON_SECRET}` || qs === CRON_SECRET;
    if (!ok) return unauthorized();
  }

  if (!CONTRACT) {
    return NextResponse.json({ ok: false, error: "CONTRACT_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!KEEPER_KEY) {
    return NextResponse.json({ ok: false, error: "KEEPER_KEY_MISSING" }, { status: 503 });
  }

  const started = Date.now();
  let client: any;
  try {
    client = await loadClient();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }

  const keeperAddr = (client.account?.address || "").toLowerCase();
  const queue = (await read<Case[]>(client, "get_keeper_queue", [keeperAddr])) || [];

  const results: any[] = [];
  let triggered = 0;

  for (const c of queue) {
    if (triggered >= MAX_REVIEWS_PER_TICK) break;
    if (inFlight.has(c.id)) { results.push({ id: c.id, action: "skip", reason: "in-flight" }); continue; }
    const fails = failures.get(c.id) || 0;
    if (fails >= MAX_RETRIES) { results.push({ id: c.id, action: "skip", reason: "max-retries" }); continue; }

    const resp = await read<any>(client, "get_landlord_response", [c.id]);
    const ev = (await read<any[]>(client, "get_case_evidence", [c.id])) || [];
    const gate = isReady(c, !!resp, ev.length);
    if (!gate.ready) { results.push({ id: c.id, action: "skip", reason: gate.reason }); continue; }

    inFlight.add(c.id);
    try {
      const hash = await write(client, "review_complaint", [c.id]);
      failures.delete(c.id);
      triggered++;
      results.push({ id: c.id, action: "review", hash });
    } catch (e: any) {
      failures.set(c.id, fails + 1);
      results.push({ id: c.id, action: "error", error: e?.message || String(e), failCount: fails + 1 });
    } finally {
      inFlight.delete(c.id);
    }
  }

  return NextResponse.json({
    ok: true,
    keeper: keeperAddr,
    queueSize: queue.length,
    triggered,
    elapsedMs: Date.now() - started,
    results,
  });
}
