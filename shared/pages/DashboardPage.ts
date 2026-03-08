/**
 * Shared DashboardPage — Single source of truth for common dashboard interactions.
 *
 * Extends the enterprise BasePage and composes:
 *   - NavigationComponent (sidebar nav + sub-tabs)
 *   - LocationSelectorComponent (location search, district, upper fields)
 *
 * All teams should use this (or a thin subclass) instead of duplicating
 * dashboard locators in team-specific page objects.
 *
 * Provided as the `dashboardPage` fixture via test-fixtures.ts.
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../../src/pages/base/BasePage';
import { NavigationComponent } from './components/NavigationComponent';
import { LocationSelectorComponent } from './components/LocationSelectorComponent';

export class DashboardPage extends BasePage {
  /** Sidebar navigation menu items and sub-tabs. */
  readonly navigation: NavigationComponent;

  /** Location search, chooser, district, and upper field operations. */
  readonly locationSelector: LocationSelectorComponent;

  private readonly dashboardHeader: Locator;
  private readonly welcomeMessage: Locator;

  constructor(page: Page) {
    super(page, 'DashboardPage');
    this.navigation = new NavigationComponent(page);
    this.locationSelector = new LocationSelectorComponent(page);
    this.dashboardHeader = page.locator('.header-navigation-label');
    this.welcomeMessage = page.locator('.welcome-message');
  }

  // ─── Core Dashboard Methods ─────────────────────────────────

  async goto(): Promise<void> {
    await this.navigateTo('/dashboard');
  }

  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }

  /**
   * Verify dashboard has fully loaded.
   * Ported from DashboardPageAdapter.verifyDashboardLoaded()
   */
  async verifyDashboardLoaded(): Promise<void> {
    try {
      this.logger.debug('Verifying dashboard loaded...');

      await this.page.waitForURL(/\/(dashboard|console)/, { timeout: 15000 });
      this.logger.debug(`URL confirmed: ${this.page.url()}`);

      const searchIconLocator = this.locationSelector.dashboardSearch.searchIcon().first();

      await Promise.all([
        expect(this.dashboardHeader).toBeVisible({ timeout: 15000 }),
        expect(searchIconLocator).toBeVisible({ timeout: 15000 }),
      ]);

      await this.page.waitForLoadState('domcontentloaded');
      this.logger.info('Dashboard loaded successfully');
    } catch (error) {
      this.logger.error(`Dashboard failed to load: ${error}`);

      await this.page.screenshot({
        path: `logs/dashboard-load-failure-${Date.now()}.png`,
        fullPage: true,
      });

      throw new Error(`Dashboard failed to load: ${error}`);
    }
  }

  /**
   * Search for a specific location from the dashboard search bar and navigate to it.
   * Delegates to LocationSelectorComponent.searchAndNavigateToLocation()
   */
  async searchSpecificLocationAndNavigateTo(locationName: string): Promise<void> {
    await this.locationSelector.searchAndNavigateToLocation(locationName);
  }
}
