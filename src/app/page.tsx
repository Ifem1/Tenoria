import { SplitMediationHero } from "@/components/layout/SplitMediationHero";
import { ComplaintPath } from "@/components/layout/ComplaintPath";
import { RolePanels } from "@/components/layout/RolePanels";
import { WhyGenLayerPanel } from "@/components/consensus/WhyGenLayerPanel";
import { QuietPanel } from "@/components/ui/QuietPanel";
import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-8">
      <SplitMediationHero />

      <QuietPanel kicker="Tenant complaints are rarely one-sided">
        <p className="text-sm leading-relaxed">
          Housing complaints turn on credibility, lease policy, evidence strength, and timing — not just timestamps.
          Tenoria turns tenant narratives, landlord responses, and lease policy into reviewable consensus outcomes
          using GenLayer validators.
        </p>
      </QuietPanel>

      <ComplaintPath />
      <RolePanels />
      <WhyGenLayerPanel />

      <QuietPanel kicker="Privacy by default">
        <p className="text-sm">
          There is no public case explorer. Each case is visible only to the involved parties, the assigned keeper,
          and the platform admin. Sensitive evidence stays off-chain as hashes, CIDs, or private links.
        </p>
      </QuietPanel>

      <div className="flex justify-center gap-3">
        <Link href="/open-complaint" className="btn-primary">│ OPEN COMPLAINT</Link>
        <Link href="/dashboard" className="btn-secondary">MY CASES</Link>
      </div>
    </div>
  );
}
