"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/store";
import { getOwner, getProtocolStats } from "@/lib/genlayer/read";
import { addKeeper, removeKeeper, pauseProtocol, unpauseProtocol, assignKeeper } from "@/lib/genlayer/write";
import { getMetaMaskProvider, requestAccounts } from "@/lib/genlayer/provider";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { MediatorButton, AppealButton, KeeperButton } from "@/components/ui/Buttons";

export default function AdminPage() {
  const { address } = useWallet();
  const [owner, setOwner] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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
    setBusy(true); setMsg(`${label}…`);
    try {
      const h = await fn();
      setMsg(`${label}: ${h}`);
    } catch (e: any) {
      const err = e?.message || String(e);
      console.error(`[admin] ${label} failed`, e);
      setMsg(`${label} failed: ${err}`);
    } finally { setBusy(false); }
  }

  async function onAddKeeper() {
    console.log("[ADD_KEEPER] clicked");
    console.log("[ADD_KEEPER] window.ethereum", (window as any).ethereum);
    console.log("[ADD_KEEPER] selectedAddress", (window as any).ethereum?.selectedAddress);
    console.log("[ADD_KEEPER] contract", process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS);
    console.log("[ADD_KEEPER] connected wallet", address, "contract owner", owner, "isOwner", isOwner);

    if (!isOwner) {
      setMsg("Connected wallet is not contract admin. Switch to the owner wallet.");
      return;
    }
    let provider: any;
    try { provider = getMetaMaskProvider(); }
    catch (e: any) { setMsg(e?.message || String(e)); return; }

    try {
      const accounts = await requestAccounts(provider);
      console.log("[ADD_KEEPER] accounts", accounts);
      if (!accounts?.length) { setMsg("MetaMask returned no account"); return; }
    } catch (e: any) {
      console.error("[ADD_KEEPER] eth_requestAccounts failed", e);
      setMsg("MetaMask did not return an account: " + (e?.message || e));
      return;
    }

    const a = (window.prompt("Keeper address (0x...)") || "").trim();
    if (!a) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { setMsg("Invalid address format"); return; }
    await run("Add keeper", () => addKeeper(a));
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Admin</div>
        <h1 className="font-prata text-3xl text-aubergine">Platform operations</h1>
      </div>

      <QuietPanel>
        <div className="mono text-xs space-y-1">
          <div>connected wallet: <span className={isOwner ? "text-action" : "text-dispute"}>{address || "(none)"}</span></div>
          <div>contract owner:   {owner || "(loading)"}</div>
          <div>contract address: {process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "(unset)"}</div>
          <div>is admin: <span className={isOwner ? "text-action" : "text-dispute"}>{String(isOwner)}</span></div>
        </div>
      </QuietPanel>

      {!isOwner && (
        <QuietPanel><p className="text-sm">Admin tools require the owner wallet. Connect <code className="mono">{owner}</code> in MetaMask.</p></QuietPanel>
      )}

      {isOwner && (
        <>
          <QuietPanel kicker="Keepers" title="Manage keeper addresses">
            <div className="flex flex-wrap gap-2">
              <KeeperButton disabled={busy} onClick={onAddKeeper}>ADD KEEPER</KeeperButton>
              <AppealButton disabled={busy} onClick={() => {
                const a = window.prompt("Keeper address to remove") || "";
                if (a) run("Remove keeper", () => removeKeeper(a));
              }}>REMOVE KEEPER</AppealButton>
              <MediatorButton disabled={busy} onClick={() => {
                const cid = window.prompt("Case ID") || "";
                const k = window.prompt("Keeper address") || "";
                if (cid && k) run("Assign keeper", () => assignKeeper(cid, k));
              }}>ASSIGN KEEPER</MediatorButton>
            </div>
          </QuietPanel>

          <QuietPanel kicker="Protocol" title="Pause / unpause">
            <div className="flex gap-2">
              <AppealButton disabled={busy} onClick={() => run("Pause", pauseProtocol)}>PAUSE</AppealButton>
              <KeeperButton disabled={busy} onClick={() => run("Unpause", unpauseProtocol)}>UNPAUSE</KeeperButton>
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
      {msg && <div className="mono text-xs break-all border-l-2 border-mauve pl-3 py-2 bg-cream">{msg}</div>}
    </div>
  );
}
