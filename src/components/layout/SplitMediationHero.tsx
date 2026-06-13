"use client";
import Link from "next/link";
import { PRIVATE_BY_DEFAULT } from "@/lib/constants/copy";

export function SplitMediationHero() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 rounded-xl overflow-hidden border border-mist animate-fadeIn">
      {/* Tenant side */}
      <div className="statement-tenant p-8 relative overflow-hidden animate-fadeInUp delay-200">
        {/* decorative floating blobs */}
        <div
          className="absolute -top-6 -left-6 w-28 h-28 rounded-full opacity-20 animate-floatA"
          style={{ background: "radial-gradient(circle, #F4D8E8, transparent 70%)" }}
        />
        <div
          className="absolute bottom-4 right-4 w-16 h-16 rounded-full opacity-15 animate-floatB"
          style={{ background: "radial-gradient(circle, #6E4B7E, transparent 70%)" }}
        />
        <div className="relative z-10">
          <div className="mono text-xs uppercase tracking-widest text-walnut">Tenant Statement</div>
          <h3 className="font-prata text-2xl mt-2 text-aubergine">Complaint narrative, evidence, timeline.</h3>
          <p className="text-sm mt-3 text-ink/80 leading-relaxed">
            Open a private complaint case. Share what happened, when, and what you want resolved.
          </p>
          {/* subtle icon row */}
          <div className="flex gap-3 mt-6">
            {["📋 Narrative", "📎 Evidence", "📅 Timeline"].map((label) => (
              <span key={label} className="text-[10px] mono uppercase tracking-wide text-mauve/80 bg-witness/60 px-2 py-1 rounded border border-mauve/20">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Centre column */}
      <div className="bg-aubergine text-cream px-10 py-12 flex flex-col items-center justify-center text-center min-w-[280px] relative overflow-hidden">
        {/* spinning ring decoration */}
        <div
          className="absolute inset-0 m-auto w-56 h-56 rounded-full border border-mauve/20 animate-spin-slow pointer-events-none"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        />
        <div
          className="absolute inset-0 m-auto w-40 h-40 rounded-full border border-witness/10 animate-spin-slow pointer-events-none"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", animationDirection: "reverse", animationDuration: "25s" }}
        />

        <div className="relative z-10 animate-fadeInUp delay-300">
          {/* Logo mark */}
          <div className="flex justify-center mb-3">
            <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true" className="animate-pulse-ring rounded-[14px]">
              <rect x="0" y="0" width="64" height="64" rx="15" fill="#3a2452" />
              <rect x="14" y="22" width="36" height="5" rx="2.5" fill="#FFF7EA" />
              <rect x="29.5" y="22" width="5" height="30" rx="2.5" fill="#FFF7EA" />
              <circle cx="11.5" cy="24.5" r="3.4" fill="#F4D8E8" />
              <circle cx="52.5" cy="24.5" r="3.4" fill="#2A9D8F" />
              <rect x="23" y="52" width="18" height="4" rx="2" fill="#6E4B7E" />
            </svg>
          </div>
          <div className="font-prata text-4xl tracking-wide">TENORIA</div>
          <div className="text-xs uppercase tracking-widest mt-2 text-witness/80">
            Private housing complaints reviewed by consensus.
          </div>
          <Link href="/open-complaint" className="btn-primary mt-6 inline-block hover:shadow-lg">
            │ OPEN COMPLAINT
          </Link>
          <Link href="/dashboard" className="mt-3 text-xs underline text-witness/70 block hover:text-witness transition-colors">
            My Cases →
          </Link>
          <div className="text-[10px] mt-4 text-witness/60 max-w-[200px] leading-relaxed">{PRIVATE_BY_DEFAULT}</div>
        </div>
      </div>

      {/* Landlord side */}
      <div className="statement-landlord p-8 relative overflow-hidden animate-fadeInUp delay-400">
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20 animate-floatB"
          style={{ background: "radial-gradient(circle, #E8D8B8, transparent 70%)" }}
        />
        <div
          className="absolute bottom-4 left-4 w-16 h-16 rounded-full opacity-15 animate-floatA"
          style={{ background: "radial-gradient(circle, #2A9D8F, transparent 70%)" }}
        />
        <div className="relative z-10">
          <div className="mono text-xs uppercase tracking-widest text-walnut">Landlord Response</div>
          <h3 className="font-prata text-2xl mt-2 text-walnut">Lease policy, repairs, counter-evidence.</h3>
          <p className="text-sm mt-3 text-ink/80 leading-relaxed">
            Respond to a complaint in private. Provide lease context and proposed resolution.
          </p>
          <div className="flex gap-3 mt-6">
            {["📜 Lease", "🔧 Repairs", "📄 Counter"].map((label) => (
              <span key={label} className="text-[10px] mono uppercase tracking-wide text-walnut/80 bg-sand/60 px-2 py-1 rounded border border-walnut/20">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
