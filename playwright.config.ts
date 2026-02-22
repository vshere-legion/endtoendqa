import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';
import { loadEnvConfig } from './config/env-manager';
import { TIMEOUTS } from './config/framework.config';

// ─── Environment & Team Selection ──────────────────────────
const env = process.env.TEST_ENV || 'dev';
loadEnvConfig(env);

const TEAM = process.env.TEST_TEAM || process.env.TEAM || 'all';
const TYPE = process.env.TYPE || 'all';

// ─── Parallel Mode ─────────────────────────────────────────
// 'feature' (default): Each feature file = 1 worker, scenarios run sequentially within.
//                       Multiple feature files run in parallel across workers.
// 'scenario':          Scenarios within features also run in parallel across workers.
//                       Used internally by run-split-scenarios.js when each process
//                       already has a filtered subset of scenarios.
const PARALLEL_MODE = process.env.PARALLEL_MODE || 'feature';

// ─── Feature & Step Paths ──────────────────────────────────
function getTestPaths() {
  // FEATURE_PATHS override: used by run-split-scenarios.js to point each
  // worker process at specific feature file(s). Comma-separated paths.
  if (process.env.FEATURE_PATHS) {
    const featurePaths = process.env.FEATURE_PATHS.split(',').map(p => p.trim());
    const base = TEAM === 'all' || TEAM === 'ALL' ? 'teams/*' : `teams/${TEAM}`;
    const steps = [`${base}/steps/**/*.ts`, 'shared/steps/**/*.ts', 'src/steps/**/*.ts'];
    return { features: featurePaths, steps };
  }

  const base = TEAM === 'all' || TEAM === 'ALL' ? 'teams/*' : `teams/${TEAM}`;
  const steps = [`${base}/steps/**/*.ts`, 'shared/steps/**/*.ts', 'src/steps/**/*.ts'];

  if (TYPE === 'api') {
    return { features: [`${base}/features/api/**/*.feature`], steps };
  } else if (TYPE === 'ui') {
    return { features: [`${base}/features/ui/**/*.feature`], steps };
  } else {
    return { features: [`${base}/features/**/*.feature`], steps };
  }
}

const { features, steps } = getTestPaths();

// ─── BDD Generation ────────────────────────────────────────
// Per-shard output directory prevents concurrent worker processes from
// overwriting each other's generated spec files (critical for split mode).
const outputDir = process.env.SHARD_ID
  ? `.features-gen-${process.env.SHARD_ID}`
  : '.features-gen';

const testDir = defineBddConfig({
  paths: features,
  steps,
  outputDir,
  tags: process.env.TEST_TAGS || undefined,
  importTestFrom: './src/fixtures/test-fixtures',
});

// ─── Global Setup / Teardown ─────────────────────────────
const globalSetup = require.resolve('./src/auth/global-setup');
const globalTeardown = require.resolve('./src/auth/global-teardown');

// ─── Playwright Configuration ──────────────────────────────
export default defineConfig({
  testDir,
  globalSetup,
  globalTeardown,

  // DEFAULT MODE (feature): fullyParallel=false
  //   → Each .spec.ts (= 1 feature file) runs on exactly one worker.
  //   → Scenarios inside that file execute sequentially.
  //   → Multiple feature files run in parallel across workers.
  // SCENARIO MODE: fullyParallel=true
  //   → Individual scenarios can be distributed across workers.
  fullyParallel: PARALLEL_MODE === 'scenario',

  workers: process.env.WORKERS ? Number(process.env.WORKERS) : (process.env.CI ? 4 : 2),
  retries: Number(process.env.RETRY_COUNT) || (process.env.CI ? 2 : 1),
  timeout: Number(process.env.TIMEOUT) || 60_000,
  expect: { timeout: TIMEOUTS.assertion },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    cucumberReporter('html', { outputFile: 'reports/cucumber/cucumber-report.html' }),
    cucumberReporter('json', { outputFile: 'reports/cucumber/cucumber-report.json' }),
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://staging-enterprise.dev.legion.work/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    headless: process.env.HEADED !== 'true',
    viewport: { width: 1920, height: 1080 },
    navigationTimeout: TIMEOUTS.navigation,
    actionTimeout: TIMEOUTS.action,
    locale: process.env.LOCALE || 'en-US',
    timezoneId: process.env.TIMEZONE || 'America/New_York',
  },

  projects: TYPE === 'api' ? [
    { name: 'api-tests' },
  ] : [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
