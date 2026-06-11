# Tenoria — Tenant Complaint Arbitrator (GenLayer)

Private tenant complaint arbitration on **GenLayer Studionet**. Keepers trigger consensus review of complaint narratives, landlord responses, lease policy, evidence, and timelines. Validators decide credibility, actionability, urgency, and required next steps.

## Stack
- Next.js 15 (App Router), TypeScript strict, Tailwind CSS
- `genlayer-js` (1.2+), `viem`, `react-hook-form`, `zod`, `zustand`, `idb`
- GenLayer Python contract: `contracts/Tenoria.py`

## Setup
```bash
npm install
cp .env.example .env.local      # fill NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS after deploy
npm run dev
```

## Deploy the contract
Deploy `contracts/Tenoria.py` to GenLayer Studionet (chainId 61999) and set the resulting address in `.env.local`.

## Routes
- `/` — Landing (Split Mediation Table hero)
- `/dashboard` — Role-aware case list
- `/open-complaint` — Tenant complaint wizard
- `/cases/[caseId]` — Private case detail (parties / keeper / admin only)
- `/cases/[caseId]/respond` — Landlord response
- `/cases/[caseId]/evidence` — Add evidence
- `/cases/[caseId]/reconsideration` — Request reconsideration
- `/keeper` — Keeper review queue
- `/admin` — Keeper management, pause, stats

## Privacy
No public case explorer. Cases are visible only to the tenant, landlord, assigned keeper, and admin. Store sensitive evidence as hashes, CIDs, or private links — never raw on-chain.

## Keeper bot (cron-job.org → Vercel)

A serverless keeper bot runs at `/api/keeper/tick`. cron-job.org pings it every 5 minutes; it reads the queue, applies readiness gates, and calls `review_complaint` for each ready case using a bot wallet.

Set these env vars in Vercel (server-only, no `NEXT_PUBLIC_` prefix):
- `KEEPER_PRIVATE_KEY` — bot wallet private key (register via `add_keeper(botAddress)` from admin first)
- `CRON_SECRET` — random string; cron-job.org sends `Authorization: Bearer <secret>`
- `KEEPER_MAX_PER_TICK` (optional, default 5)
- `KEEPER_MAX_RETRIES` (optional, default 3)

Set the cron-job.org URL to `https://<your-app>.vercel.app/api/keeper/tick`, method POST, header `Authorization: Bearer <CRON_SECRET>`, every 5 minutes.

Sanity-check config at `/api/keeper/status` (no secret required).

## No demo data
Empty states only. All data comes from real on-chain actions.
