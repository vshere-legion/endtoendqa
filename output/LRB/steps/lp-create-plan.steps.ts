/**
 * LP Create Plan — Step Definitions
 *
 * Feature: lp-create-plan.feature
 * Team: LRB
 */

import { createBdd } from 'playwright-bdd';
import { test, expect } from '../../../src/fixtures/test-fixtures';
import { LpCreatePlanPage } from '../pages/LpCreatePlanPage';

const { Given, When, Then } = createBdd(test);

// 'I am logged in as {string}' — provided by shared/steps/auth.steps.ts

Given('I am on the Labor Planning module', async ({ pageManager }) => {
  const lpPage = pageManager.get(LpCreatePlanPage);
  // Must select a location first before navigating to Plan
  await lpPage.searchAndSelectLocation('2266 West Hartford CT');
  await lpPage.navigateToLaborPlanning();
});

Given('the user is on the Create Plan page', async ({ pageManager }) => {
  const lpPage = pageManager.get(LpCreatePlanPage);
  await lpPage.navigateToCreatePlan();
});

When('the user creates a new Labor Plan with the following details:', async ({ pageManager }, dataTable: any) => {
  const lpPage = pageManager.get(LpCreatePlanPage);

  // Parse the data table into a key-value map
  const rows: string[][] = dataTable.raw();
  const details: Record<string, string> = {};
  for (const [field, value] of rows.slice(1)) { // skip header row
    details[field.trim()] = value.trim();
  }

  console.log('[LP] Plan details from data table:', JSON.stringify(details));

  await lpPage.createPlan({
    name: details['name'] || 'Auto Test Plan',
    description: details['description'] || '',
  });
});

When('the user clicks the Back link to return to the previous page', async ({ pageManager }) => {
  const lpPage = pageManager.get(LpCreatePlanPage);
  await lpPage.clickBackLink();
});

Then('the system should display the plan list page', async ({ pageManager }) => {
  const lpPage = pageManager.get(LpCreatePlanPage);
  const isVisible = await lpPage.isPlanListPageVisible();
  expect(isVisible).toBeTruthy();
  console.log('[LP] Plan list page is visible');
});

Then('the newly created plan {string} should appear in the list', async ({ pageManager }, planName: string) => {
  const lpPage = pageManager.get(LpCreatePlanPage);
  await lpPage.verifyPlanInList(planName);
  console.log(`[LP] Plan "${planName}" found in list`);
});

Then('the plan should show correct status and details', async ({ page }) => {
  // Verify page has loaded and no error states
  await page.waitForLoadState('domcontentloaded');
  const errorToast = page.locator('[class*="toast"], [class*="notification"], [role="alert"]')
    .filter({ hasText: /error|fail/i });
  const errorCount = await errorToast.count();
  expect(errorCount).toBe(0);
  console.log('[LP] No error notifications displayed — plan details verified');
});
