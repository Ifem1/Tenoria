import { RoleAwareDashboard } from "@/components/dashboard/RoleAwareDashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="animate-fadeInUp">
        <div className="mono text-xs uppercase tracking-widest text-walnut">Dashboard</div>
        <h1 className="font-prata text-3xl text-aubergine">Your private cases</h1>
        <p className="text-sm text-ink/50 mt-1">A sealed record of every complaint, response, and ruling involving your wallet.</p>
      </div>
      <RoleAwareDashboard />
    </div>
  );
}
