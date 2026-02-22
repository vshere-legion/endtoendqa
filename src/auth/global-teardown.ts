/**
 * Global Teardown — runs ONCE after all workers finish.
 *
 * Responsibilities:
 *   1. Clean up file locks
 *   2. Print summary
 */

import { FullConfig } from '@playwright/test';
import { cleanAllLocks } from '../data/file-lock';

async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('\n[GlobalTeardown] Cleaning up...');
  cleanAllLocks();
  console.log('[GlobalTeardown] Done.');
}

export default globalTeardown;
