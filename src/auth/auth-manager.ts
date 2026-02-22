/**
 * Auth Manager — Enterprise session reuse via Playwright storageState.
 *
 * Instead of logging in via UI for every scenario, this:
 *   1. Logs in ONCE per worker (in globalSetup or worker fixture)
 *   2. Saves session cookies/localStorage to a temp file
 *   3. Every scenario reuses that session via storageState
 *
 * Result: ~3-5 seconds saved per scenario (no login page load + fill + submit).
 * For 500 scenarios = ~25-40 minutes saved per run.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Browser, BrowserContext, chromium } from '@playwright/test';
import { getEnvironmentConfig } from '../config/environment';
import { DataService } from '../data/data-service';

const AUTH_DIR = path.resolve(process.cwd(), '.auth');

export interface AuthSession {
  userType: string;
  storagePath: string;
  username: string;
  enterprise: string;
  timestamp: number;
}

/**
 * Get the storage state file path for a given userType.
 */
export function getStoragePath(userType: string): string {
  const envConfig = getEnvironmentConfig();
  const safeName = `${envConfig.enterprise}_${envConfig.environment}_${userType}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(AUTH_DIR, `${safeName}.json`);
}

/**
 * Check if a valid (non-expired) auth session exists for this userType.
 * Sessions expire after maxAgeMs (default: 30 minutes).
 */
export function hasValidSession(userType: string, maxAgeMs = 30 * 60 * 1000): boolean {
  const storagePath = getStoragePath(userType);
  if (!fs.existsSync(storagePath)) return false;

  const stat = fs.statSync(storagePath);
  const age = Date.now() - stat.mtimeMs;
  return age < maxAgeMs;
}

/**
 * Authenticate via UI and save the session for reuse.
 *
 * This is called ONCE per userType (typically in globalSetup or a worker fixture).
 * Subsequent scenarios reuse the saved session via storageState.
 *
 * @param userType - e.g. 'Admin', 'StoreManager1'
 * @param loginUrl - full login page URL (optional, auto-resolved from config)
 * @param selectors - CSS selectors for login form elements
 */
export async function createAuthSession(
  userType: string,
  options?: {
    loginUrl?: string;
    selectors?: {
      username: string;
      password: string;
      submitButton: string;
      successIndicator: string;
    };
  },
): Promise<AuthSession> {
  const envConfig = getEnvironmentConfig();
  const dataService = new DataService();
  const user = dataService.getUILoginUserBy(userType);

  const loginUrl = options?.loginUrl
    ?? `${envConfig.baseUrl}legion/?enterprise=${envConfig.enterprise}#/`;

  const selectors = options?.selectors ?? {
    username: 'input[ng-model="username"], [data-testid="username-input"], #username',
    password: '[ng-model="password"], [data-testid="password-input"], #password',
    submitButton: '.login-button-icon, [data-testid="login-btn"], button[type="submit"]',
    successIndicator: '[data-testid="dashboard"], .dashboard-section, .console-dashboard',
  };

  // Ensure auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const storagePath = getStoragePath(userType);

  console.log(`[AuthManager] Creating session for ${userType} (${user.name})...`);

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.locator(selectors.username).first().fill(user.name);
    await page.locator(selectors.password).first().fill(user.password);
    await page.locator(selectors.submitButton).first().click();

    // Wait for login to complete
    await page.locator(selectors.successIndicator).first().waitFor({
      state: 'visible',
      timeout: 30000,
    });

    // Save session (cookies + localStorage)
    await context.storageState({ path: storagePath });

    console.log(`[AuthManager] Session saved: ${storagePath}`);

    const session: AuthSession = {
      userType,
      storagePath,
      username: user.name,
      enterprise: envConfig.enterprise,
      timestamp: Date.now(),
    };

    // Release the user back to the pool
    dataService.releaseLocationAndUsers();

    return session;
  } catch (error: any) {
    console.error(`[AuthManager] Login failed for ${userType}: ${error.message}`);
    // Take a debug screenshot
    await page.screenshot({ path: path.join(AUTH_DIR, `login-failure-${userType}.png`) });
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Clean up all saved auth sessions.
 * Call in globalTeardown.
 */
export function clearAllSessions(): void {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log('[AuthManager] All sessions cleared.');
  }
}
