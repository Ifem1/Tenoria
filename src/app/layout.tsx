import "@/styles/globals.css";
import { Prata, Nunito_Sans, Red_Hat_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";

const prata = Prata({ weight: "400", subsets: ["latin"], variable: "--font-prata", display: "swap" });
const nunito = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const mono = Red_Hat_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "Tenoria — Tenant Complaint Arbitrator",
  description: "Private tenant complaint arbitration on GenLayer Studionet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${prata.variable} ${nunito.variable} ${mono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
