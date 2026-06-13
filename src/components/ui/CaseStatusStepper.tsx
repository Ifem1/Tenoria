const STEPS = [
  { key: "OPENED",                        label: "Opened" },
  { key: "AWAITING_LANDLORD_RESPONSE",    label: "Awaiting Response" },
  { key: "RESPONSE_SUBMITTED",            label: "Response In" },
  { key: "READY_FOR_REVIEW",              label: "Ready" },
  { key: "UNDER_REVIEW",                  label: "Under Review" },
  { key: "REVIEWED",                      label: "Reviewed" },
  { key: "READY_FOR_RECONSIDERATION_REVIEW", label: "Reconsideration" },
  { key: "RECONSIDERATION_REVIEWED",      label: "Reconsidered" },
  { key: "FINALIZED",                     label: "Finalized" },
];

const CANCELLED = "CANCELLED";

const ORDER = STEPS.map((s) => s.key);

function stepIndex(status: string) {
  const i = ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}

export function CaseStatusStepper({ status }: { status: string }) {
  if (status === CANCELLED) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="w-2.5 h-2.5 rounded-full bg-dispute flex-shrink-0" />
        <span className="mono text-xs text-dispute uppercase tracking-wider">Case Cancelled</span>
      </div>
    );
  }

  const current = stepIndex(status);

  return (
    <div className="w-full overflow-x-auto py-1">
      <div className="flex items-center min-w-max gap-0">
        {STEPS.map((step, i) => {
          const done    = i < current;
          const active  = i === current;
          const future  = i > current;

          return (
            <div key={step.key} className="flex items-center">
              {/* connector line before node (skip first) */}
              {i > 0 && (
                <div
                  className="h-0.5 w-8 flex-shrink-0 transition-colors duration-300"
                  style={{ background: done || active ? "var(--mauve)" : "var(--mist)" }}
                />
              )}
              {/* node */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 52 }}>
                <div
                  className={[
                    "w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
                    done   ? "bg-mauve border-mauve"            : "",
                    active ? "bg-aubergine border-aubergine scale-125 shadow-[0_0_0_3px_rgba(110,75,126,0.25)]" : "",
                    future ? "bg-cream border-mist"             : "",
                  ].join(" ")}
                >
                  {done && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.2 5.8L6.5 2.5" stroke="#FFF7EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className={[
                    "text-[9px] mono uppercase tracking-wide text-center leading-tight",
                    active  ? "text-aubergine font-semibold" : "",
                    done    ? "text-mauve"                   : "",
                    future  ? "text-ink/30"                  : "",
                  ].join(" ")}
                  style={{ maxWidth: 52 }}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
