/**
 * LocationSelectorComponent — Shared location search/chooser/district operations.
 *
 * Composable component (NOT a page object). Receives a Page instance and
 * provides locators + methods for all location-related interactions.
 *
 * Consolidates duplicated locators from:
 *   - teams/sch/pages/DashboardPageAdapter.ts (lines 20-37)
 *   - teams/sch/pages/P2PLocationSelectorPage.ts (lines 19-105)
 */

import { Page, Locator } from '@playwright/test';
import { Logger } from '../../../src/utils/Logger';

export class LocationSelectorComponent {
  private readonly logger: Logger;

  constructor(private readonly page: Page) {
    this.logger = new Logger('LocationSelector');
  }

  // ─── Dashboard-Level Location Search ────────────────────────
  // From DashboardPageAdapter: search icon → input → dropdown → options

  readonly dashboardSearch = {
    searchIcon: (): Locator =>
      this.page.locator('img.search-icon').first()
        .or(this.page.locator('#id_upperfield-search').first())
        .or(this.page.locator('[id*="upperfield-search"]').first()),

    searchInput: (): Locator =>
      this.page.locator('input[placeholder*="Search" i]')
        .or(this.page.locator('input[placeholder="Search"]'))
        .or(this.page.locator('input[type="text"][placeholder*="Search" i]'))
        .or(this.page.locator('.lg-search-input input'))
        .or(this.page.locator('#id_upperfield-search input')),

    dropdownList: (): Locator =>
      this.page.locator('.lg-search-options')
        .or(this.page.locator('[class*="search-options"]')),

    options: (): Locator =>
      this.page.locator('div.lg-search-options__option')
        .or(this.page.locator('[class*="search-options__option"]')),
  };

  // ─── Schedule-Level Location Chooser ────────────────────────
  // From P2PLocationSelectorPage: lg-select widget for switching locations

  readonly locationChooser = {
    selectorButton: (): Locator =>
      this.page.locator("lg-select[search-hint='Search Location'] div>input-field div.input-faked")
        .or(this.page.locator('.lg-new-location-chooser__highlight .input-faked')),

    dropdown: (): Locator =>
      this.page.locator('[search-hint="Search Location"] .lg-search-options'),

    options: (): Locator =>
      this.page.locator('div.lg-search-options__option'),

    selectedLocation: (): Locator =>
      this.page.locator('.lg-new-location-chooser__highlight .lg-search-options__option-wrapper--selected'),

    searchInput: (): Locator =>
      this.page.locator('input[placeholder="Search Location"]')
        .or(this.page.locator('input[placeholder="Search"]')),

    detailLocations: (): Locator =>
      this.page.locator('div.lg-location-chooser__highlight div.lg-search-options__option'),

    changeLocationButton: (): Locator =>
      this.page.locator('.lg-new-location-chooser__highlight [placeholder="Select..."] .input-faked'),

    scroller: (): Locator =>
      this.page.locator("lg-search-options[search-hint='Search Location'] div.lg-search-options__scroller"),
  };

  // ─── District Selectors ─────────────────────────────────────

  readonly district = {
    selectorButton: (): Locator =>
      this.page.locator("[search-hint='Search District'] div>input-field div.input-faked"),

    dropdown: (): Locator =>
      this.page.locator('[search-hint="Search District"] div.lg-search-options'),

    options: (): Locator =>
      this.page.locator('[search-hint="Search District"] div.lg-search-options__option'),

    searchInput: (): Locator =>
      this.page.locator('lg-search[placeholder="Search District"] input'),
  };

  // ─── Upper Field Selectors (Business Unit, Region) ──────────

  readonly upperFields = {
    businessUnit: {
      dropdown: (): Locator =>
        this.page.locator('[search-hint="Search Business Unit"] div.lg-search-options'),
      options: (): Locator =>
        this.page.locator('[search-hint="Search Business Unit"] div.lg-search-options__option'),
    },
    region: {
      dropdown: (): Locator =>
        this.page.locator('[search-hint="Search Region"] div.lg-search-options'),
      options: (): Locator =>
        this.page.locator('[search-hint="Search Region"] div.lg-search-options__option'),
    },
  };

  // ─── Misc Locators ──────────────────────────────────────────

  readonly searchIcon = (): Locator => this.page.locator('.lg-search-icon');

  readonly dropdownLists = (): Locator => this.page.locator('.lg-search-options');

  // ─── Dashboard Search Methods ───────────────────────────────

