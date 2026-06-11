"use client";
import { create } from "zustand";

type WalletState = {
  address: string;
  setAddress: (a: string) => void;
  disconnect: () => void;
};

export const useWallet = create<WalletState>((set) => ({
  address: typeof window !== "undefined" ? (localStorage.getItem("tenoria:wallet") || "") : "",
  setAddress: (a) => {
    if (typeof window !== "undefined") localStorage.setItem("tenoria:wallet", a);
    set({ address: a });
  },
  disconnect: () => {
    if (typeof window !== "undefined") localStorage.removeItem("tenoria:wallet");
    set({ address: "" });
  },
}));

export async function connectMetaMask(): Promise<string> {
  const { getMetaMaskProvider, requestAccounts } = await import("@/lib/genlayer/provider");
  const provider = getMetaMaskProvider();
  const accounts = await requestAccounts(provider);
  return (accounts?.[0] || "").toLowerCase();
}
