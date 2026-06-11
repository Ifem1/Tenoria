import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(__dirname, "..", ".env.test");

if (!fs.existsSync(envFile)) {
  console.error("FATAL: tests/.env.test not found. Aborting.");
  process.exit(2);
}
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (!(k in process.env)) process.env[k] = v;
}

export function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`FATAL: env var ${name} is missing. Aborting (no defaults).`);
    process.exit(3);
  }
  return v;
}

export function maybe(name) { return process.env[name] || null; }