  /**
   * Search for a location from the dashboard search bar and navigate to it.
   * Ported from DashboardPageAdapter.searchSpecificLocationAndNavigateTo()
   */
  async searchAndNavigateToLocation(locationName: string): Promise<void> {
    try {
      this.logger.info(`Searching for location: ${locationName}`);

      // Step 1: Click search icon
      const searchIconLocator = this.dashboardSearch.searchIcon().first();
      try {
        const isVisible = await searchIconLocator.isVisible({ timeout: 5000 });
        if (isVisible) {
          await searchIconLocator.click();
          await this.page.waitForLoadState('domcontentloaded');
        }
      } catch {
        this.logger.debug('Search icon not found, proceeding to search input');
      }

      // Step 2: Wait for search input
      const searchInputLocator = this.dashboardSearch.searchInput().first();
      try {
        await searchInputLocator.waitFor({ state: 'visible', timeout: 10000 });
      } catch {
        await this.page.screenshot({
          path: `logs/search-input-not-found-${Date.now()}.png`,
          fullPage: true,
        });
        throw new Error('Search input field not found after clicking search icon');
      }

      // Step 3: Type in search
      await searchInputLocator.clear();
      await searchInputLocator.fill(locationName);
      await this.page.waitForLoadState('domcontentloaded');

      try {
        await searchInputLocator.press('Enter');
      } catch {
        this.logger.debug('Enter key not needed or failed');
      }

      // Step 4: Wait for search results
      await this.waitForSearchResultsDynamic();

      // Step 5: Select from search results
      const isMatched = await this.selectLocationIfMatched(locationName);
      if (!isMatched) {
        throw new Error(`Location not found: ${locationName}`);
      }

      this.logger.info(`Successfully selected location: ${locationName}`);
      await this.page.waitForLoadState('domcontentloaded');
    } catch (error) {
      this.logger.error(`Failed to select location: ${locationName}`, error as Error);
      await this.page.screenshot({
        path: `logs/location-search-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  }

  /**
   * Select a matching location from the search results dropdown.
   */
  async selectLocationIfMatched(locationName: string): Promise<boolean> {
    try {
      const options = this.dashboardSearch.options();
      const count = await options.count();

      if (count === 0) return false;

      for (let i = 0; i < count; i++) {
        const option = options.nth(i);
        const text = await option.textContent();
        if (text && text.includes(locationName)) {
          this.logger.info(`Match found: "${text.trim()}"`);
          await option.click();
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Wait for search results to load dynamically.
   */
  async waitForSearchResultsDynamic(): Promise<void> {
    try {
      try {
        await this.dashboardSearch.options().first().waitFor({ state: 'visible', timeout: 8000 });
      } catch {
        const dropdownVisible = await this.dashboardSearch.dropdownList().first()
          .isVisible({ timeout: 2000 }).catch(() => false);
        if (!dropdownVisible) {
          throw new Error('Search results dropdown did not appear');
        }
      }

      await this.page.waitForFunction(
        (selector: string) => {
          const options = document.querySelectorAll(selector);
          if (options.length === 0) return false;
          const hasLoading = Array.from(options).some(opt =>
            opt.querySelector('.loading, .spinner') !== null,
          );
          return !hasLoading && options.length > 0;
        },
        'div.lg-search-options__option, [class*="search-options__option"]',
        { timeout: 10000, polling: 'raf' },
      ).catch(() => {
        this.logger.debug('waitForFunction timeout — proceeding anyway');
      });
    } catch {
      this.logger.warn('Search results wait completed with errors — will attempt to proceed');
    }
  }

  // ─── Schedule-Level Location Methods ────────────────────────

  /**
   * Change to a different location using the schedule-level location chooser.
   * Ported from P2PLocationSelectorPage.changeLocation()
   */
  async changeLocation(locationName: string): Promise<void> {
    this.logger.step(`Changing location to: ${locationName}`);

    await this.locationChooser.selectorButton().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.locationChooser.dropdown().waitFor({ state: 'visible', timeout: 10000 });

    const searchInput = this.locationChooser.searchInput();
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 3000 });
      await searchInput.fill(locationName);
      await this.page.waitForLoadState('domcontentloaded');
    } catch {
      // Search input may not be visible in all contexts
    }

    const option = this.locationChooser.options()
      .filter({ hasText: new RegExp(locationName, 'i') });
    await option.first().click();

    await this.page.waitForLoadState('domcontentloaded');
    this.logger.info(`Location changed to: ${locationName}`);
  }

  /**
   * Search for a location using the magnifying glass icon (schedule-level).
   * Ported from P2PLocationSelectorPage.searchAndSelectLocation()
   */
  async searchAndSelectLocation(locationName: string): Promise<void> {
    this.logger.step(`Searching for location: ${locationName}`);

    const icon = this.searchIcon();
    try {
      await icon.waitFor({ state: 'visible', timeout: 3000 });
      await icon.click();
    } catch {
      // Icon may not be present
    }

    const searchInput = this.locationChooser.searchInput();
    await searchInput.fill(locationName);
    await this.page.waitForLoadState('domcontentloaded');

    const option = this.locationChooser.options()
      .filter({ hasText: new RegExp(locationName, 'i') });
    await option.first().click();

    await this.page.waitForLoadState('domcontentloaded');
    this.logger.info(`Selected location: ${locationName}`);
  }

  /**
   * Get the currently selected location name.
   */
  async getCurrentLocation(): Promise<string> {
    const selected = this.locationChooser.selectedLocation();
    try {
      await selected.waitFor({ state: 'visible', timeout: 3000 });
      const text = await selected.textContent();
      return text?.trim() || '';
    } catch {
      const button = this.locationChooser.selectorButton();
      const text = await button.textContent();
      return text?.trim() || '';
    }
  }

  /**
   * Check if a specific location is currently selected.
   */
  async isLocationSelected(locationName: string): Promise<boolean> {
    const current = await this.getCurrentLocation();
    return current.toLowerCase().includes(locationName.toLowerCase());
  }

  /**
   * Get all available locations from the dropdown.
   */
  async getAvailableLocations(): Promise<string[]> {
    await this.locationChooser.selectorButton().click();
    await this.locationChooser.dropdown().waitFor({ state: 'visible', timeout: 10000 });

    const options = this.locationChooser.options();
    const count = await options.count();
    const locations: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text) locations.push(text.trim());
    }

    await this.page.keyboard.press('Escape');
    return locations;
  }

  /**
   * Search locations by partial name.
   */
  async searchLocations(searchText: string): Promise<string[]> {
    await this.locationChooser.selectorButton().click();
    await this.locationChooser.dropdown().waitFor({ state: 'visible', timeout: 10000 });

    await this.locationChooser.searchInput().fill(searchText);
    await this.page.waitForLoadState('domcontentloaded');

    const options = this.locationChooser.options();
    const count = await options.count();
    const results: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text) results.push(text.trim());
    }

    await this.page.keyboard.press('Escape');
    return results;
  }

  // ─── District Methods ───────────────────────────────────────

  /**
   * Change to a different district.
   */
  async changeDistrict(districtName: string): Promise<void> {
    this.logger.step(`Changing district to: ${districtName}`);

    await this.district.selectorButton().click();
    await this.district.dropdown().waitFor({ state: 'visible', timeout: 10000 });

    try {
      const searchInput = this.district.searchInput();
      await searchInput.waitFor({ state: 'visible', timeout: 3000 });
      await searchInput.fill(districtName);
      await this.page.waitForLoadState('domcontentloaded');
    } catch {
      // Search input may not be visible
    }

    const option = this.district.options()
      .filter({ hasText: new RegExp(districtName, 'i') });
    await option.first().click();

    await this.page.waitForLoadState('domcontentloaded');
    this.logger.info(`District changed to: ${districtName}`);
  }

  /**
   * Change to the next available (non-selected) district.
   */
  async changeToAnotherDistrict(): Promise<void> {
    this.logger.step('Changing to another district');

    await this.district.selectorButton().click();
    await this.district.dropdown().waitFor({ state: 'visible', timeout: 10000 });

    const options = this.district.options();
    const count = await options.count();

    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const classes = await option.getAttribute('class') || '';
      if (!classes.includes('selected')) {
        await option.click();
        await this.page.waitForLoadState('domcontentloaded');
        this.logger.info('Changed to another district');
        return;
      }
    }

    this.logger.warn('No other district available to switch to');
    await this.page.keyboard.press('Escape');
  }

  /**
   * Check if currently in DM (District Manager) view.
   */
  async isDMView(): Promise<boolean> {
    try {
      await this.district.selectorButton().waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if currently in SM (Store Manager) view.
   */
  async isSMView(): Promise<boolean> {
    return !(await this.isDMView());
  }

  // ─── Upper Field Methods ────────────────────────────────────

  /**
   * Change upper field (Business Unit or Region) by name.
   */
  async changeUpperField(fieldType: 'Business Unit' | 'Region', fieldName: string): Promise<void> {
    this.logger.step(`Changing ${fieldType} to: ${fieldName}`);

    const group = fieldType === 'Business Unit'
      ? this.upperFields.businessUnit
      : this.upperFields.region;

    await group.dropdown().click();
    await this.page.waitForLoadState('domcontentloaded');

    const option = group.options().filter({ hasText: new RegExp(fieldName, 'i') });
    await option.first().click();

    await this.page.waitForLoadState('domcontentloaded');
    this.logger.info(`${fieldType} changed to: ${fieldName}`);
  }
}
