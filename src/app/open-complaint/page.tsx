"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWallet } from "@/lib/wallet/store";
import { openCase } from "@/lib/genlayer/write";
import { makeId } from "@/lib/utils/ids";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { MediatorButton } from "@/components/ui/Buttons";
import { COMPLAINT_CATEGORIES } from "@/types";

const schema = z.object({
  landlordWallet: z.string().min(6, "Landlord wallet required"),
  propertyLabel: z.string().min(2, "Property label required"),
  leaseReference: z.string().optional(),
  category: z.enum(COMPLAINT_CATEGORIES as unknown as [string, ...string[]]),
  complaintNarrative: z.string().min(20, "Describe the complaint (min 20 chars)"),
  desiredRemedy: z.string().min(5, "Required"),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});
type Form = z.infer<typeof schema>;

export default function OpenComplaintPage() {
  const { address } = useWallet();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { urgency: "MEDIUM", category: "REPAIR_DELAY" } as any,
  });

  async function onSubmit(values: Form) {
    if (!address) { setMsg("Connect a wallet first."); return; }
    setSubmitting(true); setMsg("");
    const id = makeId("case");
    const payload = {
      ...values,
      visibilityMode: "PARTIES_KEEPER_ADMIN",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      const hash = await openCase(id, JSON.stringify(payload));
      setMsg(`Case opened: ${hash}`);
      router.push(`/cases/${id}`);
    } catch (e: any) {
      setMsg(`Failed: ${e?.message || e}`);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Open Complaint</div>
        <h1 className="font-prata text-3xl text-aubergine">Private complaint wizard</h1>
      </div>

      <QuietPanel>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Landlord wallet" err={errors.landlordWallet?.message}>
            <input className="input mono" placeholder="0x..." {...register("landlordWallet")} />
          </Field>
          <Field label="Property label (redacted ok)" err={errors.propertyLabel?.message}>
            <input className="input" placeholder="Unit 4B, North Court" {...register("propertyLabel")} />
          </Field>
          <Field label="Lease reference (optional)" err={errors.leaseReference?.message}>
            <input className="input" placeholder="Lease hash / CID / reference" {...register("leaseReference")} />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Category" err={errors.category?.message}>
              <select className="input" {...register("category")}>
                {COMPLAINT_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="Urgency" err={errors.urgency?.message}>
              <select className="input" {...register("urgency")}>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Complaint narrative" err={errors.complaintNarrative?.message}>
            <textarea rows={6} className="input" placeholder="What happened, when, what was requested, and what remains unresolved." {...register("complaintNarrative")} />
          </Field>
          <Field label="Desired remedy" err={errors.desiredRemedy?.message}>
            <textarea rows={3} className="input" placeholder="What outcome would resolve this?" {...register("desiredRemedy")} />
          </Field>

          <div className="flex items-center gap-3">
            <MediatorButton type="submit" disabled={submitting}>{submitting ? "SUBMITTING…" : "OPEN COMPLAINT"}</MediatorButton>
            {msg && <span className="mono text-xs">{msg}</span>}
          </div>
        </form>
      </QuietPanel>

      <style>{`.input{width:100%;background:#fff;border:1px solid var(--mist);padding:.55rem .75rem;border-radius:.4rem;font-size:.9rem}`}</style>
    </div>
  );
}

function Field({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mono text-[10px] uppercase tracking-widest text-walnut mb-1">{label}</div>
      {children}
      {err && <div className="text-xs text-dispute mt-1">{err}</div>}
    </label>
  );
}
