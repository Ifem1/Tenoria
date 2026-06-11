"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitLandlordResponse } from "@/lib/genlayer/write";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { MediatorButton } from "@/components/ui/Buttons";
import { makeId } from "@/lib/utils/ids";

const schema = z.object({
  responseNarrative: z.string().min(10, "Response too short"),
  leasePolicyPosition: z.string().min(2),
  repairActionHistory: z.string().min(2),
  proposedResolution: z.string().min(2),
  admissionOrDenialSummary: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function RespondPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setBusy(true); setMsg("");
    const payload = { id: makeId("resp"), ...values, createdAt: Date.now(), updatedAt: Date.now() };
    try {
      const hash = await submitLandlordResponse(caseId, JSON.stringify(payload));
      setMsg("Response submitted: " + hash);
      router.push(`/cases/${caseId}`);
    } catch (e: any) { setMsg("Failed: " + (e?.message || e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Landlord Response</div>
        <h1 className="font-prata text-3xl text-aubergine">Submit your side</h1>
      </div>
      <QuietPanel>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <F label="Response narrative" err={errors.responseNarrative?.message}>
            <textarea rows={5} className="input" {...register("responseNarrative")} />
          </F>
          <F label="Lease policy position" err={errors.leasePolicyPosition?.message}>
            <textarea rows={3} className="input" {...register("leasePolicyPosition")} />
          </F>
          <F label="Repair / action history" err={errors.repairActionHistory?.message}>
            <textarea rows={3} className="input" {...register("repairActionHistory")} />
          </F>
          <F label="Proposed resolution" err={errors.proposedResolution?.message}>
            <textarea rows={3} className="input" {...register("proposedResolution")} />
          </F>
          <F label="Admission / denial summary (optional)">
            <input className="input" {...register("admissionOrDenialSummary")} />
          </F>
          <div className="flex gap-3 items-center">
            <MediatorButton type="submit" disabled={busy}>{busy ? "SUBMITTING…" : "SUBMIT RESPONSE"}</MediatorButton>
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
