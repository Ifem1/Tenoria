"use client";
import { GENLAYER_STUDIONET, CONTRACT_ADDRESS, CONTRACT_CONFIGURED } from "./config";

let _client: any = null;

export async function getClient(): Promise<any> {
  if (_client) return _client;
  if (!CONTRACT_CONFIGURED) throw new Error("CONTRACT_NOT_CONFIGURED");
  try {
    const sdk: any = await import("genlayer-js");
    const createClient = sdk.createClient || sdk.default?.createClient;
    if (!createClient) throw new Error("createClient missing from genlayer-js");
    _client = createClient({
      chain: {
        id: GENLAYER_STUDIONET.chainId,
        name: GENLAYER_STUDIONET.name,
        rpcUrls: { default: { http: [GENLAYER_STUDIONET.rpcUrl] } },
        nativeCurrency: { name: GENLAYER_STUDIONET.currency, symbol: GENLAYER_STUDIONET.currency, decimals: 18 },
      },
    });
  } catch (e: any) {
    throw new Error("GenLayer SDK unavailable: " + (e?.message || e));
  }
  return _client;
}

export function explorerTxUrl(hash: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/tx/${hash}`;
}
export function explorerAddrUrl(addr: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/address/${addr}`;
}

export { CONTRACT_ADDRESS, CONTRACT_CONFIGURED };
