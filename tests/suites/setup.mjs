import { callRead, callWrite, logCall, logOk, assert } from "../lib/runtime.mjs";
import { wallets } from "./_wallets.mjs";

export const name = "setup";
export async function run() {
  const w = wallets();
  console.log(`  → verifying owner and registering keeper`);
  const owner = await callRead(w.admin, "get_owner", []);
  assert(String(owner).toLowerCase() === w.admin.__address.toLowerCase(),
    `ADMIN_PK is not the owner. on-chain owner=${owner}, our admin=${w.admin.__address}`);

  // is_keeper read may be broken on-chain; we try, then unconditionally re-add (idempotent).
  let already = false;
  try { already = !!(await callRead(w.admin, "is_keeper", [w.keeper.__address])); }
  catch { /* known-broken read */ }

  if (!already) {
    logCall(w.admin, "add_keeper", [w.keeper.__address]);
    const r = await callWrite(w.admin, "add_keeper", [w.keeper.__address]);
    logOk("add_keeper", r.elapsed, r.hash);
  } else {
    console.log(`    keeper already registered`);
  }
}
