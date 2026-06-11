import type { ConsensusReview } from "@/types";
import { QuietPanel } from "@/components/ui/QuietPanel";

function Meter({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div>
      <div className="flex justify-between text-xs mono uppercase tracking-wider text-walnut">
        <span>{label}</span><span>{v}</span>
      </div>
      <div className="h-2 bg-mist rounded mt-1">
        <div className="h-2 bg-teal rounded" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function Badge({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-mist rounded px-3 py-2 bg-cream">
      <div className="mono text-[10px] uppercase text-walnut">{label}</div>
      <div className={`font-prata text-sm ${tone || "text-aubergine"}`}>{value}</div>
    </div>
  );
}

export function ConsensusReviewCard({ review }: { review: ConsensusReview | null }) {
  if (!review) {
    return (
      <QuietPanel kicker="Consensus Review" title="Awaiting consensus review">
        <p className="text-sm text-ink/70">
          This case has not yet been sent to GenLayer consensus. A keeper will trigger review once both sides have had a chance to submit.
        </p>
      </QuietPanel>
    );
  }
  return (
    <QuietPanel kicker="Consensus Review">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-xs uppercase text-walnut">Ruling</div>
          <div className="ruling-seal mt-1">{review.ruling}</div>
        </div>
        <div className="flex-1 min-w-[260px] space-y-3">
          <Meter label="Credibility" value={review.credibility_score} />
          <Meter label="Actionability" value={review.actionability_score} />
          <Meter label="Confidence" value={review.confidence} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        <Badge label="Urgency" value={review.urgency} />
        <Badge label="Lease Support" value={review.lease_support} />
        <Badge label="Evidence" value={review.evidence_strength} />
        <Badge label="Landlord Response" value={review.landlord_response_quality} />
      </div>

      <div className="mt-5">
        <div className="mono text-xs uppercase text-walnut">Recommended next action</div>
        <p className="text-sm mt-1">{review.recommended_next_action}</p>
      </div>

      {review.required_actions?.length > 0 && (
        <div className="mt-4">
          <div className="mono text-xs uppercase text-walnut">Required actions</div>
          <ul className="mt-1 space-y-1 text-sm">
            {review.required_actions.map((a, i) => (
              <li key={i} className="border-l-2 border-action pl-3">
                <span className="mono text-xs">{a.party}</span> — {a.action}
                {a.deadline_days != null && <span className="text-walnut text-xs"> (within {a.deadline_days}d)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mt-5 text-sm">
        <div>
          <div className="mono text-xs uppercase text-walnut">Findings</div>
          <ul className="list-disc ml-5">{review.findings?.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
        <div>
          <div className="mono text-xs uppercase text-dispute">Red flags</div>
          <ul className="list-disc ml-5">{review.red_flags?.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
        <div>
          <div className="mono text-xs uppercase text-marigold">Missing information</div>
          <ul className="list-disc ml-5">{review.missing_information?.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      </div>

      <div className="mt-5 border-t border-mist pt-4">
        <div className="mono text-xs uppercase text-walnut">Reasoning summary</div>
        <p className="text-sm mt-1 italic">{review.reasoning_summary}</p>
      </div>
    </QuietPanel>
  );
}
