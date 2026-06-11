const STEPS = [
  ["Complaint Filed", "Tenant opens private case with narrative, evidence, and lease reference."],
  ["Landlord Response", "Landlord submits their side, lease interpretation, and any counter-evidence."],
  ["Keeper Check", "Assigned keeper verifies readiness — response deadline, evidence presence, no spam."],
  ["GenLayer Review", "Validators interpret narrative, response, lease, evidence, and timeline."],
  ["Consensus Ruling", "On-chain credibility, actionability, urgency, and required actions."],
  ["Action Path", "Parties follow required actions; reconsideration available with new evidence."],
];

export function ComplaintPath() {
  return (
    <section className="quiet-panel">
      <div className="mono text-xs uppercase tracking-widest text-walnut">Complaint Path</div>
      <h2 className="font-prata text-2xl text-aubergine mt-1 mb-5">From statement to consensus.</h2>
      <ol className="space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-4 items-start border-l-2 border-mauve pl-4">
            <span className="mono text-mauve text-xs pt-1">0{i + 1}</span>
            <div>
              <div className="font-prata text-lg text-aubergine">{t}</div>
              <div className="text-sm text-ink/70">{d}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
