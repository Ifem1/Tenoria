import type { CaseEvidence, TimelineEvent } from "@/types";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { fmtTime } from "@/lib/utils/ids";

export function EvidenceTimeline({
  evidence, timeline,
}: { evidence: CaseEvidence[]; timeline: TimelineEvent[] }) {
  const items = [
    ...timeline.map(t => ({ kind: "event" as const, at: t.date, t })),
    ...evidence.map(e => ({ kind: "evidence" as const, at: Date.parse(e.issuedAt || "") || 0, e })),
  ].sort((a, b) => a.at - b.at);

  return (
    <QuietPanel kicker="Evidence Timeline" title="Wall of facts">
      {items.length === 0 ? (
        <p className="text-sm text-ink/60 italic">No timeline events or evidence yet.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="border-l-2 border-mauve pl-4">
              <div className="mono text-[11px] uppercase text-walnut">{fmtTime(it.at)}</div>
              {it.kind === "event" ? (
                <div className="text-sm"><span className="mono">{it.t.eventType}</span> — {it.t.description}</div>
              ) : (
                <div className="text-sm">
                  <span className="mono">{it.e.type}</span> · <span className="text-mauve">{it.e.side}</span>
                  <div className="font-prata">{it.e.title}</div>
                  <div className="text-xs text-ink/70">{it.e.description}</div>
                  {it.e.uri && <a className="text-keeper text-xs underline mono" href={it.e.uri} target="_blank" rel="noreferrer">{it.e.uri}</a>}
                  {it.e.hash && <div className="mono text-[10px] text-walnut">hash: {it.e.hash}</div>}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </QuietPanel>
  );
}
