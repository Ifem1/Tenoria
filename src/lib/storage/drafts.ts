"use client";
import { openDB, type IDBPDatabase } from "idb";

const DB = "tenoria-drafts";
const STORE = "complaint-drafts";

async function db(): Promise<IDBPDatabase> {
  return openDB(DB, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    },
  });
}

export async function saveDraft(key: string, value: unknown) {
  const d = await db(); await d.put(STORE, value, key);
}
export async function loadDraft<T = unknown>(key: string): Promise<T | undefined> {
  const d = await db(); return d.get(STORE, key) as Promise<T | undefined>;
}
export async function clearDraft(key: string) {
  const d = await db(); await d.delete(STORE, key);
}
