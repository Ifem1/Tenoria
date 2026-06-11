import "./lib/env.mjs";
import { clientFor, callRead, CONTRACT_ADDRESS } from "./lib/runtime.mjs";

const WALLETS = [
  ["ADMIN",     process.env.ADMIN_PK],
  ["LANDLORD1", process.env.LANDLORD1_PK],
  ["TENANT1",   process.env.TENANT1_PK],
  ["TENANT2",   process.env.TENANT2_PK],
  ["LANDLORD2", process.env.LANDLORD2_PK],
  ["TENANT3",   process.env.TENANT3_PK],
  ["TENANT4",   process.env.TENANT4_PK],
].filter(([_, pk]) => !!pk);

console.log(`Step 0 — sanity check`);
console.log(`Contract: ${CONTRACT_ADDRESS}`);
console.log(`Chain:    ${process.env.CHAIN_NAME} (rpc ${process.env.RPC_URL})`);

let anyZero = false;
const summary = [];
for (const [label, pk] of WALLETS) {
  const c = clientFor(pk, label);
  try {
    const bal = await c.getBalance({ address: c.__address });
    const isk = await callRead(c, "is_keeper", [c.__address]).catch(() => null);
    const balG = Number(bal) / 1e18;
    console.log(`  ${label.padEnd(10)} ${c.__address}  bal=${balG.toFixed(4)} GEN  is_keeper=${isk}`);
    summary.push({ label, address: c.__address, balance: balG, isKeeper: isk });
    if (balG === 0) anyZero = true;
  } catch (e) {
    console.error(`  ${label} FAILED: ${e?.message || e}`);
    process.exit(4);
  }
}

const owner = await callRead(clientFor(WALLETS[0][1], WALLETS[0][0]), "get_owner", []).catch(() => null);
const stats = await callRead(clientFor(WALLETS[0][1], WALLETS[0][0]), "get_protocol_stats", []).catch(() => null);
console.log(`  contract owner = ${owner}`);
console.log(`  protocol stats = ${stats}`);

if (anyZero) {
  console.error(`\nFATAL: at least one wallet has 0 GEN balance. Fund and retry.`);
  process.exit(5);
}
if (!owner) {
  console.error(`\nFATAL: get_owner returned null — contract unreachable or ABI mismatch.`);
  process.exit(6);
}

const keeperLabels = summary.filter(s => s.isKeeper).map(s => s.label);
const ownerLabel = summary.find(s => s.address.toLowerCase() === String(owner).toLowerCase())?.label || null;
console.log(`\n  → Owner wallet among test set: ${ownerLabel || "NONE"}`);
console.log(`  → Registered keepers among test set: ${keeperLabels.length ? keeperLabels.join(", ") : "NONE"}`);

console.log(`\nStep 0 OK.`);
