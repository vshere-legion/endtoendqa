import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

/**
 * DashboardPageAdapter - Ported from source POM framework's DashboardPage.
 * Handles dashboard verification and location search/navigation.
 */
export class DashboardPageAdapter {
  protected page: Page;

  private readonly dashboardHeader: Locator;
  private readonly searchIcon: Locator;
  private readonly locationSearchInput: Locator;
  private readonly locationDropdownList: Locator;
  private readonly locationOptions: Locator;

  constructor(page: Page) {
    this.page = page;

    this.dashboardHeader = page.locator('.header-navigation-label');

    this.searchIcon = page.locator('img.search-icon').first()
      .or(page.locator('#id_upperfield-search').first())
      .or(page.locator('[id*="upperfield-search"]').first());

    this.locationSearchInput = page.locator('input[placeholder*="Search" i]')
      .or(page.locator('input[placeholder="Search"]'))
      .or(page.locator('input[type="text"][placeholder*="Search" i]'))
      .or(page.locator('.lg-search-input input'))
      .or(page.locator('#id_upperfield-search input'))
      .first();

    this.locationDropdownList = page.locator('.lg-search-options')
      .or(page.locator('[class*="search-options"]'));

    this.locationOptions = page.locator('div.lg-search-options__option')
      .or(page.locator('[class*="search-options__option"]'));
  }

  async verifyDashboardLoaded(): Promise<void> {
    try {
      Logger.debug('Verifying dashboard loaded...');

      await this.page.waitForURL(/\/(dashboard|console)/, { timeout: 15000 });
      Logger.debug(`URL confirmed: ${this.page.url()}`);

      const searchIconLocator = this.searchIcon.first();

      await Promise.all([
        expect(this.dashboardHeader).toBeVisible({ timeout: 15000 }),
        expect(searchIconLocator).toBeVisible({ timeout: 15000 }),
      ]);

      await this.page.waitForLoadState('domcontentloaded');
      Logger.pass('Dashboard loaded successfully');
    } catch (error) {
      Logger.error('Dashboard failed to load', error as Error);

      const currentUrl = this.page.url();
      Logger.debug(`Current URL: ${currentUrl}`);

      await this.page.screenshot({
        path: `logs/dashboard-load-failure-${Date.now()}.png`,
        fullPage: true
      });

      throw new Error(`Dashboard failed to load: ${error}`);
    }
  }

  async searchSpecificLocationAndNavigateTo(locationName: string): Promise<void> {
    try {
      Logger.info(`Searching for location: ${locationName}`);
      Logger.debug(`Current URL: ${this.page.url()}`);

      // Step 1: Click search icon
      const searchIconLocator = this.searchIcon.first();
      try {
        Logger.debug('Checking for search icon...');
        const isSearchIconVisible = await searchIconLocator.isVisible({ timeout: 5000 });

        if (isSearchIconVisible) {
          Logger.debug('Search icon found, clicking...');
          await searchIconLocator.click();
          Logger.pass('Search icon clicked');
          await this.page.waitForLoadState('domcontentloaded');
        } else {
          Logger.debug('Search icon not visible, proceeding to search input');
        }
      } catch (error) {
        Logger.debug('Search icon not found or click failed, proceeding to search input');
      }

      // Step 2: Wait for search input
      const searchInputLocator = this.locationSearchInput.first();
      Logger.debug('Waiting for search input field...');

      try {
        await searchInputLocator.waitFor({ state: 'visible', timeout: 10000 });
        Logger.pass('Search input field is visible');
      } catch (error) {
        Logger.error('Search input field not found!', error as Error);
        await this.page.screenshot({
          path: `logs/search-input-not-found-${Date.now()}.png`,
          fullPage: true
        });
        throw new Error(`Search input field not found after clicking search icon`);
      }

      // Step 3: Type in search
      Logger.info(`Typing in search field: "${locationName}"`);
      await searchInputLocator.clear();
      await searchInputLocator.fill(locationName);
      Logger.pass(`Search text entered: ${locationName}`);

      await this.page.waitForLoadState('domcontentloaded');

      try {
        await searchInputLocator.press('Enter');
        Logger.debug('Enter key pressed');
      } catch (error) {
        Logger.debug('Enter key not needed or failed');
      }

      // Step 4: Wait for search results
      Logger.debug('Waiting for search results...');
      await this.waitForSearchResultsDynamic();
      Logger.pass('Search results loaded');

      // Step 5: Select from search results
      Logger.debug('Looking for matching location in results...');
      const isMatched = await this.selectLocationIfMatched(locationName);

      if (!isMatched) {
        Logger.error(`Location "${locationName}" not found in search results`);
        const count = await this.locationOptions.count();
        Logger.debug(`Total options found: ${count}`);
        for (let i = 0; i < Math.min(count, 5); i++) {
          const text = await this.locationOptions.nth(i).textContent();
          Logger.debug(`Option ${i + 1}: "${text?.trim()}"`);
        }
        throw new Error(`Location not found: ${locationName}`);
      }

      Logger.pass(`Successfully selected location: ${locationName}`);
      await this.page.waitForLoadState('domcontentloaded');
      Logger.debug(`Final URL: ${this.page.url()}`);

    } catch (error) {
      Logger.error(`Failed to select location: ${locationName}`, error as Error);
      await this.page.screenshot({
        path: `logs/location-search-failed-${Date.now()}.png`,
        fullPage: true
      });
      throw error;
    }
  }

  private async selectLocationIfMatched(locationName: string): Promise<boolean> {
    try {
      const count = await this.locationOptions.count();

      if (count === 0) {
        Logger.debug('No location options found');
        return false;
      }

      Logger.debug(`Checking ${count} location options...`);

      for (let i = 0; i < count; i++) {
        const option = this.locationOptions.nth(i);
        const text = await option.textContent();

        if (text && text.includes(locationName)) {
          Logger.info(`Match found! "${text.trim()}"`);
          await option.click();
          Logger.pass(`Location clicked: ${locationName}`);
          return true;
        }
      }

      Logger.debug(`Location '${locationName}' not found in ${count} options`);
      return false;

    } catch (error) {
      Logger.error('Error selecting location', error as Error);
      return false;
    }
  }

  private async waitForSearchResultsDynamic(): Promise<void> {
    try {
      Logger.debug('Waiting for search results (dynamic)...');

      try {
        await this.locationOptions.first().waitFor({ state: 'visible', timeout: 8000 });
        Logger.debug('First location option is visible');
      } catch (error) {
        Logger.warn('Location options not found with primary selector');
        const dropdownVisible = await this.locationDropdownList.first().isVisible({ timeout: 2000 }).catch(() => false);
        Logger.debug(`Dropdown visible: ${dropdownVisible}`);

        if (!dropdownVisible) {
          throw new Error('Search results dropdown did not appear');
        }
      }

      await this.page.waitForFunction(
        (selector) => {
          const options = document.querySelectorAll(selector);
          if (options.length === 0) return false;
          const hasLoading = Array.from(options).some(opt =>
            opt.querySelector('.loading, .spinner') !== null
          );
          return !hasLoading && options.length > 0;
        },
        'div.lg-search-options__option, [class*="search-options__option"]',
        { timeout: 10000, polling: 'raf' }
      ).catch(() => {
        Logger.debug('waitForFunction timeout - proceeding anyway');
      });

      Logger.pass('Search results ready');

    } catch (error) {
      Logger.warn('Search results wait completed with errors - will attempt to proceed');
    }
  }
}
