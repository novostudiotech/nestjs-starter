/**
 * Dotenv configuration
 * Loads environment variables based on APP_ENV
 *
 * IMPORTANT: NODE_ENV and APP_ENV must be set explicitly (via system env, CI, etc.),
 * NOT in .env files. These variables control which .env file to load and build mode,
 * so they cannot be set in the loaded file itself.
 *
 * Sets defaults (if not set explicitly):
 * - NODE_ENV: 'development' (how code runs: development/production)
 * - APP_ENV: 'local' (where code is deployed: local/test/dev/staging/prod)
 *
 * Loading (cascading, first value wins via dotenv):
 * 1. .env.{APP_ENV}.local (local overrides, git-ignored)
 * 2. .env.{APP_ENV} (e.g., .env.test, .env.prod)
 * 3. .env (base fallback)
 *
 * Example usage:
 *   APP_ENV=prod pnpm start:prod  # .env.prod.local → .env.prod → .env
 *   APP_ENV=test pnpm test:e2e    # .env.test.local → .env.test → .env
 *   pnpm dev                      # .env.local → .env
 */

const { config } = require('dotenv');
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

// Set defaults BEFORE loading .env files
// These should be set explicitly (via system env, CI, etc.), not in .env files
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.APP_ENV = process.env.APP_ENV || 'local';

const appEnv = process.env.APP_ENV;
const envFiles = [`.env.${appEnv}.local`, `.env.${appEnv}`, '.env'];

// Check if .env file contains forbidden variables
function hasForbiddenVars(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return /^(NODE_ENV|APP_ENV)\s*=/im.test(content);
  } catch {
    return false;
  }
}

// Load all existing files in priority order (first value wins, dotenv doesn't override)
let loaded = false;
for (const file of envFiles) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) {
    if (hasForbiddenVars(path)) {
      console.error(`[dotenv] ERROR: ${file} contains NODE_ENV or APP_ENV`);
      console.error(
        '[dotenv] These variables must be set via system environment, not in .env files'
      );
      process.exit(1);
    }

    console.log(`[dotenv] Loading environment from: ${file}`);
    config({ path });
    loaded = true;
  }
}

if (!loaded) {
  console.log('[dotenv] No .env file found, using system environment variables');
}
