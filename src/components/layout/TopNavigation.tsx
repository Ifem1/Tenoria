"use client";
import Link from "next/link";
import { useWallet, connectMetaMask } from "@/lib/wallet/store";
import { shortAddr } from "@/lib/utils/ids";

export function TopNavigation() {
  const { address, setAddress, disconnect } = useWallet();

  async function onConnect() {
    try {
      const a = await connectMetaMask();
      setAddress(a);
    } catch (e: any) {
      const a = window.prompt("Enter wallet address (0x...) for read-only access:") || "";
      if (a) setAddress(a.toLowerCase());
    }
  }

  return (
    <header className="border-b border-mist bg-cream">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-prata text-2xl text-aubergine tracking-wide">Tenoria</Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/dashboard" className="text-aubergine hover:text-mauve">Dashboard</Link>
          <Link href="/open-complaint" className="text-aubergine hover:text-mauve">Open Complaint</Link>
          <Link href="/keeper" className="text-aubergine hover:text-mauve">Keeper</Link>
          <Link href="/admin" className="text-aubergine hover:text-mauve">Admin</Link>
        </nav>
        <div>
          {address ? (
            <button onClick={disconnect} className="mono text-xs border border-aubergine text-aubergine px-3 py-1 rounded">
              {shortAddr(address)} · disconnect
            </button>
          ) : (
            <button onClick={onConnect} className="btn-secondary">Connect Wallet</button>
          )}
        </div>
      </div>
    </header>
  );
}
