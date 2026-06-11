import type { ComplaintCase, LandlordResponse } from "@/types";

export function StatementPair({ c, response }: { c: ComplaintCase; response: LandlordResponse | null }) {
  return (
    <section className="grid md:grid-cols-2 gap-4">
      <div className="statement-tenant rounded-lg p-5">
        <div className="mono text-xs uppercase tracking-widest text-walnut">Tenant Statement</div>
        <h3 className="font-prata text-lg text-aubergine mt-1">{c.category.replace(/_/g, " ")}</h3>
        <p className="text-sm mt-3 whitespace-pre-wrap">{c.complaintNarrative}</p>
        <div className="mt-3 text-xs">
          <div className="mono uppercase text-walnut">Desired remedy</div>
          <div>{c.desiredRemedy}</div>
        </div>
      </div>
      <div className="statement-landlord rounded-lg p-5">
        <div className="mono text-xs uppercase tracking-widest text-walnut">Landlord Response</div>
        {response ? (
          <>
            <h3 className="font-prata text-lg text-walnut mt-1">{response.status}</h3>
            <p className="text-sm mt-3 whitespace-pre-wrap">{response.responseNarrative}</p>
            <div className="mt-3 text-xs space-y-2">
              <div><span className="mono uppercase text-walnut">Lease position: </span>{response.leasePolicyPosition}</div>
              <div><span className="mono uppercase text-walnut">Actions taken: </span>{response.repairActionHistory}</div>
              <div><span className="mono uppercase text-walnut">Proposed resolution: </span>{response.proposedResolution}</div>
            </div>
          </>
        ) : (
          <p className="text-sm mt-3 italic text-walnut">Awaiting landlord response.</p>
        )}
      </div>
    </section>
  );
}
