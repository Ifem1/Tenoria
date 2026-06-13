import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";

export function DashboardEmptyState({ connected }: { connected: boolean }) {
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fadeInUp">
        {/* Large ghosted watermark */}
        <div className="opacity-8 mb-6 pointer-events-none select-none" style={{ opacity: 0.07 }}>
          <svg width="140" height="140" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="0" y="0" width="64" height="64" rx="15" fill="#2B193D" />
            <rect x="14" y="22" width="36" height="5" rx="2.5" fill="#FFF7EA" />
            <rect x="29.5" y="22" width="5" height="30" rx="2.5" fill="#FFF7EA" />
            <circle cx="11.5" cy="24.5" r="3.4" fill="#F4D8E8" />
            <circle cx="52.5" cy="24.5" r="3.4" fill="#2A9D8F" />
            <rect x="23" y="52" width="18" height="4" rx="2" fill="#6E4B7E" />
          </svg>
        </div>
        <div className="font-prata text-2xl text-aubergine mb-2">A private room awaits</div>
        <p className="text-sm text-ink/60 max-w-xs leading-relaxed mb-6">
          Connect your wallet to see your sealed cases, pending reviews, and any complaints you've been invited to respond to.
        </p>
        <div className="flex gap-3 items-center">
          <span className="mono text-xs text-walnut/70">↑ Connect wallet above</span>
        </div>
        {/* Decorative sealed document illustration */}
        <div className="mt-10 flex gap-8 opacity-20 pointer-events-none select-none">
          {["SEALED", "PRIVATE", "ON-CHAIN"].map((t) => (
            <div key={t} className="w-12 h-16 border border-aubergine/40 rounded-sm flex items-end justify-center pb-1">
              <span className="mono text-[7px] text-aubergine">{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fadeInUp">
      {/* Ghosted large T mark */}
      <div className="relative mb-8" style={{ opacity: 0.06 }}>
        <svg width="120" height="120" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="0" y="0" width="64" height="64" rx="15" fill="#2B193D" />
          <rect x="14" y="22" width="36" height="5" rx="2.5" fill="#FFF7EA" />
          <rect x="29.5" y="22" width="5" height="30" rx="2.5" fill="#FFF7EA" />
          <circle cx="11.5" cy="24.5" r="3.4" fill="#F4D8E8" />
          <circle cx="52.5" cy="24.5" r="3.4" fill="#2A9D8F" />
          <rect x="23" y="52" width="18" height="4" rx="2" fill="#6E4B7E" />
        </svg>
      </div>
      <div className="font-prata text-xl text-aubergine mb-2 -mt-4">No cases yet</div>
      <p className="text-sm text-ink/55 max-w-[260px] leading-relaxed mb-6">
        Open your first complaint or share your wallet address with a landlord to receive a response invitation.
      </p>
      <Link
        href="/open-complaint"
        className="btn-primary text-sm hover:shadow-md"
      >
        │ OPEN A COMPLAINT
      </Link>
      <p className="mono text-[10px] text-walnut/50 mt-4 uppercase tracking-widest">
        All cases are private by default
      </p>
    </div>
  );
}
