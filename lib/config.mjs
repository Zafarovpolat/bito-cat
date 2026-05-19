/**
 * Конфигурация — читает .env из корня репо
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = {};

try {
  readFileSync(path.join(root, '.env'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .forEach(l => {
      const [k, ...v] = l.split('=');
      if (k) env[k.trim()] = v.join('=').trim();
    });
} catch {}

export const config = {
  BITO_API_KEY:  env.BITO_API_KEY  || process.env.BITO_API_KEY,
  BITO_JWT:      env.BITO_JWT      || process.env.BITO_JWT,
  BITO_ORG_ID:   env.BITO_ORG_ID   || process.env.BITO_ORG_ID   || '6701170d334dc069f51e4c82',
  BITO_PRICE_ID: env.BITO_PRICE_ID || process.env.BITO_PRICE_ID || '6706187e485b322ea8c90155',
  SUPABASE_DSN:  env.SUPABASE_DSN  || process.env.SUPABASE_DSN,
  GITHUB_BASE:   env.GITHUB_BASE   || process.env.GITHUB_BASE   || 'https://zafarovpolat.github.io/bito-cat/edited',
};

// Validate
const missing = ['BITO_API_KEY','BITO_JWT','BITO_ORG_ID','SUPABASE_DSN']
  .filter(k => !config[k]);
if (missing.length) {
  console.error('❌ Missing config:', missing.join(', '));
  console.error('   Copy .env.example → .env and fill in values');
  process.exit(1);
}
