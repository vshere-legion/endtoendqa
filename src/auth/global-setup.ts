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
  console.log(`║  Enterprise:  ${envConfig.enterprise.padEnd(26)}║`);
  console.log('╚══════════════════════════════════════════╝');

  if (process.env.SKIP_HEALTH_CHECK === 'true') {
    console.log('[GlobalSetup] Health check skipped (SKIP_HEALTH_CHECK=true)');
  } else {
    await healthCheck(baseUrl);
  }

  console.log('[GlobalSetup] Complete.\n');
}

export default globalSetup;
