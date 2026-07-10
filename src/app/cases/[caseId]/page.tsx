"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/store";
import {
  getCase, getLandlordResponse, getCaseEvidence, getPolicyNotes,
  getCaseTimeline, getConsensusReview, getReconsiderationReview, getOwner, isKeeper, getConfig,
} from "@/lib/genlayer/read";
import { triggerReview, triggerReconsiderationReview, markReadyForReview, finalizeCase } from "@/lib/genlayer/write";
import type { ComplaintCase, LandlordResponse, CaseEvidence, PolicyNote, TimelineEvent, ConsensusReview, ReconsiderationReview, ProtocolConfig } from "@/types";
import { ConfidentialCaseHeader } from "@/components/quiet-case/ConfidentialCaseHeader";
import { StatementPair } from "@/components/quiet-case/StatementPair";
import { EvidenceTimeline } from "@/components/evidence/EvidenceTimeline";
import { PolicyNotesPanel } from "@/components/policy/PolicyNotesPanel";
import { ConsensusReviewCard } from "@/components/consensus/ConsensusReviewCard";
import { ReconsiderationReviewCard } from "@/components/consensus/ReconsiderationReviewCard";
import { WhyGenLayerPanel } from "@/components/consensus/WhyGenLayerPanel";
import { KeeperControlRow } from "@/components/keeper/KeeperControlRow";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { MediatorButton, KeeperButton, EvidenceButton, AppealButton } from "@/components/ui/Buttons";
import { deriveCaseRole, canViewCase, canRespond, canAddEvidence } from "@/lib/access";

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const { address } = useWallet();
  const [data, setData] = useState<{
    c: ComplaintCase | null; resp: LandlordResponse | null;
    ev: CaseEvidence[]; notes: PolicyNote[]; timeline: TimelineEvent[];
    review: ConsensusReview | null; reconsiderationReview: ReconsiderationReview | null;
    isKeeperFlag: boolean; isOwner: boolean; config: ProtocolConfig | null;
  } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [awaitingConsensus, setAwaitingConsensus] = useState(false);

  async function refresh() {
    if (!caseId || !address) return;
    try {
      const [c, resp, ev, notes, timeline, review, owner, kk, config] = await Promise.all([
        getCase(caseId, address), getLandlordResponse(caseId, address), getCaseEvidence(caseId, address),
        getPolicyNotes(caseId, address), getCaseTimeline(caseId, address), getConsensusReview(caseId, address),
        getOwner(), isKeeper(address), getConfig(),
      ]);
      const rid = c?.activeReconsiderationId || c?.lastReconsiderationId;
      const reconsiderationReview = rid ? await getReconsiderationReview(rid, address) : null;
      setData({
        c, resp, ev: ev || [], notes: notes || [], timeline: timeline || [],
        review, reconsiderationReview, isKeeperFlag: !!kk,
        isOwner: !!(owner && address && owner.toLowerCase() === address.toLowerCase()),
        config,
      });
    } catch (e: any) { setErr(e?.message || String(e)); }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId, address]);

  if (err) return <div className="mono text-sm text-dispute">{err}</div>;
  if (!address) return <QuietPanel><p className="text-sm">Connect your wallet to view this private case.</p></QuietPanel>;
  if (!data) return (
    <div className="space-y-4 animate-fadeIn">
      <div className="quiet-panel space-y-3">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-6 w-64 rounded" />
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton h-8 w-full rounded mt-4" />
      </div>
      <div className="quiet-panel space-y-3">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-16 w-full rounded" />
      </div>
      <div className="quiet-panel space-y-3">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-12 w-full rounded" />
      </div>
    </div>
  );
  if (!data.c) return <QuietPanel title="Case not found"><p className="text-sm">No case exists with this ID, or you don't have access.</p></QuietPanel>;

  const role = deriveCaseRole(data.c, address, data.isKeeperFlag, data.isOwner);
  if (!canViewCase(role)) {
    return (
      <QuietPanel kicker="Access" title="Private case">
        <p className="text-sm">You do not have access to this private case.</p>
      </QuietPanel>
    );
  }

  const status = data.c.status as string;
  const readyForReview = status === "READY_FOR_REVIEW";
  const readyForReconsiderationReview = status === "READY_FOR_RECONSIDERATION_REVIEW";
  const activeReconsiderationId = data.c.activeReconsiderationId;
  const isReviewed = ["REVIEWED","ACTIONABLE","PARTIALLY_ACTIONABLE","NOT_ACTIONABLE","ESCALATED","URGENT_ESCALATION","RECONSIDERATION_REVIEWED","FINALIZED"].includes(status);
  const evidenceCount = data.ev.length;
  const canMarkReady = !!data.resp && evidenceCount > 0 && !readyForReview && !isReviewed && status !== "UNDER_REVIEW" && status !== "CANCELLED";
  const feeWeiStr = data.config?.review_fee_wei || "10000000000000000";
  const feeGen = (Number(BigInt(feeWeiStr)) / 1e18).toFixed(4);

  async function run(label: string, fn: () => Promise<string>, isConsensus = false) {
    setBusy(true); setMsg(`${label}…`);
    if (isConsensus) setAwaitingConsensus(true);
    try { const h = await fn(); setMsg(`${label}: ${h}`); await refresh(); }
    catch (e: any) { console.error(`[case] ${label}`, e); setMsg(`${label} failed: ${e?.message || e}`); }
    finally { setBusy(false); setAwaitingConsensus(false); }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <ConfidentialCaseHeader c={data.c} />
      <StatementPair c={data.c} response={data.resp} />
      <EvidenceTimeline evidence={data.ev} timeline={data.timeline} />
      <PolicyNotesPanel notes={data.notes} />

      <QuietPanel kicker="Workflow controls" title="Move the case forward">
        <div className="flex flex-wrap gap-2 items-center">
          {canMarkReady && (
            <MediatorButton disabled={busy} onClick={() => run("Mark ready for review", () => markReadyForReview(data.c!.id))}>
              MARK READY FOR REVIEW
            </MediatorButton>
          )}
          {readyForReview && (
            <KeeperButton disabled={busy} onClick={() => run("Trigger review", () => triggerReview(data.c!.id), true)}>
              TRIGGER REVIEW · {feeGen} GEN
            </KeeperButton>
          )}
          {readyForReconsiderationReview && activeReconsiderationId && (
            <KeeperButton
              disabled={busy}
              onClick={() => run("Trigger reconsideration review", () => triggerReconsiderationReview(activeReconsiderationId), true)}
            >
              TRIGGER RECONSIDERATION REVIEW · {feeGen} GEN
            </KeeperButton>
          )}
          {isReviewed && status !== "FINALIZED" && (
            <AppealButton disabled={busy} onClick={() => run("Finalize", () => finalizeCase(data.c!.id))}>
              FINALIZE CASE
            </AppealButton>
          )}
          <span className="mono text-xs text-walnut">
            status: <span className="text-aubergine">{status}</span>
            {data.config?.keeper_required && <span> · keeper-required</span>}
          </span>
        </div>
        {msg && <div className="mono text-xs mt-3 break-all">{msg}</div>}
        {awaitingConsensus && (
          <div className="mono text-xs mt-3 flex items-center gap-2 text-teal">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-teal border-t-transparent animate-spin" />
            Validators are reaching consensus on this review — this can take up to a minute or two. Don&apos;t close this tab.
          </div>
        )}
      </QuietPanel>

      <KeeperControlRow caseId={data.c.id} role={role} config={data.config} status={status} />
      <ConsensusReviewCard review={data.review} />
      <ReconsiderationReviewCard review={data.reconsiderationReview} />
      <WhyGenLayerPanel />

      <div className="flex gap-3 flex-wrap">
        {canRespond(role) && data.c.status === "AWAITING_LANDLORD_RESPONSE" && (
          <Link href={`/cases/${data.c.id}/respond`} className="btn-secondary">SUBMIT RESPONSE</Link>
        )}
        {canAddEvidence(role) && !isReviewed && (
          <Link href={`/cases/${data.c.id}/evidence`} className="btn-evidence">ADD EVIDENCE</Link>
        )}
        {(role === "tenant" || role === "landlord") && isReviewed && (
          <Link href={`/cases/${data.c.id}/reconsideration`} className="btn-appeal">REQUEST RECONSIDERATION</Link>
        )}
      </div>
    </div>
  );
}
