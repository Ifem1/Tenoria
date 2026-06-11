import type { ConsensusReview } from "@/types";
import { QuietPanel } from "@/components/ui/QuietPanel";

function Badge({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-mist rounded px-3 py-2 bg-cream">
      <div className="mono text-[10px] uppercase text-walnut">{label}</div>
      <div className={`font-prata text-sm ${tone || "text-aubergine"}`}>{value.replace(/_/g, " ")}</div>
    </div>
  );
}

function actionTone(a: string): string {
  if (a === "ESCALATE_URGENT_SAFETY_RISK" || a === "ESCALATE_TO_MEDIATION") return "text-dispute";
  if (a === "NO_ACTION_REQUIRED" || a === "DISMISS_INSUFFICIENT_EVIDENCE") return "text-walnut";
  return "text-action";
}

function reasonTone(c: string): string {
  if (c.includes("SAFETY") || c.includes("RETALIATION") || c.includes("NONRESPONSIVE")) return "border-dispute text-dispute";
  if (c.includes("STRONG") || c.includes("ACKNOWLEDGED") || c.includes("DOCUMENTED")) return "border-action text-action";
  return "border-mauve text-mauve";
}

export function ConsensusReviewCard({ review }: { review: ConsensusReview | null }) {
  if (!review) {
    return (
      <QuietPanel kicker="Consensus Review" title="Awaiting consensus review">
        <p className="text-sm text-ink/70">
          This case has not yet been sent to GenLayer consensus. A keeper triggers review once both sides have had a chance to submit.
        </p>
      </QuietPanel>
    );
  }
  return (
    <QuietPanel kicker="Consensus Review">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-xs uppercase text-walnut">Ruling</div>
          <div className="ruling-seal mt-1">{review.ruling.replace(/_/g, " ")}</div>
        </div>
        <div>
          <div className="mono text-xs uppercase text-walnut">Recommended next action</div>
          <div className={`font-prata text-lg mt-1 ${actionTone(review.recommended_next_action)}`}>
            {review.recommended_next_action.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        <Badge label="Credibility" value={review.credibility_band} />
        <Badge label="Actionability" value={review.actionability_band} />
        <Badge label="Confidence" value={review.confidence_band} />
        <Badge label="Risk Level" value={review.risk_level} />
        <Badge label="Urgency" value={review.urgency} />
        <Badge label="Lease Support" value={review.lease_support} />
        <Badge label="Evidence" value={review.evidence_strength} />
        <Badge label="Landlord Response" value={review.landlord_response_quality} />
      </div>

      {review.reason_codes?.length > 0 && (
        <div className="mt-5">
          <div className="mono text-xs uppercase text-walnut mb-2">Reason codes</div>
          <div className="flex flex-wrap gap-2">
            {review.reason_codes.map((c) => (
              <span key={c} className={`mono text-xs px-2 py-1 border rounded ${reasonTone(c)}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs mt-5 italic text-walnut">
        Output is a compact, bounded, enum-only consensus judgement produced by GenLayer validators. Every field is a categorical decision — no exact scores, no free-text wording.
      </p>
    </QuietPanel>
  );
}
