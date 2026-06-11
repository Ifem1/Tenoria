import type { PolicyNote } from "@/types";
import { QuietPanel } from "@/components/ui/QuietPanel";

export function PolicyNotesPanel({ notes }: { notes: PolicyNote[] }) {
  return (
    <QuietPanel kicker="Lease Policy Notes" title="Policy notebook">
      {notes.length === 0 ? (
        <p className="text-sm italic text-ink/60">No lease/policy notes added yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {notes.map(n => (
            <div key={n.id} className="policy-note rounded p-3">
              <div className="mono text-[10px] uppercase text-walnut">{n.clauseType}</div>
              <div className="font-prata text-aubergine">{n.clauseName}</div>
              <p className="text-sm mt-1">{n.clauseSummary}</p>
              <div className="text-xs mt-2"><span className="mono">Obligation: </span>{n.partyObligation}</div>
              <div className="text-xs"><span className="mono">Interpretation: </span>{n.partyInterpretation}</div>
            </div>
          ))}
        </div>
      )}
    </QuietPanel>
  );
}
