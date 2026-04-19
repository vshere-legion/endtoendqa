/**
 * LP Create Plan — Page Object
 *
 * Feature: lp-create-plan.feature
 * Team: LRB
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../../src/pages/base/BasePage';

export class LpCreatePlanPage extends BasePage {

  // ─── Locators ──────────────────────────────────────────────

  private readonly loc = {
    // Console navigation
    laborPlanningMenuItem: () =>
      this.page.locator('.console-navigation-item', { hasText: /^Plan$/i })
        .or(this.page.locator('.console-navigation-item', { hasText: /labor\s*plan/i }))
        .or(this.page.getByText('Plan', { exact: true })),

    // Plan list page
    createPlanButton: () =>
      this.page.getByRole('button', { name: /create\s*plan/i })
        .or(this.page.locator('button', { hasText: /create\s*plan/i }))
        .or(this.page.locator('[data-testid="create-plan-btn"]')),

    planListTable: () =>
      this.page.locator('table')
        .or(this.page.locator('.plan-list, .labor-plan-list, [class*="plan-list"]')),

    planRowByName: (name: string) =>
      this.page.locator('tr', { hasText: name })
        .or(this.page.locator('[class*="plan-row"], [class*="plan-item"]', { hasText: name })),

    // Create Labor Budget Plan dialog
    createPlanDialog: () =>
      this.page.locator('[class*="modal"], [role="dialog"]').filter({ hasText: /create labor budget plan/i }),

    planNameInput: () =>
      this.page.locator('input').filter({ hasText: '' }).nth(0)
        .or(this.page.getByPlaceholder(/plan\s*name|budget\s*plan/i))
        .or(this.page.locator('input').first()),

    planDescriptionInput: () =>
      this.page.locator('input').nth(1)
        .or(this.page.getByPlaceholder(/description/i)),

    // Calendar date picker — two month sections inside the dialog
    // Use the month header text as anchor, then find the date cell
    aprilCalendar: () =>
      this.page.locator('text=April 2026').locator('..').locator('..'),

    mayCalendar: () =>
      this.page.locator('text=May 2026').locator('..').locator('..'),

    // Dialog buttons
    okButton: () =>
      this.page.getByRole('button', { name: /^ok$/i })
        .or(this.page.locator('button', { hasText: /^ok$/i })),

    cancelButton: () =>
      this.page.getByRole('button', { name: /cancel/i }),

    closeDialogButton: () =>
      this.page.locator('[class*="close"], button[aria-label="close"]').first(),

    // Back link / breadcrumb on plan detail page
    backLink: () =>
      this.page.getByRole('link', { name: /back/i })
        .or(this.page.locator('a', { hasText: /back/i }))
        .or(this.page.locator('[class*="back"], [class*="breadcrumb"] a').first()),

    // Status & feedback
    successToast: () =>
      this.page.locator('[class*="toast"], [class*="notification"], [role="alert"]')
        .filter({ hasText: /success|created|saved/i }),

    errorToast: () =>
      this.page.locator('[class*="toast"], [class*="notification"], [role="alert"]')
        .filter({ hasText: /error|fail/i }),

    loadingOverlay: () =>
      this.page.locator('[class*="loading"], [class*="spinner"], [class*="overlay"]')
        .or(this.page.getByTestId('loading-spinner')),

    // Page title / header
    pageHeader: () =>
      this.page.locator('h1, h2, [class*="page-title"], [class*="header-title"]').first(),

    // Location search delegated to DashboardPageAdapter
  };

  constructor(page: Page) {
    super(page);
  }

  // ─── Location Selection (Post-Login) ────────────────────────

  async searchAndSelectLocation(locationName: string): Promise<void> {
    console.log(`[LP] Searching for location: ${locationName}`);

    // Wait for dashboard to fully load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);

    // Step 1: Click the search icon — it's the img element right before the "HQ" breadcrumb
    // From the accessibility snapshot: img [ref=e23] inside the breadcrumb bar
    // Try: the img sibling before the HQ text, or the HQ text itself to open location picker
    const breadcrumbArea = this.page.locator('text=HQ').first().locator('..');
    const searchImg = breadcrumbArea.locator('img').first();

    const isSearchImgVisible = await searchImg.isVisible({ timeout: 3000 }).catch(() => false);

    if (isSearchImgVisible) {
      console.log('[LP] Clicking search icon (img before HQ)');
      await searchImg.click();
    } else {
      // Fallback: click the "HQ" text directly
      console.log('[LP] Clicking HQ breadcrumb directly');
      await this.page.locator('text=HQ').first().click();
    }
    await this.page.waitForTimeout(2000);

    // Step 2: Wait for search input to become visible — use force click if hidden
    const searchInput = this.page.locator('input[placeholder*="Search" i]')
      .or(this.page.locator('input[placeholder="Search"]'))
      .or(this.page.locator('.lg-search-input input'))
      .first();

    try {
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Input exists but hidden — try force-clicking the search area to expand it
      console.log('[LP] Search input hidden, trying force interaction');
      await searchInput.click({ force: true });
      await this.page.waitForTimeout(1000);
    }

    // Step 3: Fill the search
    console.log(`[LP] Typing location: ${locationName}`);
    await searchInput.fill(locationName);
    await this.page.waitForTimeout(2000);

    // Step 4: Select from results
    const result = this.page.locator('div.lg-search-options__option, [class*="search-options__option"]')
      .filter({ hasText: new RegExp(locationName, 'i') })
      .first();

    try {
      await result.waitFor({ state: 'visible', timeout: 10000 });
      await result.click();
    } catch {
      // Fallback: press Enter to select first result
      console.log('[LP] No result dropdown, pressing Enter');
      await searchInput.press('Enter');
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    console.log(`[LP] Location "${locationName}" selected`);
  }

  // ─── Navigation ────────────────────────────────────────────

  async navigateToLaborPlanning(): Promise<void> {
    console.log('[LP] Navigating to Labor Planning module');
    await this.page.waitForLoadState('domcontentloaded');

    // Click Plan in the sidebar navigation
    const navItem = this.loc.laborPlanningMenuItem().first();
    await navItem.waitFor({ state: 'visible', timeout: 30000 });
    await navItem.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    console.log('[LP] Labor Planning page loaded');
  }

  async navigateToCreatePlan(): Promise<void> {
    console.log('[LP] Navigating to Create Plan page');
    const createBtn = this.loc.createPlanButton().first();
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    console.log('[LP] Create Plan page loaded');
  }

  // ─── Plan Creation ─────────────────────────────────────────

  async fillPlanName(name: string): Promise<void> {
    console.log(`[LP] Filling plan name: ${name}`);
    // The dialog has "Budget plan name*" label — target input near it
    const dialog = this.loc.createPlanDialog().first();
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    const nameInput = dialog.locator('input').first();
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.clear();
    await nameInput.fill(name);
  }

  async fillPlanDescription(description: string): Promise<void> {
    console.log(`[LP] Filling description: ${description}`);
    const dialog = this.loc.createPlanDialog().first();
    // Description is the second input in the dialog
    const descInput = dialog.locator('input').nth(1);
    await descInput.waitFor({ state: 'visible', timeout: 5000 });
    await descInput.clear();
    await descInput.fill(description);
  }

  async selectDateRange(fromDay: string, toDay: string): Promise<void> {
    console.log(`[LP] Selecting date range: ${fromDay} to ${toDay}`);

    // Click the from date in April calendar
    const aprilSection = this.loc.aprilCalendar();
    const fromDate = aprilSection.locator('td', { hasText: new RegExp(`^${fromDay}$`) }).first();
    await fromDate.waitFor({ state: 'visible', timeout: 10000 });
    await fromDate.click();
    await this.page.waitForTimeout(1000);

    // Click the to date in May calendar
    const maySection = this.loc.mayCalendar();
    const toDate = maySection.locator('td', { hasText: new RegExp(`^${toDay}$`) }).first();
    await toDate.waitFor({ state: 'visible', timeout: 10000 });
    await toDate.click();
    await this.page.waitForTimeout(1000);
    console.log(`[LP] Date range selected: ${fromDay} to ${toDay}`);
  }

  async createPlan(details: { name: string; description: string }): Promise<void> {
    console.log(`[LP] Creating plan: ${details.name}`);
    await this.fillPlanName(details.name);
    await this.fillPlanDescription(details.description);
    // Select date range — from day 20 in left calendar (April) to day 5 in right calendar (May)
    const fromDay = '20';
    const toDay = '5';
    await this.selectDateRange(fromDay, toDay);
    await this.clickOk();
  }

  async clickOk(): Promise<void> {
    console.log('[LP] Clicking OK to save plan');
    const okBtn = this.loc.okButton().first();
    await okBtn.waitFor({ state: 'visible', timeout: 10000 });
    await okBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    console.log('[LP] Plan saved');
  }

  // ─── Navigation Actions ────────────────────────────────────

  async clickBackLink(): Promise<void> {
    console.log('[LP] Clicking Back link');
    const backLink = this.loc.backLink().first();
    await backLink.waitFor({ state: 'visible', timeout: 10000 });
    await backLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    console.log('[LP] Navigated back');
  }

  // ─── Verification ──────────────────────────────────────────

  async isPlanListPageVisible(): Promise<boolean> {
    console.log('[LP] Checking if plan list page is visible');
    try {
      // Look for create button or plan table as indicators
      const createBtn = this.loc.createPlanButton().first();
      await createBtn.waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  async isPlanInList(planName: string): Promise<boolean> {
    console.log(`[LP] Checking if plan "${planName}" exists in list`);
    try {
      const row = this.loc.planRowByName(planName).first();
      await row.waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async verifyPlanInList(planName: string): Promise<void> {
    console.log(`[LP] Verifying plan "${planName}" in list`);
    const row = this.loc.planRowByName(planName).first();
    await expect(row).toBeVisible({ timeout: 15000 });
  }

  async getPageHeaderText(): Promise<string> {
    const header = this.loc.pageHeader();
    return (await header.textContent()) || '';
  }
}
