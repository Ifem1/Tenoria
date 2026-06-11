"use client";
import { useEffect, useState } from "react";
import { isKeeper as readIsKeeper } from "./read";

const OWNER = "0xE3A26A71b2B26aC623A1F1447D28afc6cac0Fb9c".toLowerCase();

type CacheEntry = { value: boolean; at: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

// True if the address is the contract owner OR a registered keeper.
// Result is cached in-memory for 30 s to avoid hammering RPC on every render.
// Returns null while the first check is in flight.
export function useIsKeeperOrOwner(address: string | null | undefined): boolean | null {
  const lc = (address || "").toLowerCase();
  const initial = (() => {
    if (!lc) return false;
    if (lc === OWNER) return true;
    const c = cache.get(lc);
    if (c && Date.now() - c.at < TTL_MS) return c.value;
    return null;
  })();
  const [state, setState] = useState<boolean | null>(initial);

  useEffect(() => {
    if (!lc) { setState(false); return; }
    if (lc === OWNER) { setState(true); return; }
    const c = cache.get(lc);
    if (c && Date.now() - c.at < TTL_MS) { setState(c.value); return; }

    let cancelled = false;
    (async () => {
      try {
        const ok = !!(await readIsKeeper(lc));
        cache.set(lc, { value: ok, at: Date.now() });
        if (!cancelled) setState(ok);
      } catch {
        if (!cancelled) setState(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lc]);

  return state;
}
