import "./lib/env.mjs";

const filter = process.argv.slice(2);
const suites = [];
for (const name of ["setup", "happy", "reverts", "nondet"]) {
  if (filter.length === 0 || filter.includes(name)) {
    const m = await import(`./suites/${name}.mjs`);
    suites.push(m);
  }
}

console.log(`Tenoria end-to-end test`);
console.log(`Contract: ${process.env.CONTRACT_ADDRESS}`);
console.log(`Network:  ${process.env.CHAIN_NAME} (${process.env.RPC_URL})`);
console.log(`Suites:   ${suites.map(s => s.name).join(", ")}\n`);

// Step 0
const { default: _ } = await (async () => ({ default: null }))();
const step0 = await import("./step0.mjs").catch(e => { console.error("Step 0 failed:", e?.message || e); process.exit(7); });

const timings = [];
let failedSuite = null;

for (const s of suites) {
  console.log(`\n── suite: ${s.name} ──`);
  const t0 = Date.now();
  try {
    await s.run();
    const elapsed = Date.now() - t0;
    timings.push({ name: s.name, ok: true, elapsedMs: elapsed });
    console.log(`SUMMARY ${s.name}: OK in ${(elapsed/1000).toFixed(1)}s`);
  } catch (e) {
    const elapsed = Date.now() - t0;
    timings.push({ name: s.name, ok: false, elapsedMs: elapsed, error: e?.message || String(e), hash: e?.hash || null, stderr: e?.stderr || null });
    failedSuite = s.name;
    console.error(`SUMMARY ${s.name}: FAILED in ${(elapsed/1000).toFixed(1)}s`);
    console.error(`  error: ${e?.message || e}`);
    if (e?.hash) console.error(`  tx:    ${e.hash}`);
    if (e?.stderr) console.error(`  stderr: ${e.stderr}`);
    break;
  }
}

console.log(`\n──── FINAL ────`);
console.log(`Contract: ${process.env.CONTRACT_ADDRESS}`);
console.log(`Network:  ${process.env.CHAIN_NAME}`);
for (const t of timings) {
  console.log(`  ${t.ok ? "OK    " : "FAILED"}  ${t.name.padEnd(8)}  ${(t.elapsedMs/1000).toFixed(1)}s${t.error ? "  :: " + t.error.slice(0, 200) : ""}`);
}
process.exit(failedSuite ? 1 : 0);
