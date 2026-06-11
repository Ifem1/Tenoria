import type { ComplaintCase } from "@/types";
import { AccessBadge, MonoCaseId } from "@/components/ui/QuietPanel";
import { shortAddr } from "@/lib/utils/ids";

export function ConfidentialCaseHeader({ c }: { c: ComplaintCase }) {
  return (
    <header className="quiet-panel">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="mono text-xs uppercase tracking-widest text-walnut">Confidential Case</div>
          <h1 className="font-prata text-2xl text-aubergine"><MonoCaseId id={c.id} /></h1>
          <div className="mono text-xs text-ink/70 mt-1">{c.propertyLabel}</div>
        </div>
        <div className="flex gap-2 flex-wrap items-start">
          <AccessBadge mode={c.visibilityMode} />
          <span className="ruling-seal">{c.status}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
        <div><div className="mono text-[10px] uppercase text-walnut">Tenant</div><div className="mono">{shortAddr(c.tenantWallet)}</div></div>
        <div><div className="mono text-[10px] uppercase text-walnut">Landlord</div><div className="mono">{shortAddr(c.landlordWallet)}</div></div>
        <div><div className="mono text-[10px] uppercase text-walnut">Keeper</div><div className="mono">{shortAddr(c.assignedKeeper)}</div></div>
        <div><div className="mono text-[10px] uppercase text-walnut">Category · Urgency</div><div>{c.category} · {c.urgency}</div></div>
      </div>
    </header>
  );
}
