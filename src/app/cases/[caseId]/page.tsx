"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/store";
import {
  getCase, getLandlordResponse, getCaseEvidence, getPolicyNotes,
  getCaseTimeline, getConsensusReview, getOwner, isKeeper,
} from "@/lib/genlayer/read";
import type { ComplaintCase, LandlordResponse, CaseEvidence, PolicyNote, TimelineEvent, ConsensusReview } from "@/types";
import { ConfidentialCaseHeader } from "@/components/quiet-case/ConfidentialCaseHeader";
import { StatementPair } from "@/components/quiet-case/StatementPair";
import { EvidenceTimeline } from "@/components/evidence/EvidenceTimeline";
import { PolicyNotesPanel } from "@/components/policy/PolicyNotesPanel";
import { ConsensusReviewCard } from "@/components/consensus/ConsensusReviewCard";
import { WhyGenLayerPanel } from "@/components/consensus/WhyGenLayerPanel";
import { KeeperControlRow } from "@/components/keeper/KeeperControlRow";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { deriveCaseRole, canViewCase, canTriggerReview, canRespond, canAddEvidence } from "@/lib/access";

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const { address } = useWallet();
  const [data, setData] = useState<{
    c: ComplaintCase | null; resp: LandlordResponse | null;
    ev: CaseEvidence[]; notes: PolicyNote[]; timeline: TimelineEvent[];
    review: ConsensusReview | null; isKeeperFlag: boolean; isOwner: boolean;
  } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!caseId) return;
    (async () => {
      try {
        const [c, resp, ev, notes, timeline, review, owner, kk] = await Promise.all([
          getCase(caseId), getLandlordResponse(caseId), getCaseEvidence(caseId),
          getPolicyNotes(caseId), getCaseTimeline(caseId), getConsensusReview(caseId),
          getOwner(), address ? isKeeper(address) : Promise.resolve(false),
        ]);
        setData({
          c, resp, ev: ev || [], notes: notes || [], timeline: timeline || [],
          review, isKeeperFlag: !!kk,
          isOwner: !!(owner && address && owner.toLowerCase() === address.toLowerCase()),
        });
      } catch (e: any) { setErr(e?.message || String(e)); }
    })();
  }, [caseId, address]);

  if (err) return <div className="mono text-sm text-dispute">{err}</div>;
  if (!data) return <div className="mono text-xs text-walnut">Loading private case…</div>;
  if (!data.c) return <NotFound />;

  const role = deriveCaseRole(data.c, address || "", data.isKeeperFlag, data.isOwner);
  if (!canViewCase(role)) {
    return (
      <QuietPanel kicker="Access" title="Private case">
        <p className="text-sm">You do not have access to this private case.</p>
      </QuietPanel>
    );
  }

  return (
    <div className="space-y-6">
      <ConfidentialCaseHeader c={data.c} />
      <StatementPair c={data.c} response={data.resp} />
      <EvidenceTimeline evidence={data.ev} timeline={data.timeline} />
      <PolicyNotesPanel notes={data.notes} />
      <KeeperControlRow caseId={data.c.id} canTrigger={canTriggerReview(role)} />
      <ConsensusReviewCard review={data.review} />
      <WhyGenLayerPanel />

      <div className="flex gap-3 flex-wrap">
        {canRespond(role) && (
          <Link href={`/cases/${data.c.id}/respond`} className="btn-secondary">SUBMIT RESPONSE</Link>
        )}
        {canAddEvidence(role) && (
          <Link href={`/cases/${data.c.id}/evidence`} className="btn-evidence">ADD EVIDENCE</Link>
        )}
        {(role === "tenant" || role === "landlord") && (
          <Link href={`/cases/${data.c.id}/reconsideration`} className="btn-appeal">REQUEST RECONSIDERATION</Link>
        )}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <QuietPanel title="Case not found">
      <p className="text-sm">No case exists with this ID, or it has not been indexed yet.</p>
    </QuietPanel>
  );
}
