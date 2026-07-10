const PANELS = [
  {
    title: "Tenant",
    bg: "statement-tenant",
    can: ["Create a private complaint case", "Add evidence and timeline events", "View landlord response and ruling", "Trigger the GenLayer review once ready", "Request reconsideration"],
    cannot: ["See other tenants' cases", "Override the consensus ruling"],
  },
  {
    title: "Landlord",
    bg: "statement-landlord",
    can: ["View cases naming them", "Submit response and lease position", "Add evidence and repair history", "Trigger the GenLayer review once ready", "Request reconsideration"],
    cannot: ["See unrelated complaints", "Force early dismissal", "Override the consensus ruling"],
  },
  {
    title: "Keeper",
    bg: "policy-note",
    can: ["See assigned cases", "Verify readiness", "Trigger GenLayer review on a party's behalf", "Escalate urgent rulings"],
    cannot: ["Write the ruling", "Decide credibility or actionability", "Invent evidence"],
  },
];

export function RolePanels() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PANELS.map((p, i) => (
        <div key={p.title} className={`${p.bg} rounded-lg p-5 ${i === 1 ? "md:translate-y-3" : i === 2 ? "md:-translate-y-2" : ""}`}>
          <div className="mono text-xs uppercase tracking-widest text-walnut">Role</div>
          <h3 className="font-prata text-xl text-aubergine">{p.title}</h3>
          <div className="mt-3 text-sm">
            <div className="font-semibold text-action">Can</div>
            <ul className="list-disc ml-5 mb-3">{p.can.map(x => <li key={x}>{x}</li>)}</ul>
            <div className="font-semibold text-dispute">Cannot</div>
            <ul className="list-disc ml-5">{p.cannot.map(x => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      ))}
    </section>
  );
}
