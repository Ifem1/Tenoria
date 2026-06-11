"use client";
import { useState } from "react";
import type { Role, ProtocolConfig } from "@/types";
import { KeeperButton } from "@/components/ui/Buttons";
import { requestMoreInformation, assignKeeper } from "@/lib/genlayer/write";

export function KeeperControlRow({
  caseId, role, config, status,
}: { caseId: string; role: Role; config: ProtocolConfig | null; status: string }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const isKeeperOrAdmin = role === "keeper" || role === "admin";
  if (!isKeeperOrAdmin) return null;

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label); setMsg("");
    try { const hash = await fn(); setMsg(`${label} submitted: ${hash}`); }
    catch (e: any) { setMsg(`${label} failed: ${e?.message || e}`); }
    finally { setBusy(""); }
  }

  return (
    <div className="quiet-panel">
      <div className="mono text-xs uppercase tracking-widest text-walnut">Keeper / Admin Tools</div>
      <div className="flex flex-wrap gap-2 mt-3">
        <KeeperButton disabled={!!busy} onClick={() => {
          const reason = window.prompt("What more information is needed?") || "";
          if (reason) run("Request more info", () => requestMoreInformation(caseId, JSON.stringify({ reason })));
        }}>REQUEST MORE INFORMATION</KeeperButton>
        {role === "admin" && (
          <KeeperButton disabled={!!busy} onClick={() => {
            const k = window.prompt("Keeper address to assign to this case (0x...)") || "";
            if (k) run("Assign keeper", () => assignKeeper(caseId, k));
          }}>ASSIGN KEEPER</KeeperButton>
        )}
      </div>
      <div className="mono text-[10px] text-walnut mt-2">
        status: {status} {config?.keeper_required ? "· keeper-required" : "· any-party-can-trigger"}
      </div>
      {busy && <div className="mono text-xs mt-2 text-mauve">…{busy}</div>}
      {msg && <div className="mono text-xs mt-2 break-all">{msg}</div>}
    </div>
  );
}
