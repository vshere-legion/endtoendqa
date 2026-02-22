import { test as base } from 'playwright-bdd';
import { BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { PageManager } from '../pages/page-manager';
import { Logger } from '../utils/Logger';
import { ApiHelper } from '../utils/api-helper';
import { TestContext } from '../data/test-context';
import { ContextKey } from '../data/models';
import { getEnvironmentConfig } from '../config/environment';

// ─── Dual-Mode Browser Context Architecture ───────────────────
//
// Supports two modes, controlled by the @mode:serial tag on Feature:
//
// SERIAL MODE (@mode:serial on Feature):
//   All scenarios share the same BrowserContext, Page, and TestContext.
//   Browser state (cookies, localStorage, DOM) carries forward.
//   Use for scenario chains where step N depends on step N-1's state.
//   Playwright-native skip-on-failure: if a scenario fails, remaining
//   scenarios in the chain are automatically skipped.
//
//   Example:
//     @mode:serial
//     Feature: P2P Schedule Generation
//       Scenario: Generate schedule        ← logs in, creates schedule
//       Scenario: Verify smart cards       ← reuses same page + session
//
// DEFAULT MODE (no @mode:serial):
//   Each scenario gets a fresh BrowserContext, Page, and TestContext.
//   Full isolation — no shared state between scenarios.
//   Background login step authenticates every scenario independently.
//
// FAILURE HANDLING (serial mode only):
//   If a scenario fails, before the next scenario runs:
//     1. Take a failure screenshot (attached to Playwright report)
//     2. Dismiss any open dialogs/alerts that might block the page
//     3. Navigate to base URL (dashboard) — clean slate
//     4. If page is dead, open a fresh page in the same context
//   With @mode:serial, Playwright also skips remaining scenarios,
//   so recovery is a safety net that rarely executes.
//
// HOW: Module-level variables hold the shared context/page. Each
// Playwright worker is its own OS process, so these are per-worker.
// With fullyParallel=false, all scenarios in a feature run on the
// same worker sequentially. When the worker moves to a new feature,
// we detect the name change and create a fresh context.
// ────────────────────────────────────────────────────────────────

let _sharedContext: BrowserContext | null = null;
let _sharedPage: Page | null = null;
let _sharedTestContext: TestContext | null = null;
let _currentFeature: string | null = null;
let _previousScenarioFailed = false;
let _failedScenarioName: string | null = null;

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'reports', 'screenshots');

/**
 * Check if the current feature/scenario is running in serial mode.
 * Serial mode = shared BrowserContext + Page + TestContext across scenarios.
 * Triggered by @mode:serial tag on the Feature.
 */
function isSerialMode(tags: string[]): boolean {
  return tags.includes('@mode:serial');
}

