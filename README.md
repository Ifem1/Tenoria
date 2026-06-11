# Tenoria

Tenoria is a private home for tenant complaints. A renter opens a sealed case against their landlord, both sides share their story, evidence, and the relevant lease clauses, and **an independent AI panel reads the whole case and decides whether the complaint is credible, urgent, and actionable** — then writes that decision somewhere it can't be quietly changed later. Either party can ask for a fresh review if new evidence shows up. It feels less like a courtroom and more like a quiet mediation room.

The reason Tenoria exists: housing complaints almost never have one obviously right answer. They turn on judgement — does the lease actually back this? Is the landlord's response good enough? Is this dangerous or just annoying? Tenoria automates that judgement honestly, without anyone having the power to fake the outcome.

## How it works (in plain terms)

- **Private by default** — only the tenant, the landlord, and (optionally) an assigned helper can see a case
- **No one can override the verdict** — not the tenant, not the landlord, not even the admin who runs the platform
- **Each review costs a tiny fee** (0.01 GEN by default) so the system can't be spammed
- **Either party can ask for a second look** if they find new evidence after the first review
- **The decision is clear and structured**: a ruling, how credible the complaint seems, how urgent, how well the lease supports it, what should happen next
- **Sensitive documents stay off-chain** — only short summaries and proof-of-existence are recorded
- **A small automated helper** can run reviews in the background every few minutes so nothing sits forgotten, but it's not required — anyone can move their own case forward
- **The admin only handles plumbing** — setting the fee, pausing the platform in an emergency, managing helper addresses

## Why this needs GenLayer

A normal smart contract can store complaint text, evidence hashes, and deadlines. It cannot decide whether a complaint is credible, whether a landlord's response addresses it, whether the lease supports the requested remedy, or whether the case is urgent and actionable. **GenLayer validators run an LLM-judged consensus review** that produces a structured, enum-only ruling — credibility, actionability, urgency, lease support, evidence strength, landlord-response quality, reason codes, and a recommended next action — all written on-chain. The contract calls `gl.nondet.exec_prompt` and certifies the leader's output through `gl.eq_principle.prompt_non_comparative`, so consensus forms around the **validity** of the judgement, not its exact wording.

## Status flow

```
AWAITING_LANDLORD_RESPONSE → RESPONSE_SUBMITTED → READY_FOR_REVIEW
  → UNDER_REVIEW → REVIEWED
  → (optional) READY_FOR_RECONSIDERATION_REVIEW → RECONSIDERATION_REVIEWED
  → FINALIZED
```

## Stack
- Next.js 15 (App Router), TypeScript strict, Tailwind CSS
- `genlayer-js` 1.2+, `viem`, `react-hook-form`, `zod`, `zustand`, `idb`
- GenLayer Python contract: [`contracts/Tenoria.py`](contracts/Tenoria.py)
- GenLayer Studionet (chainId 61999)
- Quiet Tribunal UI — Chamber Aubergine + Witness Pink + Policy Sand + Mediation Teal palette, Prata + Nunito Sans + Red Hat Mono fonts

## Setup
```bash
npm install
cp .env.example .env.local      # fill NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS after deploy
npm run dev
```

## Deploy the contract
Deploy [`contracts/Tenoria.py`](contracts/Tenoria.py) to GenLayer Studionet (chainId 61999) and set the resulting address as `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS`.

## Routes
- `/` — Landing (Split Mediation Table hero)
- `/dashboard` — Role-aware case list
- `/open-complaint` — Tenant complaint wizard
- `/cases/[caseId]` — Private case detail (parties / keeper / admin only)
- `/cases/[caseId]/respond` — Landlord response
- `/cases/[caseId]/evidence` — Add evidence
- `/cases/[caseId]/reconsideration` — Request reconsideration
- `/keeper` — Keeper review queue (hidden 404 for non-keepers)
- `/TenAdmin` — Owner-only platform operations (hidden 404 for non-owners)

## Privacy
No public case explorer. Cases are visible only to the tenant, landlord, assigned keeper, and admin. Store sensitive evidence as hashes, CIDs, redacted summaries, or private links — never raw on-chain.

## Helper bot (cron-job.org → Vercel)

A serverless helper runs at `/api/keeper/tick`. cron-job.org pings it every 5 minutes; it reads the review queue, pulls the current review fee from `get_config()`, and calls `trigger_review` (or `trigger_reconsideration_review`) for each case in the right state, paying the fee from the bot wallet.

Vercel env vars (server-only — no `NEXT_PUBLIC_` prefix):
- `KEEPER_PRIVATE_KEY` — bot wallet private key (register on-chain via `add_keeper(botAddress)` from `/TenAdmin` first)
- `CRON_SECRET` — long random string; cron-job.org sends `Authorization: Bearer <secret>`
- `KEEPER_MAX_PER_TICK` (optional, default `5`)
- `KEEPER_MAX_RETRIES` (optional, default `3`)

cron-job.org settings:
- URL: `https://<your-app>.vercel.app/api/keeper/tick`
- Method: `POST`
- Custom header: `Authorization: Bearer <CRON_SECRET>`
- Schedule: every 5 minutes

Sanity-check config (no secret required): `GET /api/keeper/status`.

## No demo data
Empty states only. All data comes from real on-chain actions.
