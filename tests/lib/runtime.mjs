import { createClient, createAccount, chains } from "genlayer-js";
import { need } from "./env.mjs";

const CONTRACT = need("CONTRACT_ADDRESS");
const RPC = need("RPC_URL");
const CHAIN = chains[need("CHAIN_NAME")];
if (!CHAIN) { console.error("FATAL: unknown CHAIN_NAME"); process.exit(3); }

const clients = new Map();
export function clientFor(pk, label) {
  if (clients.has(label)) return clients.get(label);
  const account = createAccount(pk);
  const c = createClient({ chain: CHAIN, endpoint: RPC, account });
  c.__label = label;
  c.__address = account.address;
  clients.set(label, c);
  return c;
}

export const CONTRACT_ADDRESS = CONTRACT;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function tail2(s) {
  if (!s) return "";
  const lines = String(s).trim().split(/\r?\n/);
  return lines.slice(-2).join(" | ");
}

function extractStderr(tx) {
  try {
    const lr = tx?.consensus_data?.leader_receipt;
    const arr = Array.isArray(lr) ? lr : (lr ? [lr] : []);
    for (const r of arr) {
      const s = r?.stderr || r?.result?.stderr || r?.eq_outputs?.leader || "";
      if (s) return tail2(s);
    }
    return tail2(JSON.stringify(tx?.consensus_data || tx || {}, null, 2)).slice(0, 800);
  } catch { return ""; }
}

function extractExecResult(tx) {
  try {
    const lr = tx?.consensus_data?.leader_receipt;
    const arr = Array.isArray(lr) ? lr : (lr ? [lr] : []);
    for (const r of arr) {
      const e = r?.execution_result || r?.result?.execution_result;
      if (e) return String(e);
    }
    return null;
  } catch { return null; }
}

const SUCCESS = new Set(["SUCCESS", "ACCEPTED", "FINALIZED"]);

export async function callRead(client, functionName, args = []) {
  return client.readContract({ address: CONTRACT, functionName, args });
}

export async function callWrite(client, functionName, args = [], { attempts = 3, backoffMs = 5000, allowRevert = false } = {}) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const t0 = Date.now();
      const hash = await client.writeContract({ address: CONTRACT, functionName, args, value: 0n });
      await client.waitForTransactionReceipt({ hash, retries: 200, interval: 3000 });
      const tx = await client.getTransaction({ hash });
      const exec = extractExecResult(tx);
      const elapsed = Date.now() - t0;
      if (exec && SUCCESS.has(exec)) {
        return { hash, exec, tx, elapsed };
      }
      const stderr = extractStderr(tx);
      const err = new Error(`exec_result=${exec || "UNKNOWN"} stderr=${stderr || "<none>"}`);
      err.hash = hash; err.exec = exec; err.stderr = stderr; err.tx = tx; err.onChainFail = true;
      if (allowRevert) return { hash, exec, tx, elapsed, failed: true, stderr };
      lastErr = err;
      break;
    } catch (e) {
      lastErr = e;
      if (e?.onChainFail) break;
      if (i < attempts) {
        console.log(`    [retry ${i}/${attempts - 1}] ${functionName}: ${e?.message || e}`);
        await sleep(backoffMs);
      }
    }
  }
  throw lastErr;
}

export async function expectRevert(client, functionName, args, { attempts = 1 } = {}) {
  try {
    const r = await callWrite(client, functionName, args, { attempts, allowRevert: true });
    if (r.failed) return { ok: true, hash: r.hash, stderr: r.stderr, exec: r.exec };
    return { ok: false, hash: r.hash, exec: r.exec };
  } catch (e) {
    if (e?.onChainFail) return { ok: true, hash: e.hash, stderr: e.stderr, exec: e.exec };
    return { ok: true, hash: null, stderr: e?.message || String(e), exec: "THROW" };
  }
}

export function assert(cond, msg) {
  if (!cond) { const e = new Error("ASSERT: " + msg); e.isAssert = true; throw e; }
}
export function assertEq(a, b, msg) { assert(JSON.stringify(a) === JSON.stringify(b), `${msg} :: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

export function logCall(client, fn, args) {
  const summary = args.map(a => typeof a === "string" ? (a.length > 24 ? a.slice(0, 22) + "…" : a) : String(a)).join(", ");
  console.log(`    → [${client.__label}] ${fn}(${summary})`);
}
export function logOk(fn, elapsed, hash) {
  console.log(`    ✓ ${fn} (${elapsed}ms) tx=${hash}`);
}
