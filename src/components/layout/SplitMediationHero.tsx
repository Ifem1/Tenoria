import Link from "next/link";
import { PRIVATE_BY_DEFAULT } from "@/lib/constants/copy";

export function SplitMediationHero() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 rounded-xl overflow-hidden border border-mist">
      <div className="statement-tenant p-8">
        <div className="mono text-xs uppercase tracking-widest text-walnut">Tenant Statement</div>
        <h3 className="font-prata text-2xl mt-2 text-aubergine">Complaint narrative, evidence, timeline.</h3>
        <p className="text-sm mt-3 text-ink/80">
          Open a private complaint case. Share what happened, when, and what you want resolved.
        </p>
      </div>
      <div className="bg-aubergine text-cream px-10 py-12 flex flex-col items-center justify-center text-center min-w-[280px]">
        <div className="font-prata text-4xl tracking-wide">TENORIA</div>
        <div className="text-xs uppercase tracking-widest mt-2 text-witness">
          Private housing complaints reviewed by consensus.
        </div>
        <Link href="/open-complaint" className="btn-primary mt-6 inline-block">│ OPEN COMPLAINT</Link>
        <Link href="/dashboard" className="mt-3 text-xs underline text-witness">My Cases</Link>
        <div className="text-[10px] mt-4 text-witness/80 max-w-[200px]">{PRIVATE_BY_DEFAULT}</div>
      </div>
      <div className="statement-landlord p-8">
        <div className="mono text-xs uppercase tracking-widest text-walnut">Landlord Response</div>
        <h3 className="font-prata text-2xl mt-2 text-walnut">Lease policy, repairs, counter-evidence.</h3>
        <p className="text-sm mt-3 text-ink/80">
          Respond to a complaint in private. Provide lease context and proposed resolution.
        </p>
      </div>
    </section>
  );
}