type CustomFixtures = {
  testContext: TestContext;
  pageManager: PageManager;
  logger: Logger;
  apiHelper: ApiHelper;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<CustomFixtures>({
  /**
   * Override built-in context fixture.
   *
   * DUAL MODE based on @mode:serial tag:
   *
   * SERIAL (@mode:serial on Feature):
   *   Shared BrowserContext across all scenarios in the feature.
   *   Fresh context per feature file. The Background login step
   *   authenticates on first scenario; subsequent ones skip.
   *
   * DEFAULT (no @mode:serial):
   *   Fresh BrowserContext per scenario. Each scenario starts clean.
   *   Background login step authenticates every time.
   */
  context: async ({ browser, $tags }, use, testInfo) => {
    const featureName = testInfo.titlePath[0];
    const serial = isSerialMode($tags);

    if (serial) {
      // ── SERIAL: Shared BrowserContext across scenarios in feature ──
      if (featureName !== _currentFeature || !_sharedContext) {
        if (_sharedContext) {
          await _sharedContext.close().catch(() => {});
          _sharedPage = null;
          _sharedTestContext = null;
        }

        _previousScenarioFailed = false;
        _failedScenarioName = null;

        _sharedContext = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });

        _currentFeature = featureName;
      }

      await use(_sharedContext);
    } else {
      // ── DEFAULT: Fresh BrowserContext per scenario ──
      if (featureName !== _currentFeature) {
        if (_sharedContext) {
          await _sharedContext.close().catch(() => {});
          _sharedContext = null;
          _sharedPage = null;
          _sharedTestContext = null;
        }
        _currentFeature = featureName;
      }

      const ctx = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
      });
      await use(ctx);
      await ctx.close().catch(() => {});
    }
  },

  /**
   * Override built-in page fixture.
   *
   * DUAL MODE based on @mode:serial tag:
   *
   * SERIAL: Shared page across scenarios. Recovery after failure:
   *   → Dismiss blocking dialogs, navigate to base URL
   *   → If page is dead, open fresh page in same context
   *   → With @mode:serial, Playwright skips remaining scenarios
   *     on failure, so recovery is a safety net only.
   *
   * DEFAULT: Fresh page per scenario. No recovery needed —
   *   context is disposed after each scenario.
   */
  page: async ({ context, $tags }, use, testInfo) => {
    const serial = isSerialMode($tags);

    if (serial) {
      // ── SERIAL: Shared page with failure recovery ──
      if (_previousScenarioFailed) {
        console.log(
          `[Recovery] Previous scenario "${_failedScenarioName}" failed. ` +
          `Recovering page for: "${testInfo.title}"`
        );
        _sharedPage = await recoverPage(_sharedPage, context);
        _previousScenarioFailed = false;
      }

      if (!_sharedPage || _sharedPage.isClosed()) {
        _sharedPage = await context.newPage();
      }

      await use(_sharedPage);

      if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
        _previousScenarioFailed = true;
        _failedScenarioName = testInfo.title;
        await captureFailureScreenshot(_sharedPage, testInfo);
      }
    } else {
      // ── DEFAULT: Fresh page per scenario ──
      const page = await context.newPage();
      await use(page);
      // Context closure handles page cleanup
    }
  },

  /**
   * TestContext — data store for sharing state between steps.
   *
   * SERIAL: Shared across all scenarios in the feature. Data set by
   *   Scenario 1 (e.g. a schedule name) is available to Scenario 2.
   *
   * DEFAULT: Fresh per scenario. Each scenario starts with empty context.
   */
  testContext: async ({ $tags }, use) => {
    const serial = isSerialMode($tags);

    if (serial) {
      // ── SERIAL: Shared TestContext across scenarios in feature ──
      if (!_sharedTestContext) {
        _sharedTestContext = new TestContext();
        const envConfig = getEnvironmentConfig();
        _sharedTestContext.setContext(ContextKey.ENTERPRISE_NAME, envConfig.enterprise);
      }
      await use(_sharedTestContext);
    } else {
      // ── DEFAULT: Fresh TestContext per scenario ──
      const tc = new TestContext();
      const envConfig = getEnvironmentConfig();
      tc.setContext(ContextKey.ENTERPRISE_NAME, envConfig.enterprise);
      await use(tc);
    }
  },

  logger: async ({}, use, testInfo) => {
    const logger = new Logger(`Scenario`, {
      workerIndex: testInfo.workerIndex,
      correlationId: `${testInfo.testId}`,
    });

    logger.info(`Started: ${testInfo.title}`);
    await use(logger);

    const status = testInfo.status === 'passed' ? 'PASSED' : testInfo.status?.toUpperCase() || 'UNKNOWN';
    logger.info(`Finished: ${testInfo.title} [${status}] (${testInfo.duration}ms)`);
    logger.close();
  },

  apiHelper: async ({ request }, use, testInfo) => {
    const logger = new Logger('API', { workerIndex: testInfo.workerIndex });
    const api = new ApiHelper(request, { logger });
    await use(api);
  },

  /**
   * PageManager — lazily creates & caches page objects per feature.
   *
   * Tied to the shared Page lifecycle. All scenarios in a feature
   * reuse the same cached page objects (since they share the same Page).
   *
   * Usage in steps:  const schedulePage = pageManager.get(P2PSchedulePage);
   */
  pageManager: async ({ page, testContext }, use) => {
    await use(testContext.getPageManager(page));
  },

  loginPage: async ({ page, testContext }, use) => {
    await use(new LoginPage(page, testContext as any));
  },

  dashboardPage: async ({ page, testContext }, use) => {
    await use(new DashboardPage(page, testContext as any));
  },
});

// ─── Recovery & Screenshot Helpers ─────────────────────────────

/**
 * Recover the page after a scenario failure.
 *
 * Goal: Get the page to a clean, usable state (base URL / dashboard)
 * so the next scenario's Given steps can navigate to wherever they need.
 *
 * Steps:
 *   1. Dismiss any blocking JS dialogs (alert/confirm/prompt)
 *   2. Navigate to base URL (dashboard) — clean starting point
 *   3. If page is completely dead → open a fresh page in the same context
 */
async function recoverPage(
  page: Page | null,
  context: BrowserContext,
): Promise<Page> {
  if (page && !page.isClosed()) {
    // Dismiss any open JS dialogs that might block navigation
    page.on('dialog', dialog => dialog.dismiss().catch(() => {}));

    // Try navigating to base URL (dashboard) — clean starting point
    try {
      const baseUrl = process.env.BASE_URL || '/';
      await page.goto(baseUrl, { timeout: 15_000, waitUntil: 'domcontentloaded' });
      // Remove the dialog handler after recovery
      page.removeAllListeners('dialog');
      console.log('[Recovery] Navigated to base URL — page ready for next scenario');
      return page;
    } catch (navErr) {
      console.log(`[Recovery] Navigation failed: ${(navErr as Error).message}`);
    }

    // Base URL failed — try a simple reload
    try {
      await page.reload({ timeout: 10_000, waitUntil: 'domcontentloaded' });
      page.removeAllListeners('dialog');
      console.log('[Recovery] Page reloaded — continuing');
      return page;
    } catch {
      console.log('[Recovery] Reload also failed — page is dead');
    }

    // Close the dead page
    await page.close().catch(() => {});
  }

  // Last resort: open a fresh page (still in the same logged-in context)
  console.log('[Recovery] Opening fresh page in same context (session preserved)');
  return context.newPage();
}

/**
 * Capture a screenshot on scenario failure and attach to the Playwright report.
 */
async function captureFailureScreenshot(page: Page | null, testInfo: any): Promise<void> {
  if (!page || page.isClosed()) return;

  try {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const sanitizedTitle = testInfo.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
    const fileName = `failure-${sanitizedTitle}-${Date.now()}.png`;
    const filePath = path.join(SCREENSHOT_DIR, fileName);

    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`[Fixtures] Failure screenshot: ${filePath}`);

    // Attach to Playwright HTML report
    testInfo.attachments.push({
      name: 'failure-screenshot',
      contentType: 'image/png',
      path: filePath,
    });
  } catch {
    // Page might be in a state where screenshot fails — that's OK
  }
}

export { expect } from '@playwright/test';
export { TestContext } from '../data/test-context';
export { ContextKey } from '../data/models';
