"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addEvidence } from "@/lib/genlayer/write";
import { QuietPanel } from "@/components/ui/QuietPanel";
import { EvidenceButton } from "@/components/ui/Buttons";
import { makeId } from "@/lib/utils/ids";
import { EVIDENCE_TYPES } from "@/types";

const schema = z.object({
  side: z.enum(["TENANT", "LANDLORD", "KEEPER", "ADMIN", "NEUTRAL"]),
  type: z.enum(EVIDENCE_TYPES as unknown as [string, ...string[]]),
  title: z.string().min(2),
  description: z.string().min(2),
  uri: z.string().min(2, "Link, IPFS CID, or storage URI"),
  hash: z.string().optional(),
  issuedAt: z.string().optional(),
  privacy: z.enum(["PUBLIC_TO_PARTIES", "PRIVATE_HASH_ONLY", "REDACTED", "KEEPER_ONLY"]),
});
type Form = z.infer<typeof schema>;

export default function EvidencePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { side: "TENANT", type: "PHOTO", privacy: "PUBLIC_TO_PARTIES" } as any,
  });

  async function onSubmit(values: Form) {
    setBusy(true); setMsg("");
    const id = makeId("ev");
    try {
      const hash = await addEvidence(id, caseId, JSON.stringify(values));
      setMsg("Evidence added: " + hash);
      reset();
    } catch (e: any) { setMsg("Failed: " + (e?.message || e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mono text-xs uppercase tracking-widest text-walnut">Evidence</div>
        <h1 className="font-prata text-3xl text-aubergine">Add a matter tag</h1>
      </div>
      <QuietPanel>
        <p className="text-xs italic text-walnut mb-3">
          Do not upload sensitive raw documents directly on-chain. Use storage URIs, CIDs, or hashes.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <F label="Side"><select className="input" {...register("side")}>{["TENANT","LANDLORD","KEEPER","ADMIN","NEUTRAL"].map(s=> <option key={s}>{s}</option>)}</select></F>
            <F label="Type"><select className="input" {...register("type")}>{EVIDENCE_TYPES.map(t=> <option key={t}>{t}</option>)}</select></F>
            <F label="Privacy"><select className="input" {...register("privacy")}>{["PUBLIC_TO_PARTIES","PRIVATE_HASH_ONLY","REDACTED","KEEPER_ONLY"].map(p=> <option key={p}>{p}</option>)}</select></F>
          </div>
          <F label="Title" err={errors.title?.message}><input className="input" {...register("title")} /></F>
          <F label="Description" err={errors.description?.message}><textarea rows={3} className="input" {...register("description")} /></F>
          <F label="URI / IPFS CID / link" err={errors.uri?.message}><input className="input mono" {...register("uri")} /></F>
          <div className="grid md:grid-cols-2 gap-3">
            <F label="Hash (optional)"><input className="input mono" {...register("hash")} /></F>
            <F label="Issued at (ISO, optional)"><input className="input mono" placeholder="2026-06-10" {...register("issuedAt")} /></F>
          </div>
          <div className="flex items-center gap-3">
            <EvidenceButton type="submit" disabled={busy}>{busy ? "ADDING…" : "ADD EVIDENCE"}</EvidenceButton>
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
