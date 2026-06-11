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
  const eth = (typeof window !== "undefined" ? (window as any).ethereum : null);
  if (!eth) throw new Error("No injected wallet found");
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  return (accounts?.[0] || "").toLowerCase();
}
