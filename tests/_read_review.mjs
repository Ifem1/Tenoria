import "./lib/env.mjs";
import { callRead } from "./lib/runtime.mjs";
import { wallets } from "./suites/_wallets.mjs";
const w = wallets();
const caseId = process.argv[2];
const c = JSON.parse(await callRead(w.tenant1, "get_case", [caseId]));
console.log("case:", JSON.stringify(c));
const raw = await callRead(w.tenant1, "get_consensus_review", [caseId]);
console.log("raw review:", JSON.stringify(raw));
