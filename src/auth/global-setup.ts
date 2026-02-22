/**
 * Global Setup — runs ONCE before all workers start.
 *
 * Responsibilities:
 *   1. Health check — verify the target environment is reachable
 *   2. Print environment info banner
 *
 * Authentication is handled per-feature via idempotent Background
 * login steps — no pre-auth or storageState files are created here.
 *
 * Referenced in playwright.config.ts: globalSetup: './src/auth/global-setup.ts'
 */

import { FullConfig } from '@playwright/test';
import { getEnvironmentConfig } from '../config/environment';

async function healthCheck(baseUrl: string): Promise<void> {
  console.log(`[GlobalSetup] Health check: ${baseUrl}`);
  try {
    const response = await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    if (!response.ok && response.status !== 302 && response.status !== 301) {
      throw new Error(`HTTP ${response.status}`);
    }
    console.log(`[GlobalSetup] Health check passed (${response.status})`);
  } catch (error: any) {
    console.error(`[GlobalSetup] Health check FAILED: ${error.message}`);
    console.error(`[GlobalSetup] Is ${baseUrl} reachable? Aborting test run.`);
    process.exit(1);
  }
}

async function globalSetup(config: FullConfig): Promise<void> {
  const envConfig = getEnvironmentConfig();
  const baseUrl = config.projects[0]?.use?.baseURL || envConfig.baseUrl;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║          GLOBAL SETUP                    ║');
  console.log(`║  Environment: ${envConfig.environment.padEnd(26)}║`);
  console.log(`║  Enterprise:  ${(envConfig.enterprise || '(not set)').padEnd(26)}║`);
  console.log('╚══════════════════════════════════════════╝');

  // ─── Startup Validation ────────────────────────────────────
  // Surface misconfiguration before any test worker starts.
  // Warnings not errors — tests run but will fail with clearer context.

  if (!process.env.TEST_ENV) {
    console.warn(
      '[GlobalSetup] WARNING: TEST_ENV is not set. Defaulting to "dev".\n' +
      '             The dev environment is typically unreachable from CI.\n' +
      '             Set TEST_ENV=rc (or staging/uat/prod) to target a real environment.',
    );
  }

  if (!envConfig.enterprise) {
    console.warn(
      '[GlobalSetup] WARNING: ENTERPRISE env var is not set.\n' +
      '             DataService will have no credential data.\n' +
      '             Login steps fall back to the simple role map (admin@test.com etc.).\n' +
      '             Set ENTERPRISE=<name> to load test-data/users/user_loc_<name>_<env>.json.',
    );
  }

  if (process.env.SKIP_HEALTH_CHECK === 'true') {
    console.log('[GlobalSetup] Health check skipped (SKIP_HEALTH_CHECK=true)');
  } else {
    await healthCheck(baseUrl);
  }

  console.log('[GlobalSetup] Complete.\n');
}

export default globalSetup;
