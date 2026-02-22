/**
 * P2P Permission Management Steps
 *
 * Covers: OPS Portal navigation, user permission toggling,
 * budget access control, and role-based visibility.
 *
 * Used by features:
 *   - p2p-permissions.feature
 *   - p2p-budget.feature
 */

import { createBdd } from 'playwright-bdd';
import { test, expect } from '../../../src/fixtures/test-fixtures';
import { P2PLocationSelectorPage } from '../pages/P2PLocationSelectorPage';
import { Logger } from '../utils/logger';

const { Given, When, Then } = createBdd(test);

// ─── OPS Portal Navigation ──────────────────────────────────

Given('I navigate to OPS Portal', async ({ page }) => {
  // TODO: Navigate to OPS Portal from Console
});

When('I go to User Management then Users and Roles', async ({ page }) => {
  // TODO: Navigate to User Management > Users and Roles
});

When('I navigate to Access By Job Titles', async ({ page }) => {
  // TODO: Navigate to Access By Job Titles tab
});

When('I switch back to Console', async ({ page }) => {
  // TODO: Switch from OPS Portal back to Console
});

// ─── Permission Toggle Steps ─────────────────────────────────

When('I disable {string} permission for SM', async ({ page }, permission: string) => {
  // TODO: Find and toggle off the named permission for Store Manager role
});

When('I enable {string} permission for SM', async ({ page }, permission: string) => {
  // TODO: Find and toggle on the named permission for Store Manager role
});

Then('the permission should be re-enabled successfully', async ({ page }) => {
  // TODO: Verify permission re-enabled
});

// ─── Visibility Verification Steps ───────────────────────────

Then('the edit operating hours buttons should not be visible', async ({ page }) => {
  // TODO: Verify operating hours edit buttons are hidden
});

Then('the Budget Hours smart card should not be visible', async ({ page }) => {
  // TODO: Verify budget hours smart card is hidden
});

Then('the Budget Hours smart card should be visible', async ({ page }) => {
  // TODO: Verify budget hours smart card is visible
});

Then('the {string} button should not be visible', async ({ page }, buttonName: string) => {
  // TODO: Verify named button is hidden
});

Then('the {string} smart card should not be visible', async ({ page }, cardName: string) => {
  // TODO: Verify named smart card is hidden
});

// ─── Budget Access Control Steps ─────────────────────────────

Given('I am on the parent location schedule view', async ({ page }) => {
  // TODO: Navigate to parent location view
});

Then('the budget edit button should be disabled', async ({ page }) => {
  // TODO: Verify budget edit button is disabled
});

When('I navigate to a child location', async ({ pageManager, testContext }) => {
  const locationPage = pageManager.get(P2PLocationSelectorPage);
  const ds = testContext.dataService;
  const parentLocation = testContext.getContext<string>('locationName') || '';

  const allLocations = ds.getAllLocations();
  const parentLocData = allLocations.find(l => l.name === parentLocation);
  const groupConf = parentLocData?.conf;

  if (groupConf) {
    const childLocations = allLocations.filter(l => l.conf === groupConf && l.name !== parentLocation);
    if (childLocations.length > 0) {
      const childLocation = childLocations[0].name;
      Logger.step(`Navigating to a child location: ${childLocation}`);
      await locationPage.changeLocation(childLocation);
      testContext.setContext('childLocationName', childLocation);
      return;
    }
  }

  throw new Error('No child location available to navigate to');
});

Then('the budget edit button should be enabled', async ({ page }) => {
  // TODO: Verify budget edit button is enabled
});

// ─── Budget Display Steps ────────────────────────────────────

Given('daily budget configuration is enabled', async ({ page }) => {
  // TODO: Verify or enable daily budget config
});

Given('weekly budget configuration is enabled', async ({ page }) => {
  // TODO: Verify or enable weekly budget config
});

Given('weekly budget configuration is enabled with display option', async ({ page }) => {
  // TODO: Verify or enable weekly budget with display option
});

