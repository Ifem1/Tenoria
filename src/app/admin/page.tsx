"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/store";
import { getOwner, getProtocolStats } from "@/lib/genlayer/read";
import { addKeeper, removeKeeper, pauseProtocol, unpauseProtocol, assignKeeper } from "@/lib/genlayer/write";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { MediatorButton, AppealButton, KeeperButton } from "@/components/ui/Buttons";

export default function AdminPage() {
  const { address } = useWallet();
  const [owner, setOwner] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const o = await getOwner(); setOwner(o || "");
        const s = await getProtocolStats(); setStats(s);
      } catch (e: any) { setMsg(e?.message || String(e)); }
    })();
  }, []);

  const isOwner = !!(owner && address && owner.toLowerCase() === address.toLowerCase());

  async function run(label: string, fn: () => Promise<string>) {
    setMsg("");
    try { const h = await fn(); setMsg(`${label}: ${h}`); }
    catch (e: any) { setMsg(`${label} failed: ${e?.message || e}`); }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Admin</div>
        <h1 className="font-prata text-3xl text-aubergine">Platform operations</h1>
      </div>

      {!isOwner && (
        <QuietPanel><p className="text-sm">Admin tools require the owner wallet.</p></QuietPanel>
      )}

      {isOwner && (
        <>
          <QuietPanel kicker="Keepers" title="Manage keeper addresses">
            <div className="flex flex-wrap gap-2">
              <KeeperButton onClick={() => {
                const a = window.prompt("Keeper address (0x...)") || "";
                if (a) run("Add keeper", () => addKeeper(a));
              }}>ADD KEEPER</KeeperButton>
              <AppealButton onClick={() => {
                const a = window.prompt("Keeper address to remove") || "";
                if (a) run("Remove keeper", () => removeKeeper(a));
              }}>REMOVE KEEPER</AppealButton>
              <MediatorButton onClick={() => {
                const cid = window.prompt("Case ID") || "";
                const k = window.prompt("Keeper address") || "";
                if (cid && k) run("Assign keeper", () => assignKeeper(cid, k));
              }}>ASSIGN KEEPER</MediatorButton>
            </div>
          </QuietPanel>

          <QuietPanel kicker="Protocol" title="Pause / unpause">
            <div className="flex gap-2">
              <AppealButton onClick={() => run("Pause", pauseProtocol)}>PAUSE</AppealButton>
              <KeeperButton onClick={() => run("Unpause", unpauseProtocol)}>UNPAUSE</KeeperButton>
            </div>
          </QuietPanel>

          {stats && (
            <QuietPanel kicker="Aggregate Stats">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mono text-sm">
                <div><div className="text-[10px] uppercase text-walnut">Cases</div>{stats.case_count}</div>
                <div><div className="text-[10px] uppercase text-walnut">Evidence</div>{stats.evidence_count}</div>
                <div><div className="text-[10px] uppercase text-walnut">Reviews</div>{stats.review_count}</div>
                <div><div className="text-[10px] uppercase text-walnut">Reconsider.</div>{stats.reconsideration_count}</div>
                <div><div className="text-[10px] uppercase text-walnut">Paused</div>{String(stats.paused)}</div>
              </div>
            </QuietPanel>
          )}
        </>
      )}
      {msg && <div className="mono text-xs break-all">{msg}</div>}
    </div>
  );
}
