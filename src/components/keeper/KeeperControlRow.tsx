"use client";
import { useState } from "react";
import { KeeperButton, AppealButton } from "@/components/ui/Buttons";
import { reviewComplaint, markReadyForReview, requestMoreInformation, assessEvidenceConflicts, finalizeCase } from "@/lib/genlayer/write";

export function KeeperControlRow({ caseId, canTrigger }: { caseId: string; canTrigger: boolean }) {
  const [busy, setBusy] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  if (!canTrigger) return null;

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label); setMsg("");
    try {
      const hash = await fn();
      setMsg(`${label} submitted: ${hash}`);
    } catch (e: any) {
      setMsg(`${label} failed: ${e?.message || e}`);
    } finally { setBusy(""); }
  }

  return (
    <div className="quiet-panel">
      <div className="mono text-xs uppercase tracking-widest text-walnut">Keeper / Admin Control Row</div>
      <div className="flex flex-wrap gap-2 mt-3">
        <KeeperButton disabled={!!busy} onClick={() => run("Send to consensus review", () => reviewComplaint(caseId))}>
          SEND TO CONSENSUS REVIEW
        </KeeperButton>
        <KeeperButton disabled={!!busy} onClick={() => run("Mark ready", () => markReadyForReview(caseId))}>
          MARK READY
        </KeeperButton>
        <KeeperButton disabled={!!busy} onClick={() => run("Assess evidence conflicts", () => assessEvidenceConflicts(caseId))}>
          ASSESS EVIDENCE CONFLICTS
        </KeeperButton>
        <KeeperButton disabled={!!busy} onClick={() => {
          const reason = window.prompt("What more information is needed?") || "";
          if (reason) run("Request more info", () => requestMoreInformation(caseId, JSON.stringify({ reason })));
        }}>REQUEST MORE INFORMATION</KeeperButton>
        <AppealButton disabled={!!busy} onClick={() => run("Finalize", () => finalizeCase(caseId))}>FINALIZE CASE</AppealButton>
      </div>
      {busy && <div className="mono text-xs mt-2 text-mauve">…{busy}</div>}
      {msg && <div className="mono text-xs mt-2 break-all">{msg}</div>}
    </div>
  );
}
