/**
 * Authentication Step Definitions
 *
 * Credential resolution via DataService (CucumberTA pattern):
 *
 *   - Loads credentials from test-data/users/user_loc_{ENTERPRISE}_{ENV}.json
 *   - DataService accessed via testContext.dataService (lazy, per-feature instance)
 *   - Group-scoped lookup via @group-<name> feature tags (P2P, MasterTemplate, etc.)
 *   - Ungrouped lookup when no @group tag is present (general tests)
 *   - Simple role map as last-resort fallback (no DataService configured)
 *
 * Feature file usage:
 *
 *   CucumberTA style (preferred for new tests):
 *     Background:
 *       Given I login as "Admin"
 *
 *   Group-scoped style (tag on feature, no extra Background step):
 *     @group-P2PLGTest
 *     Feature: P2P LG Schedule Generation
 *       Background:
 *         Given I am logged in as "InternalAdmin"
 */

import { createBdd } from 'playwright-bdd';
import { test } from '../../src/fixtures/test-fixtures';

const { Given, When, After } = createBdd(test);

// ─── Simple Role Map (Last-Resort Fallback) ──────────────────
//
// Used only when DataService is not available (no ENTERPRISE env var).

const simpleUsers: Record<string, { username: string; password: string }> = {
  admin: { username: 'admin@test.com', password: 'admin123' },
  scheduler: { username: 'scheduler@test.com', password: 'scheduler123' },
};

// ─── Tag-Based Credential Group ─────────────────────────────
//
// Extracts credential group from @group-<name> feature tags.
// Replaces the old "Given the test class is" Background step.
//
// Examples:
//   @group-P2PLGTest             → "P2PLGTest"
//   @group-MasterTemplateP2PTest → "MasterTemplateP2PTest"
//   (no @group tag)              → undefined (ungrouped lookup)

function extractCredentialGroup(tags: string[]): string | undefined {
  const groupTag = tags.find(t => t.startsWith('@group-'));
  return groupTag ? groupTag.slice(7) : undefined;
}

// ─── Login UI Flow ──────────────────────────────────────────

async function performLogin(
  page: import('@playwright/test').Page,
  username: string,
  password: string,
): Promise<void> {
  // Build login URL — append ?enterprise= to bypass the company identifier page
  let loginUrl = process.env.BASE_URL || '/';
  const enterprise = process.env.ENTERPRISE;
  if (enterprise && !loginUrl.includes('?enterprise=')) {
    const separator = loginUrl.includes('?') ? '&' : '?';
    loginUrl = `${loginUrl}${separator}enterprise=${enterprise}`;
  }
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // If already on dashboard (cookies valid from context), skip
  if (page.url().includes('/dashboard') || page.url().includes('/console')) {
    return;
  }

  // Battle-tested login selectors (from LoginPageAdapter)
  const usernameField = page.locator('input[name="username"]')
    .or(page.getByRole('textbox', { name: 'Email or Username' }))
    .or(page.getByPlaceholder(/email|username/i))
    .first();

  const passwordField = page.locator('input[name="password"]')
    .or(page.getByRole('textbox', { name: 'Password' }))
    .or(page.locator('input[type="password"]'))
    .first();

  const signInButton = page.getByTestId('sign-in')
    .or(page.getByRole('button', { name: /sign in|login/i }))
    .first();

  await usernameField.waitFor({ state: 'visible', timeout: 30000 });
  await usernameField.fill(username);
  await passwordField.fill(password);
  await signInButton.click();

  // Handle Terms of Service if shown
  try {
    const tosHeading = page.getByRole('heading', { name: 'Legion Terms of Service' });
    if (await tosHeading.isVisible({ timeout: 5000 })) {
      await page.getByTestId('accept-btn').click();
      await page.waitForLoadState('domcontentloaded');
    }
  } catch {
    // No TOS — continue
  }

  await page.waitForLoadState('domcontentloaded');
}

// ─── Step Definitions ───────────────────────────────────────

/**
 * CucumberTA-style login step (preferred for new tests).
 *
 * Requires ENTERPRISE env var to be set so DataService can load
 * the correct user_loc_{ENTERPRISE}_{ENV}.json file.
 *
 * Usage:
 *   Given I login as "Admin"
 *   Given I login as "StoreManager1"
 */
Given('I login as {string}', async ({ page, testContext }, userType: string) => {
  const currentUrl = page.url();

  // Already on an authenticated page — skip login
  if (currentUrl !== 'about:blank' && currentUrl !== '' && !currentUrl.includes('/login')) {
    return;
  }

  const ds = testContext.dataService;
  if (!ds.hasData()) {
    throw new Error(
      `[Auth] DataService has no data. Set ENTERPRISE env var to use "I login as" step. ` +
      `Available data files: test-data/users/user_loc_{ENTERPRISE}_{ENV}.json`,
    );
  }

  const user = ds.getUILoginUserBy(userType);
  console.log(`[Auth] Logging in as ${userType}: ${user.name}`);

  await performLogin(page, user.name, user.password);

  // Store in testContext for later use
  testContext.setContext('userName', user.name);
  testContext.setContext('userPassword', user.password);
  if (user.locations && user.locations.length > 0) {
    testContext.setContext('locationName', user.locations[0]);
  }
});

