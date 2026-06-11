"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/store";
import { getKeeperQueue, isKeeper } from "@/lib/genlayer/read";
import { QuietPanel, MonoCaseId } from "@/components/ui/QuietPanel";

export default function KeeperPage() {
  const { address } = useWallet();
  const [queue, setQueue] = useState<any[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const ok = await isKeeper(address); setAllowed(!!ok);
        const q = await getKeeperQueue(address);
        setQueue(Array.isArray(q) ? q : []);
      } catch (e: any) { setErr(e?.message || String(e)); }
    })();
  }, [address]);

  return (
    <div className="space-y-6">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Keeper</div>
        <h1 className="font-prata text-3xl text-aubergine">Review queue</h1>
      </div>
      {!address && (
        <QuietPanel>
          <p className="text-sm">Connect a wallet to view your assigned cases.</p>
        </QuietPanel>
      )}
      {address && !allowed && (
        <QuietPanel>
          <p className="text-sm">This wallet is not registered as a keeper.</p>
        </QuietPanel>
      )}
      {err && <div className="mono text-xs text-dispute">{err}</div>}
      {allowed && (
        <QuietPanel kicker="Ready Cases">
          {queue.length === 0 ? (
            <p className="text-sm italic text-ink/60">No cases are ready for review.</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((c: any) => (
                <li key={c.id} className="border border-mist rounded p-3 flex justify-between items-center">
                  <div>
                    <MonoCaseId id={c.id} />
                    <div className="text-xs text-walnut mono">{c.status} · {c.urgency} · {c.category}</div>
                  </div>
                  <Link href={`/cases/${c.id}`} className="btn-secondary">OPEN</Link>
                </li>
              ))}
            </ul>
          )}
        </QuietPanel>
      )}
    </div>
  );
}
