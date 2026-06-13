"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/store";
import { getUserCases, getKeeperQueue, isKeeper, getOwner, getProtocolStats } from "@/lib/genlayer/read";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

const STATUS_DOT: Record<string, string> = {
  OPENED:                             "bg-keeper",
  AWAITING_LANDLORD_RESPONSE:         "bg-marigold",
  RESPONSE_SUBMITTED:                 "bg-teal",
  READY_FOR_REVIEW:                   "bg-teal animate-pulse",
  UNDER_REVIEW:                       "bg-mauve animate-pulse",
  REVIEWED:                           "bg-action",
  READY_FOR_RECONSIDERATION_REVIEW:   "bg-marigold animate-pulse",
  RECONSIDERATION_REVIEWED:           "bg-action",
  FINALIZED:                          "bg-aubergine",
  CANCELLED:                          "bg-dispute",
};

const STATUS_LABEL: Record<string, string> = {
  OPENED:                             "Opened",
  AWAITING_LANDLORD_RESPONSE:         "Awaiting Response",
  RESPONSE_SUBMITTED:                 "Response In",
  READY_FOR_REVIEW:                   "Ready for Review",
  UNDER_REVIEW:                       "Under Review",
  REVIEWED:                           "Reviewed",
  READY_FOR_RECONSIDERATION_REVIEW:   "Reconsideration Ready",
  RECONSIDERATION_REVIEWED:           "Reconsidered",
  FINALIZED:                          "Finalized",
  CANCELLED:                          "Cancelled",
};

function CaseCard({ id }: { id: string }) {
  return (
    <Link
      href={`/cases/${id}`}
      className="case-card quiet-panel flex items-center justify-between group hover:border-mauve/40 animate-fadeInUp"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-aubergine/8 border border-mist flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(43,25,61,0.05)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#6E4B7E" strokeWidth="1.2"/>
            <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="#6E4B7E" strokeWidth="1" strokeLinecap="round"/>
            <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="#6E4B7E" strokeWidth="1" strokeLinecap="round"/>
            <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="#6E4B7E" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="mono text-xs text-aubergine group-hover:text-mauve transition-colors">{id}</span>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-30 group-hover:opacity-60 transition-opacity">
        <path d="M4.5 7H9.5M9.5 7L7 4.5M9.5 7L7 9.5" stroke="#2B193D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}

function KeeperCaseCard({ c }: { c: any }) {
  const dot = STATUS_DOT[c.status] || "bg-mist";
  const label = STATUS_LABEL[c.status] || c.status;
  return (
    <Link
      href={`/cases/${c.id}`}
      className="case-card quiet-panel flex items-center justify-between group hover:border-mauve/40 animate-fadeInUp"
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="mono text-xs text-aubergine group-hover:text-mauve transition-colors">{c.id}</span>
        <span className="mono text-[10px] text-walnut/70 hidden sm:inline">{label}</span>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-30 group-hover:opacity-60 transition-opacity">
        <path d="M4.5 7H9.5M9.5 7L7 4.5M9.5 7L7 9.5" stroke="#2B193D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="quiet-panel flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="skeleton w-8 h-8 rounded" />
        <div className="skeleton w-32 h-3 rounded" />
      </div>
      <div className="skeleton w-6 h-3 rounded" />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="quiet-panel text-center animate-fadeInUp">
      <div className="mono text-[10px] uppercase tracking-widest text-walnut mb-1">{label}</div>
      <div className="font-prata text-2xl text-aubergine">{value}</div>
    </div>
  );
}

export function RoleAwareDashboard() {
  const { address } = useWallet();
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [keeperQueue, setKeeperQueue] = useState<any[]>([]);
  const [keeperFlag, setKeeperFlag] = useState(false);
  const [owner, setOwner] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    (async () => {
      try {
        const [ids, k, ownerAddr, s] = await Promise.all([
          getUserCases(address, address),
          getKeeperQueue(address, address),
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
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  if (!address) {
    return <DashboardEmptyState connected={false} />;
  }

  const isOwner = owner && owner.toLowerCase() === address.toLowerCase();

  return (
    <div className="space-y-8 animate-fadeIn">
      {err && <div className="mono text-xs text-dispute">{err}</div>}

      {/* ── Admin stats strip ── */}
      {isOwner && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Cases"          value={stats.case_count} />
          <StatCard label="Evidence"       value={stats.evidence_count} />
          <StatCard label="Reviews"        value={stats.review_count} />
          <StatCard label="Reconsider."    value={stats.reconsideration_count} />
          <StatCard label="Protocol"       value={stats.paused ? "Paused" : "Live"} />
        </div>
      )}

      {/* ── My Cases ── */}
      <section className="space-y-3 animate-fadeInUp delay-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="mono text-xs uppercase tracking-widest text-walnut">My Cases</div>
            <h2 className="font-prata text-xl text-aubergine">Cases involving this wallet</h2>
          </div>
          <Link href="/open-complaint" className="btn-secondary text-xs">+ New</Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : caseIds.length === 0 ? (
          <DashboardEmptyState connected={true} />
        ) : (
          <div className="space-y-2">
            {caseIds.map((id, i) => (
              <div key={id} className={`delay-${Math.min(i * 100, 500)}`}>
                <CaseCard id={id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Keeper queue ── */}
      {(keeperFlag || isOwner) && (
        <section className="space-y-3 animate-fadeInUp delay-200">
          <div>
            <div className="mono text-xs uppercase tracking-widest text-walnut">Keeper Queue</div>
            <h2 className="font-prata text-xl text-aubergine">Cases awaiting your review</h2>
          </div>

          {loading ? (
            <div className="space-y-2"><SkeletonCard /><SkeletonCard /></div>
          ) : keeperQueue.length === 0 ? (
            <div className="quiet-panel text-center py-8 animate-fadeInUp">
              <div className="text-2xl mb-2 opacity-40">✓</div>
              <p className="text-sm text-ink/50">Queue is clear — no cases waiting.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keeperQueue.map((c: any) => <KeeperCaseCard key={c.id} c={c} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