When('I navigate to the child location', async ({ pageManager, testContext }) => {
  const locationPage = pageManager.get(P2PLocationSelectorPage);
  const ds = testContext.dataService;
  const parentLocation = testContext.getContext<string>('locationName') || '';

  // Find the parent location's config group, then find a peer/child in the same group
  const allLocations = ds.getAllLocations();
  const parentLocData = allLocations.find(l => l.name === parentLocation);
  const groupConf = parentLocData?.conf;

  if (groupConf) {
    const childLocations = allLocations.filter(l => l.conf === groupConf && l.name !== parentLocation);
    if (childLocations.length > 0) {
      const childLocation = childLocations[0].name;
      Logger.step(`Navigating to child location: ${childLocation}`);
      await locationPage.changeLocation(childLocation);
      testContext.setContext('childLocationName', childLocation);
      return;
    }
  }

  // Fallback: pick the first available location from the dropdown that isn't the parent
  Logger.step('No child location in test data — selecting first available from dropdown');
  const available = await locationPage.getAvailableLocations();
  const child = available.find(loc => !loc.includes(parentLocation));
  if (child) {
    await locationPage.changeLocation(child);
    testContext.setContext('childLocationName', child);
  } else {
    throw new Error('No child location available to navigate to');
  }
});

When('I navigate to the parent location', async ({ pageManager, testContext }) => {
  const locationPage = pageManager.get(P2PLocationSelectorPage);
  const parentLocation = testContext.getContext<string>('locationName') || '';
  if (!parentLocation) {
    throw new Error('No parent location name stored in testContext');
  }
  Logger.step(`Navigating to parent location: ${parentLocation}`);
  await locationPage.changeLocation(parentLocation);
});

Then('the daily budget values should display correctly on:', async ({ page }, dataTable: any) => {
  // TODO: Verify daily budget across pages from dataTable
});

Then('the budget values should match the configured amounts', async ({ page }) => {
  // TODO: Verify budget amounts
});

Then('the weekly budget values should display correctly on:', async ({ page }, dataTable: any) => {
  // TODO: Verify weekly budget across pages from dataTable
});

Then('the weekly budget values should match the configured amounts', async ({ page }) => {
  // TODO: Verify weekly budget amounts
});

Then('the budget section should be visible but read-only', async ({ page }) => {
  // TODO: Verify read-only budget
});

Then('the edit budget button should not be available at the parent level', async ({ page }) => {
  // TODO: Verify no edit button at parent
});

Then('the edit budget button should be available', async ({ page }) => {
  // TODO: Verify edit button available
});

When('I attempt to access the budget edit page', async ({ page }) => {
  // TODO: Attempt to access budget edit
});

Then('the edit budget page should not be accessible at the parent level', async ({ page }) => {
  // TODO: Verify no access at parent
});

Then('I should remain on the current view', async ({ page }) => {
  // TODO: Verify no navigation occurred
});

// ─── Budget Template Steps ───────────────────────────────────

When('I navigate to the master template for the child location', async ({ page }) => {
  // TODO: Navigate to master template
});

Then('the daily budget values should be visible in the template', async ({ page }) => {
  // TODO: Verify daily budget in template
});

Then('the daily budget values should match the template values', async ({ page }) => {
  // TODO: Verify daily budget match
});

Then('the budget and schedule data should be consistent', async ({ page }) => {
  // TODO: Verify consistency
});

Then('the weekly budget values should be visible in the template', async ({ page }) => {
  // TODO: Verify weekly budget in template
});

Then('the weekly budget values should match the template values', async ({ page }) => {
  // TODO: Verify weekly budget match
});

// ─── Budget Column Steps ─────────────────────────────────────

Given('I create P2P schedules at the parent location', async ({ page }) => {
  // TODO: Create schedules at parent
});

When('I view the budget and guidance columns', async ({ page }) => {
  // TODO: View budget columns
});

Then('the columns should display correctly at the parent level', async ({ page }) => {
  // TODO: Verify columns at parent
});

When('I navigate to a peer child location', async ({ page }) => {
  // TODO: Navigate to peer child
});

Then('the budget and guidance columns should still display correctly', async ({ page }) => {
  // TODO: Verify columns at child
});

Then('the values should update if the child location has a different budget', async ({ page }) => {
  // TODO: Verify budget value update
});
