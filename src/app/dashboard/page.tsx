import { RoleAwareDashboard } from "@/components/dashboard/RoleAwareDashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Dashboard</div>
        <h1 className="font-prata text-3xl text-aubergine">Your private cases</h1>
      </div>
      <RoleAwareDashboard />
    </div>
  );
}
