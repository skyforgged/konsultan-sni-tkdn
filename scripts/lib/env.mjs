import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Muat berkas .env lokal sesuai urutan prioritas rendah -> tinggi.
// Variabel yang sudah ada di process.env TIDAK ditimpa (env eksternal/Vercel menang).
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const mode = process.env.NODE_ENV ?? '';
const candidates = [
  '.env',
  '.env.local',
  mode ? `.env.${mode}` : null,
  mode ? `.env.${mode}.local` : null,
].filter(Boolean);

export function loadEnv() {
  for (const name of candidates) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!key) continue;
      if (key in process.env) continue;
      let value = line.slice(eq + 1).trim();
      const first = value[0];
      if ((first === '"' && value.endsWith('"')) || (first === "'" && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
  return process.env;
}

// Jalankan otomatis saat diimpor agar skrip apa pun langsung mendapat env.
loadEnv();
