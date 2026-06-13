"use client";
import { ReactNode } from "react";
import { TopNavigation } from "./TopNavigation";
import { CONTRACT_CONFIGURED } from "@/lib/genlayer/config";
import { SETUP_NOTICE } from "@/lib/genlayer/config";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavigation />
      {!CONTRACT_CONFIGURED && (
        <div className="bg-marigold/90 text-ink text-sm px-6 py-2 mono">
          {SETUP_NOTICE}
        </div>
      )}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 animate-fadeIn">{children}</main>
      <footer className="border-t border-mist py-6 text-center text-xs text-walnut">
        Tenoria · Private tenant complaint arbitration on GenLayer Studionet
      </footer>
    </div>
  );
}
