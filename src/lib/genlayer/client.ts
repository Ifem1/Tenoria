"use client";
import { GENLAYER_STUDIONET, CONTRACT_ADDRESS, CONTRACT_CONFIGURED } from "./config";

// Read-only client: pure RPC, no signer. Used for view calls.
let _readClient: any = null;

// Wallet-connected client via the GenLayer MetaMask Snap. Used for writes.
let _walletClient: any = null;

async function loadSdk(): Promise<any> {
  const sdk: any = await import("genlayer-js");
  return sdk;
}

function chainConfig(sdk: any) {
  return sdk.chains?.studionet || {
    id: GENLAYER_STUDIONET.chainId,
    name: GENLAYER_STUDIONET.name,
    rpcUrls: { default: { http: [GENLAYER_STUDIONET.rpcUrl] } },
    nativeCurrency: { name: GENLAYER_STUDIONET.currency, symbol: GENLAYER_STUDIONET.currency, decimals: 18 },
  };
}

export async function getReadClient(): Promise<any> {
  if (_readClient) return _readClient;
  if (!CONTRACT_CONFIGURED) throw new Error("CONTRACT_NOT_CONFIGURED");
  const sdk = await loadSdk();
  _readClient = sdk.createClient({
    chain: chainConfig(sdk),
    endpoint: GENLAYER_STUDIONET.rpcUrl,
  });
  return _readClient;
}

// Backwards-compatible alias for existing read.ts callers.
export const getClient = getReadClient;

export async function getWalletClient(): Promise<any> {
  if (_walletClient) return _walletClient;
  if (typeof window === "undefined") throw new Error("Wallet client requires a browser");
  if (!(window as any).ethereum) throw new Error("No injected wallet found. Install MetaMask.");
  if (!CONTRACT_CONFIGURED) throw new Error("CONTRACT_NOT_CONFIGURED");
  const sdk = await loadSdk();
  // 1. Base client
  const base = sdk.createClient({
    chain: chainConfig(sdk),
    endpoint: GENLAYER_STUDIONET.rpcUrl,
  });
  // 2. Upgrade to MetaMask-signing client via the GenLayer Snap.
  //    First call triggers the snap install / permission prompt in MetaMask,
  //    plus a chain-switch to GenLayer Studionet if needed.
  try {
    _walletClient = await base.metamaskClient();
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.toLowerCase().includes("snap")) {
      throw new Error(
        "GenLayer MetaMask Snap not installed or rejected. " +
        "Open MetaMask, approve the GenLayer Snap install, then retry."
      );
    }
    throw e;
  }
  return _walletClient;
}

export function explorerTxUrl(hash: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/tx/${hash}`;
}
export function explorerAddrUrl(addr: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/address/${addr}`;
}

export { CONTRACT_ADDRESS, CONTRACT_CONFIGURED };
