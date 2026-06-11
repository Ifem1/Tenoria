"use client";

// Explicitly pick the MetaMask provider when multiple wallet extensions are
// fighting for window.ethereum (Brave Wallet, Coinbase, Phantom, Rabby, etc.).
// EIP-1193 lets injected wallets expose `.providers[]` when there's a conflict.
export function getMetaMaskProvider(): any {
  if (typeof window === "undefined") {
    throw new Error("Wallet calls require a browser");
  }
  const eth: any = (window as any).ethereum;
  if (!eth) {
    throw new Error("No injected wallet provider found. Install MetaMask.");
  }
  if (Array.isArray(eth.providers) && eth.providers.length) {
    const mm = eth.providers.find((p: any) => p?.isMetaMask && !p?.isBraveWallet);
    if (mm) return mm;
  }
  if (eth.isMetaMask && !eth.isBraveWallet) return eth;
  throw new Error(
    "MetaMask provider not found. Disable Brave Wallet / other Ethereum extensions, " +
    "or use Chrome/Edge/Firefox with only MetaMask enabled."
  );
}

export async function requestAccounts(provider: any): Promise<string[]> {
  return provider.request({ method: "eth_requestAccounts" });
}
