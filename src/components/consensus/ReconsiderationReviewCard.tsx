import type { ReconsiderationReview } from "@/types";
import { QuietPanel } from "@/components/ui/QuietPanel";

export function ReconsiderationReviewCard({ review }: { review: ReconsiderationReview | null }) {
  if (!review) return null;
  return (
    <QuietPanel kicker="Reconsideration Review">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-xs uppercase text-walnut">Decision</div>
          <div className="ruling-seal mt-1">{review.reconsideration_decision.replace(/_/g, " ")}</div>
        </div>
        <div>
          <div className="mono text-xs uppercase text-walnut">Revised ruling</div>
          <div className="font-prata text-lg mt-1 text-aubergine">{review.new_ruling.replace(/_/g, " ")}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        <div className="border border-mist rounded px-3 py-2 bg-cream">
          <div className="mono text-[10px] uppercase text-walnut">Credibility</div>
          <div className="font-prata text-sm text-aubergine">{review.new_credibility_band}</div>
        </div>
        <div className="border border-mist rounded px-3 py-2 bg-cream">
          <div className="mono text-[10px] uppercase text-walnut">Actionability</div>
          <div className="font-prata text-sm text-aubergine">{review.new_actionability_band}</div>
        </div>
        <div className="border border-mist rounded px-3 py-2 bg-cream">
          <div className="mono text-[10px] uppercase text-walnut">Confidence</div>
          <div className="font-prata text-sm text-aubergine">{review.confidence_band}</div>
        </div>
        <div className="border border-mist rounded px-3 py-2 bg-cream">
          <div className="mono text-[10px] uppercase text-walnut">Final recommendation</div>
          <div className="font-prata text-sm text-aubergine">{review.final_recommendation.replace(/_/g, " ")}</div>
        </div>
      </div>

      {review.reason_codes?.length > 0 && (
        <div className="mt-5">
          <div className="mono text-xs uppercase text-walnut mb-2">Reason codes</div>
          <div className="flex flex-wrap gap-2">
            {review.reason_codes.map((c) => (
              <span key={c} className="mono text-xs px-2 py-1 border rounded border-mauve text-mauve">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </QuietPanel>
  );
}
