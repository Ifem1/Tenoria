"use client";
import { GENLAYER_STUDIONET, CONTRACT_ADDRESS, CONTRACT_CONFIGURED } from "./config";
import { getMetaMaskProvider, requestAccounts } from "./provider";

let _readClient: any = null;
let _walletClient: any = null;
let _walletAccount: string | null = null;

async function loadSdk(): Promise<any> {
  return await import("genlayer-js");
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
export const getClient = getReadClient;

// Build a wallet client that signs via the injected MetaMask provider directly.
// No GenLayer Snap. No viem walletClient. createClient routes signing methods
// through `config.provider` when `config.account` is an address string.
export async function getWalletClient(): Promise<{ client: any; account: string }> {
  if (!CONTRACT_CONFIGURED) throw new Error("CONTRACT_NOT_CONFIGURED");

  const provider = getMetaMaskProvider();
  console.log("[walletClient] provider", { isMetaMask: provider?.isMetaMask, hasProviders: Array.isArray((window as any).ethereum?.providers) });

  const accounts = await requestAccounts(provider);
  console.log("[walletClient] accounts", accounts);
  const account = (accounts?.[0] || "").toLowerCase();
  if (!account) throw new Error("MetaMask returned no account");

  // Ensure the wallet is on Studionet (request a switch / add if not).
  try {
    const currentHex: string = await provider.request({ method: "eth_chainId" });
    const desiredHex = "0x" + GENLAYER_STUDIONET.chainId.toString(16);
    if (currentHex?.toLowerCase() !== desiredHex.toLowerCase()) {
      console.log("[walletClient] switching chain", currentHex, "->", desiredHex);
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: desiredHex }] });
      } catch (switchErr: any) {
        if (switchErr?.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: desiredHex,
              chainName: GENLAYER_STUDIONET.name,
              rpcUrls: [GENLAYER_STUDIONET.rpcUrl],
              nativeCurrency: { name: GENLAYER_STUDIONET.currency, symbol: GENLAYER_STUDIONET.currency, decimals: 18 },
              blockExplorerUrls: [GENLAYER_STUDIONET.explorerUrl],
            }],
          });
        } else {
          throw switchErr;
        }
      }
    }
  } catch (e: any) {
    console.warn("[walletClient] chain switch warning", e?.message || e);
  }

  if (_walletClient && _walletAccount === account) return { client: _walletClient, account };

  const sdk = await loadSdk();
  _walletClient = sdk.createClient({
    chain: chainConfig(sdk),
    endpoint: GENLAYER_STUDIONET.rpcUrl,
    account,
    provider,
  });
  _walletAccount = account;
  return { client: _walletClient, account };
}

export function explorerTxUrl(hash: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/tx/${hash}`;
}
export function explorerAddrUrl(addr: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/address/${addr}`;
}

export { CONTRACT_ADDRESS, CONTRACT_CONFIGURED };
