"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/store";
import { getUserCases, getKeeperQueue, isKeeper, getOwner, getProtocolStats } from "@/lib/genlayer/read";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { MonoCaseId } from "@/components/ui/QuietPanel";

export function RoleAwareDashboard() {
  const { address } = useWallet();
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [keeperQueue, setKeeperQueue] = useState<any[]>([]);
  const [keeperFlag, setKeeperFlag] = useState(false);
  const [owner, setOwner] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const [ids, k, ownerAddr, s] = await Promise.all([
          getUserCases(address),
          getKeeperQueue(address),
          getOwner(),
          getProtocolStats(),
        ]);
        setCaseIds(Array.isArray(ids) ? ids : []);
        setKeeperQueue(Array.isArray(k) ? k : []);
        setOwner(ownerAddr || "");
        setStats(s);
        const kk = await isKeeper(address);
        setKeeperFlag(!!kk);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, [address]);

  if (!address) {
    return (
      <QuietPanel kicker="Dashboard" title="Connect a wallet">
        <p className="text-sm">Connect your wallet to see your private cases, landlord responses, or keeper queue.</p>
      </QuietPanel>
    );
  }

  const isOwner = owner && owner.toLowerCase() === address.toLowerCase();

  return (
    <div className="space-y-6">
      {err && <div className="mono text-xs text-dispute">{err}</div>}
      <QuietPanel kicker="My Cases" title="Cases involving this wallet">
        {caseIds.length === 0 ? (
          <p className="text-sm italic text-ink/60">
            No private cases yet. <Link href="/open-complaint" className="underline">Open a complaint</Link> or respond to an invitation.
          </p>
        ) : (
          <ul className="space-y-1">
            {caseIds.map(id => (
              <li key={id}>
                <Link href={`/cases/${id}`} className="text-aubergine hover:text-mauve"><MonoCaseId id={id} /></Link>
              </li>
            ))}
          </ul>
        )}
      </QuietPanel>

      {(keeperFlag || isOwner) && (
        <QuietPanel kicker="Keeper Queue" title="Cases awaiting your review">
          {keeperQueue.length === 0 ? (
            <p className="text-sm italic text-ink/60">No cases in the queue.</p>
          ) : (
            <ul className="space-y-1">
              {keeperQueue.map((c: any) => (
                <li key={c.id}>
                  <Link href={`/cases/${c.id}`} className="text-aubergine hover:text-mauve">
                    <MonoCaseId id={c.id} /> · <span className="text-xs text-walnut">{c.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QuietPanel>
      )}

      {isOwner && stats && (
        <QuietPanel kicker="Admin · Aggregate" title="Protocol stats">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mono text-sm">
            <div><div className="text-[10px] uppercase text-walnut">Cases</div>{stats.case_count}</div>
            <div><div className="text-[10px] uppercase text-walnut">Evidence</div>{stats.evidence_count}</div>
            <div><div className="text-[10px] uppercase text-walnut">Reviews</div>{stats.review_count}</div>
            <div><div className="text-[10px] uppercase text-walnut">Reconsider.</div>{stats.reconsideration_count}</div>
            <div><div className="text-[10px] uppercase text-walnut">Paused</div>{String(stats.paused)}</div>
          </div>
        </QuietPanel>
      )}
    </div>
  );
}
