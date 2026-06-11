import { ReactNode } from "react";
import clsx from "clsx";

export function QuietPanel({ title, children, className, kicker }: {
  title?: string; kicker?: string; children: ReactNode; className?: string;
}) {
  return (
    <section className={clsx("quiet-panel", className)}>
      {kicker && <div className="mono text-xs uppercase tracking-widest text-walnut mb-1">{kicker}</div>}
      {title && <h2 className="font-prata text-xl text-aubergine mb-3">{title}</h2>}
      {children}
    </section>
  );
}

export function MonoCaseId({ id }: { id: string }) {
  return <span className="mono text-aubergine">{id}</span>;
}

export function AccessBadge({ mode }: { mode: string }) {
  return (
    <span className="mono text-xs uppercase tracking-wider px-2 py-1 border border-mauve text-mauve rounded">
      {mode}
    </span>
  );
}
