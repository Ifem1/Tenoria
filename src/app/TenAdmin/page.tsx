"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/store";
import { getOwner, getProtocolStats, isKeeper, getConfig } from "@/lib/genlayer/read";
import { addKeeper, removeKeeper, pauseProtocol, unpauseProtocol, assignKeeper, adminSetReviewFee, adminSetKeeperRequired, transferOwnership } from "@/lib/genlayer/write";
import { getMetaMaskProvider, requestAccounts } from "@/lib/genlayer/provider";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { MediatorButton, AppealButton, KeeperButton } from "@/components/ui/Buttons";
import { NotFound } from "@/components/ui/NotFound";

const HARDCODED_OWNER = "0xE3A26A71b2B26aC623A1F1447D28afc6cac0Fb9c".toLowerCase();

export default function TenAdminPage() {
  const { address } = useWallet();
  const [owner, setOwner] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkAddr, setCheckAddr] = useState("");
  const [checkResult, setCheckResult] = useState<null | { addr: string; isKeeper: boolean }>(null);
  const [checking, setChecking] = useState(false);
  const [ownerLoaded, setOwnerLoaded] = useState(false);

  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const o = await getOwner(); setOwner(o || "");
        const s = await getProtocolStats(); setStats(s);
        const cfg = await getConfig(); setConfig(cfg);
      } catch (e: any) { setMsg(e?.message || String(e)); }
      finally { setOwnerLoaded(true); }
    })();
  }, []);

  const connectedLc = (address || "").toLowerCase();
  const isOwner = !!(connectedLc && (
    connectedLc === HARDCODED_OWNER ||
    (owner && connectedLc === owner.toLowerCase())
  ));

  // Hard access gate: anyone not the deployer sees a generic not-found.
  // The page content (and the existence of admin tools) is never revealed.
  if (!connectedLc) {
    return <NotFound message="Connect your wallet to access this page." />;
  }
  if (ownerLoaded && !isOwner) {
    return <NotFound />;
  }
  if (!ownerLoaded) {
    return <div className="mono text-xs text-walnut">…</div>;
  }

  async function onCheckKeeper() {
    const a = checkAddr.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { setCheckResult(null); setMsg("Invalid address format"); return; }
    setChecking(true); setCheckResult(null);
    try {
      const ok = await isKeeper(a);
      setCheckResult({ addr: a, isKeeper: !!ok });
    } catch (e: any) {
      setMsg("Check failed: " + (e?.message || e));
    } finally { setChecking(false); }
  }

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(true); setMsg(`${label}…`);
    try {
      const h = await fn();
      setMsg(`${label}: ${h}`);
    } catch (e: any) {
      console.error(`[admin] ${label} failed`, e);
      setMsg(`${label} failed: ${e?.message || e}`);
    } finally { setBusy(false); }
  }

  async function onAddKeeper() {
    console.log("[ADD_KEEPER] clicked");
    console.log("[ADD_KEEPER] window.ethereum", (window as any).ethereum);
    console.log("[ADD_KEEPER] selectedAddress", (window as any).ethereum?.selectedAddress);
    console.log("[ADD_KEEPER] contract", process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS);
    console.log("[ADD_KEEPER] connected wallet", address, "contract owner", owner, "isOwner", isOwner);

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
        <div className="mono text-xs uppercase tracking-widest text-walnut">Tenoria Operations</div>
        <h1 className="font-prata text-3xl text-aubergine">Platform operations</h1>
      </div>

      <QuietPanel>
        <div className="mono text-xs space-y-1">
          <div>connected wallet: <span className="text-action">{address}</span></div>
          <div>contract owner:   {owner}</div>
          <div>contract address: {process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "(unset)"}</div>
        </div>
      </QuietPanel>

      <QuietPanel kicker="Verify" title="Check if an address is a registered keeper">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={checkAddr}
            onChange={(e) => setCheckAddr(e.target.value)}
            placeholder="0x..."
            className="mono text-sm flex-1 min-w-[280px] border border-mist bg-white px-3 py-2 rounded"
          />
          <KeeperButton disabled={checking} onClick={onCheckKeeper}>
            {checking ? "CHECKING…" : "CHECK"}
          </KeeperButton>
        </div>
        {checkResult && (
          <div className={`mt-3 mono text-sm border-l-2 pl-3 py-2 ${checkResult.isKeeper ? "border-action text-action" : "border-dispute text-dispute"}`}>
            {checkResult.addr} → {checkResult.isKeeper ? "IS a registered keeper ✓" : "is NOT a registered keeper ✗"}
          </div>
        )}
      </QuietPanel>

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

      <QuietPanel kicker="Review fee" title="Set the GEN fee charged on trigger_review">
        <div className="mono text-xs mb-3">
          current: {config ? (Number(BigInt(config.review_fee_wei || "0")) / 1e18).toFixed(6) + " GEN" : "(loading)"}
          {" "}· keeper_required: {String(config?.keeper_required)}
        </div>
        <div className="flex gap-2 flex-wrap">
          <KeeperButton disabled={busy} onClick={() => {
            const gen = window.prompt("New review fee in GEN (e.g. 0.01)") || "";
            if (!gen) return;
            try {
              const wei = BigInt(Math.round(Number(gen) * 1e18));
              run("Set review fee", () => adminSetReviewFee(wei.toString()));
            } catch { setMsg("Invalid number"); }
          }}>SET REVIEW FEE</KeeperButton>
          <KeeperButton disabled={busy} onClick={() => run("Toggle keeper-required", () => adminSetKeeperRequired(!config?.keeper_required))}>
            {config?.keeper_required ? "DISABLE KEEPER-REQUIRED" : "ENABLE KEEPER-REQUIRED"}
          </KeeperButton>
          <AppealButton disabled={busy} onClick={() => {
            const a = window.prompt("New owner address (0x...) — irreversible") || "";
            if (a && /^0x[0-9a-fA-F]{40}$/.test(a)) run("Transfer ownership", () => transferOwnership(a));
            else setMsg("Invalid address");
          }}>TRANSFER OWNERSHIP</AppealButton>
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
      {msg && <div className="mono text-xs break-all border-l-2 border-mauve pl-3 py-2 bg-cream">{msg}</div>}
    </div>
  );
}

