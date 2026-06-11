"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { openReconsideration } from "@/lib/genlayer/write";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { AppealButton } from "@/components/ui/Buttons";
import { makeId } from "@/lib/utils/ids";

const REASONS = [
  "NEW_EVIDENCE_AVAILABLE","LEASE_POLICY_MISREAD","LANDLORD_RESPONSE_MISINTERPRETED",
  "TENANT_NARRATIVE_MISINTERPRETED","URGENCY_MISJUDGED","EVIDENCE_NOT_CONSIDERED","OTHER",
] as const;

const schema = z.object({
  reason: z.enum(REASONS),
  explanation: z.string().min(20, "Explain what materially changed (min 20 chars)"),
  newEvidenceRefs: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function ReconsiderationPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "NEW_EVIDENCE_AVAILABLE" } as any,
  });

  async function onSubmit(v: Form) {
    setBusy(true); setMsg("");
    const rid = makeId("rec");
    const payload = {
      reason: v.reason, explanation: v.explanation,
      newEvidenceRefs: (v.newEvidenceRefs || "").split(",").map(s => s.trim()).filter(Boolean),
    };
    try {
      const hash = await openReconsideration(rid, caseId, JSON.stringify(payload));
      setMsg("Reconsideration submitted: " + hash);
      router.push(`/cases/${caseId}`);
    } catch (e: any) { setMsg("Failed: " + (e?.message || e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Reconsideration</div>
        <h1 className="font-prata text-3xl text-aubergine">Request a fresh review</h1>
      </div>
      <QuietPanel>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <F label="Reason"><select className="input" {...register("reason")}>{REASONS.map(r=> <option key={r}>{r}</option>)}</select></F>
          <F label="What materially changed?" err={errors.explanation?.message}>
            <textarea rows={5} className="input" {...register("explanation")} />
          </F>
          <F label="New evidence references (comma-separated IDs/URIs)">
            <input className="input mono" {...register("newEvidenceRefs")} />
          </F>
          <div className="flex items-center gap-3">
            <AppealButton type="submit" disabled={busy}>{busy ? "SUBMITTING…" : "REQUEST RECONSIDERATION"}</AppealButton>
            {msg && <span className="mono text-xs">{msg}</span>}
          </div>
        </form>
      </QuietPanel>
      <style>{`.input{width:100%;background:#fff;border:1px solid var(--mist);padding:.55rem .75rem;border-radius:.4rem;font-size:.9rem}`}</style>
    </div>
  );
}

function F({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mono text-[10px] uppercase tracking-widest text-walnut mb-1">{label}</div>
      {children}
      {err && <div className="text-xs text-dispute mt-1">{err}</div>}
    </label>
  );
}
