import { QuietPanel } from "@/components/ui/QuietPanel";
import { WHY_GENLAYER, LEGAL_NOTICE } from "@/lib/constants/copy";

export function WhyGenLayerPanel() {
  return (
    <QuietPanel kicker="Why this needed GenLayer" title="Beyond fixed rules">
      <p className="text-sm leading-relaxed">{WHY_GENLAYER}</p>
      <p className="text-xs italic mt-3 text-walnut">{LEGAL_NOTICE}</p>
    </QuietPanel>
  );
}