/**
 * Idempotent login step — safe to use in Background blocks.
 *
 * Scenarios within a feature share the same BrowserContext and Page.
 * On first run (page at about:blank), performs full UI login.
 * On subsequent runs, detects existing session and skips.
 * After failure recovery, re-authenticates if needed.
 *
 * Credential resolution order:
 *   1. DataService with group (from @group-<name> tag on feature)
 *      → dataService.getUILoginUserByTypeAndGroup(role, group)
 *   2. DataService without group (no @group tag)
 *      → dataService.getUILoginUserBy(role)
 *   3. Simple users map (if DataService has no data)
 */
Given('I am logged in as {string}', async function ({ page, testContext, $tags }, role: string) {
  const currentUrl = page.url();

  // Already on an authenticated page — skip login
  if (currentUrl !== 'about:blank' && currentUrl !== '' && !currentUrl.includes('/login')) {
    return;
  }

  let username: string;
  let password: string;
  let location: string | undefined;

  const credentialGroup = extractCredentialGroup($tags);
  const ds = testContext.dataService;

  if (ds.hasData()) {
    // DataService available — resolve credentials
    if (credentialGroup) {
      // Group-scoped: "InternalAdmin" + "P2PLGTest" → mary+admin8@legion.co
      const user = ds.getUILoginUserByTypeAndGroup(role, credentialGroup);
      console.log(`[Auth] DataService resolved ${role} (group: ${credentialGroup}): ${user.name}`);
      username = user.name;
      password = user.password;
      location = user.locations?.[0];
    } else {
      // Ungrouped: "Admin" → first available Admin user
      try {
        const user = ds.getUILoginUserBy(role);
        console.log(`[Auth] DataService resolved ${role}: ${user.name}`);
        username = user.name;
        password = user.password;
        location = user.locations?.[0];
      } catch {
        // DataService has data but no matching user — fall through to simple map
        console.log(`[Auth] DataService has no user for type "${role}", trying simple map`);
        const user = simpleUsers[role.toLowerCase()];
        if (!user) {
          throw new Error(
            `Unknown role "${role}". No DataService user and not in simple roles: ` +
            `${Object.keys(simpleUsers).join(', ')}.`,
          );
        }
        username = user.username;
        password = user.password;
      }
    }
  } else {
    // No DataService data — use simple role map
    const user = simpleUsers[role.toLowerCase()];
    if (!user) {
      throw new Error(
        `Unknown role "${role}". DataService has no data (set ENTERPRISE env var). ` +
        `Available simple roles: ${Object.keys(simpleUsers).join(', ')}.`,
      );
    }
    username = user.username;
    password = user.password;
  }

  await performLogin(page, username, password);

  if (location) {
    testContext.setContext('locationName', location);
  }
});

/**
 * Logout and login as a different role.
 * Used in multi-user P2P scenarios (e.g., switch from InternalAdmin to StoreManager).
 */
When('I logout and login as {string}', async function ({ page, testContext, $tags }, role: string) {
  // Release current DataService user before switching
  const ds = testContext.dataService;
  ds.releaseLocationAndUsers();

  // Logout
  const logoutButton = page.locator('.fa-sign-out');
  if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutButton.click();
    await logoutButton.click().catch(() => {}); // Double-click pattern from Selenium
    await page.waitForLoadState('domcontentloaded');
  } else {
    const baseUrl = process.env.BASE_URL || '/';
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  }

  // Resolve new credentials (group from @group-<name> tag)
  const credentialGroup = extractCredentialGroup($tags);

  let username: string;
  let password: string;
  let location: string | undefined;

  if (credentialGroup && ds.hasData()) {
    const user = ds.getUILoginUserByTypeAndGroup(role, credentialGroup);
    username = user.name;
    password = user.password;
    location = user.locations?.[0];
  } else if (ds.hasData()) {
    const user = ds.getUILoginUserBy(role);
    username = user.name;
    password = user.password;
    location = user.locations?.[0];
  } else {
    throw new Error(
      `Cannot logout/login as "${role}": DataService has no data. Set ENTERPRISE env var.`,
    );
  }

  // Login with new credentials
  const usernameField = page.locator('input[name="username"]')
    .or(page.getByPlaceholder(/email|username/i))
    .first();
  const passwordField = page.locator('input[type="password"]').first();
  const signInButton = page.getByTestId('sign-in')
    .or(page.getByRole('button', { name: /sign in|login/i }))
    .first();

  await usernameField.waitFor({ state: 'visible', timeout: 30000 });
  await usernameField.fill(username);
  await passwordField.fill(password);
  await signInButton.click();

  // Handle TOS
  try {
    const tosHeading = page.getByRole('heading', { name: 'Legion Terms of Service' });
    if (await tosHeading.isVisible({ timeout: 5000 })) {
      await page.getByTestId('accept-btn').click();
    }
  } catch {
    // No TOS
  }

  await page.waitForLoadState('domcontentloaded');

  if (location) {
    testContext.setContext('locationName', location);
  }
});

// ─── Cleanup Hook ───────────────────────────────────────────

/**
 * After each scenario, release DataService credentials so they
 * can be reused by other workers in parallel execution.
 */
After(async function ({ testContext }) {
  const ds = testContext.dataService;
  ds.releaseLocationAndUsers();
});
