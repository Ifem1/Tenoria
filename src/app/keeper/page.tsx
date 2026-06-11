"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/store";
import { getKeeperQueue } from "@/lib/genlayer/read";
import { useIsKeeperOrOwner } from "@/lib/genlayer/hooks";
import { QuietPanel, MonoCaseId } from "@/components/ui/QuietPanel";
import { NotFound } from "@/components/ui/NotFound";

export default function KeeperPage() {
  const { address } = useWallet();
  const allowed = useIsKeeperOrOwner(address);
  const [queue, setQueue] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!address || allowed !== true) return;
    (async () => {
      try {
        const q = await getKeeperQueue(address);
        setQueue(Array.isArray(q) ? q : []);
      } catch (e: any) { setErr(e?.message || String(e)); }
    })();
  }, [address, allowed]);

  if (!address) return <NotFound message="Connect your wallet to access this page." />;
  if (allowed === null) return <div className="mono text-xs text-walnut">…</div>;
  if (!allowed) return <NotFound />;

  return (
    <div className="space-y-6">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Keeper</div>
        <h1 className="font-prata text-3xl text-aubergine">Review queue</h1>
      </div>
      {err && <div className="mono text-xs text-dispute">{err}</div>}
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
    </div>
  );
}
