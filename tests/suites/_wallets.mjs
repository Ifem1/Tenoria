import { clientFor } from "../lib/runtime.mjs";
export function wallets() {
  return {
    admin:     clientFor(process.env.ADMIN_PK,     "ADMIN"),
    keeper:    clientFor(process.env.KEEPER_PK,    "KEEPER"),
    landlord1: clientFor(process.env.LANDLORD1_PK, "LANDLORD1"),
    tenant1:   clientFor(process.env.TENANT1_PK,   "TENANT1"),
    tenant2:   clientFor(process.env.TENANT2_PK,   "TENANT2"),
    landlord2: clientFor(process.env.LANDLORD2_PK, "LANDLORD2"),
    tenant3:   clientFor(process.env.TENANT3_PK,   "TENANT3"),
    tenant4:   clientFor(process.env.TENANT4_PK,   "TENANT4"),
  };
}
export function newCaseId(suite) { return `${suite}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`; }
