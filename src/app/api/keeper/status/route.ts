import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    ok: true,
    contract: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || null,
    chainId: Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || 61999),
    rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || null,
    keeperConfigured: !!process.env.KEEPER_PRIVATE_KEY,
    cronSecretConfigured: !!process.env.CRON_SECRET,
  });
}
