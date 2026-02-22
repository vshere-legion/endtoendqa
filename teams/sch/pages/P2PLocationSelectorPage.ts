/**
 * P2P Location Selector Page Object
 *
 * Encapsulates location switching operations for peer location tests.
 * Handles location dropdown, district selection, DM/SM view switching,
 * and peer location navigation.
 *
 * Real selectors ported from Selenium framework:
 *   - ConsoleLocationSelectorPage.java
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './ScheduleBasePage';
import { Logger } from '../utils/logger';

export class P2PLocationSelectorPage extends BasePage {
  // ─── Locators (real selectors from ConsoleLocationSelectorPage.java) ──

  private readonly locators = {
    // Location selector button
    // Selenium: @FindBy(css = "lg-select[search-hint='Search Location'] div>input-field div.input-faked")
    locationSelectorButton: () =>
      this.page.locator("lg-select[search-hint='Search Location'] div>input-field div.input-faked")
        .or(this.page.locator('.lg-new-location-chooser__highlight .input-faked')),

    // Location dropdown
    // Selenium: @FindBy(css = "[search-hint=\"Search Location\"] .lg-search-options")
    locationDropdown: () =>
      this.page.locator('[search-hint="Search Location"] .lg-search-options'),

    // Available location cards in dropdown
    // Selenium: @FindBy(css = "div.lg-search-options__option")
    locationOptions: () => this.page.locator('div.lg-search-options__option'),

    // Selected location
    // Selenium: @FindBy(css = ".lg-new-location-chooser__highlight .lg-search-options__option-wrapper--selected")
    selectedLocation: () =>
      this.page.locator('.lg-new-location-chooser__highlight .lg-search-options__option-wrapper--selected'),

    // Location search input
    // Selenium: @FindBy(css = "input[placeholder=\"Search Location\"]")
    searchLocationInput: () =>
      this.page.locator('input[placeholder="Search Location"]')
        .or(this.page.locator('input[placeholder="Search"]')),

    // Detail locations (child/peer)
    // Selenium: @FindBy(css = "div.lg-location-chooser__highlight div.lg-search-options__option")
    detailLocations: () =>
      this.page.locator('div.lg-location-chooser__highlight div.lg-search-options__option'),

    // Change location button
    // Selenium: @FindBy(css = ".lg-new-location-chooser__highlight [placeholder=\"Select...\"] .input-faked")
    changeLocationButton: () =>
      this.page.locator('.lg-new-location-chooser__highlight [placeholder="Select..."] .input-faked'),

    // Location items scroller
    // Selenium: @FindBy(css = "lg-search-options[search-hint='Search Location'] div.lg-search-options__scroller")
    locationScroller: () =>
      this.page.locator("lg-search-options[search-hint='Search Location'] div.lg-search-options__scroller"),

    // District selector button
    // Selenium: @FindBy(css = "[search-hint='Search District'] div>input-field div.input-faked")
    districtSelectorButton: () =>
      this.page.locator("[search-hint='Search District'] div>input-field div.input-faked"),

    // District dropdown
    // Selenium: @FindBy(css = "[search-hint=\"Search District\"] div.lg-search-options")
    districtDropdown: () =>
      this.page.locator('[search-hint="Search District"] div.lg-search-options'),

    // District options
    // Selenium: @FindBy(css = "[search-hint=\"Search District\"] div.lg-search-options__option")
    districtOptions: () =>
      this.page.locator('[search-hint="Search District"] div.lg-search-options__option'),

    // District search input
    // Selenium: @FindBy(css = "lg-search[placeholder=\"Search District\"] input")
    searchDistrictInput: () =>
      this.page.locator('lg-search[placeholder="Search District"] input'),

    // Business Unit selectors
    businessUnitDropdown: () =>
      this.page.locator('[search-hint="Search Business Unit"] div.lg-search-options'),
    businessUnitOptions: () =>
      this.page.locator('[search-hint="Search Business Unit"] div.lg-search-options__option'),

    // Region selectors
    regionDropdown: () =>
      this.page.locator('[search-hint="Search Region"] div.lg-search-options'),
    regionOptions: () =>
      this.page.locator('[search-hint="Search Region"] div.lg-search-options__option'),

    // Search icon (magnifying glass)
    // Selenium: @FindBy(css = ".lg-search-icon")
    searchIcon: () => this.page.locator('.lg-search-icon'),

    // Upper field search input
    // Selenium: @FindBy(css = "input[placeholder=\"Search Location\"]") — upper field variant
    upperFieldSearchInput: () =>
      this.page.locator('input[placeholder="Search Location"]'),

    // District and Location dropdown list
    // Selenium: @FindBy(css="[class=\"lg-search-options\"]")
    dropdownLists: () => this.page.locator('.lg-search-options'),
  };

  constructor(page: Page) {
    super(page);
  }

  // ─── Location Operations ──────────────────────────────────

  /**
   * Change to a different location.
   *
   * Port of: ConsoleLocationSelectorPage.changeLocation(String locationName)
   */
  async changeLocation(locationName: string): Promise<void> {
    Logger.step(`Changing location to: ${locationName}`);

    // Click location selector to open dropdown
    await this.click(this.locators.locationSelectorButton());
    await this.page.waitForLoadState('domcontentloaded');

    // Wait for dropdown to appear
    await this.locators.locationDropdown().waitFor({ state: 'visible', timeout: 10000 });

    // Search for the location
    const searchInput = this.locators.searchLocationInput();
    if (await this.isVisible(searchInput, 3000)) {
      await this.fill(searchInput, locationName);
      await this.page.waitForLoadState('domcontentloaded');
    }

    // Click on the matching location option
    const locationOption = this.locators.locationOptions()
      .filter({ hasText: new RegExp(locationName, 'i') });
    await this.click(locationOption.first());

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass(`Location changed to: ${locationName}`);
  }

  /**
   * Search for a specific location using the magnifying glass icon.
   *
   * Port of: findLocationByMagnifyGlassIcon(String locationName)
   */
  async searchAndSelectLocation(locationName: string): Promise<void> {
    Logger.step(`Searching for location: ${locationName}`);

    // Click search icon
    const searchIcon = this.locators.searchIcon();
    if (await this.isVisible(searchIcon, 3000)) {
      await this.click(searchIcon);
    }

    // Type in search
    const searchInput = this.locators.searchLocationInput();
    await this.fill(searchInput, locationName);
    await this.page.waitForLoadState('domcontentloaded');

    // Select matching result
    const option = this.locators.locationOptions()
      .filter({ hasText: new RegExp(locationName, 'i') });
    await this.click(option.first());

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass(`Selected location: ${locationName}`);
  }

  /**
   * Get the currently selected location name.
   *
   * Port of: getCurrentUserLocation()
   */
  async getCurrentLocation(): Promise<string> {
    const selected = this.locators.selectedLocation();
    if (await this.isVisible(selected, 3000)) {
      const text = await this.getText(selected);
      return text.trim();
    }

    // Fallback: get text from location selector button
    const button = this.locators.locationSelectorButton();
    const text = await this.getText(button);
    return text.trim();
  }

  /**
   * Check if a specific location is currently selected.
   *
   * Port of: isLocationSelected(String locationName)
   */
  async isLocationSelected(locationName: string): Promise<boolean> {
    const current = await this.getCurrentLocation();
    return current.toLowerCase().includes(locationName.toLowerCase());
  }

  /**
   * Get all available locations in the dropdown.
   */
  async getAvailableLocations(): Promise<string[]> {
    Logger.step('Getting available locations');

    // Open location dropdown
    await this.click(this.locators.locationSelectorButton());
    await this.locators.locationDropdown().waitFor({ state: 'visible', timeout: 10000 });

    // Collect location names
    const options = this.locators.locationOptions();
    const count = await options.count();
    const locations: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text) locations.push(text.trim());
    }

    // Close dropdown by pressing Escape
    await this.page.keyboard.press('Escape');

    Logger.pass(`Found ${locations.length} available location(s)`);
    return locations;
  }

  /**
   * Search for locations by partial name.
   *
   * Port of: searchLocation(String searchInputText)
   */
  async searchLocations(searchText: string): Promise<string[]> {
    Logger.step(`Searching locations: ${searchText}`);

    await this.click(this.locators.locationSelectorButton());
    await this.locators.locationDropdown().waitFor({ state: 'visible', timeout: 10000 });

    const searchInput = this.locators.searchLocationInput();
    await this.fill(searchInput, searchText);
    await this.page.waitForLoadState('domcontentloaded');

    const options = this.locators.locationOptions();
    const count = await options.count();
    const results: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text) results.push(text.trim());
    }

    await this.page.keyboard.press('Escape');

    Logger.pass(`Found ${results.length} location(s) matching "${searchText}"`);
    return results;
  }

  // ─── District Operations ──────────────────────────────────

  /**
   * Change to a different district.
   *
   * Port of: ConsoleLocationSelectorPage.changeDistrict(String districtName)
   */
  async changeDistrict(districtName: string): Promise<void> {
    Logger.step(`Changing district to: ${districtName}`);

    await this.click(this.locators.districtSelectorButton());
    await this.locators.districtDropdown().waitFor({ state: 'visible', timeout: 10000 });

    // Search for district
    const searchInput = this.locators.searchDistrictInput();
    if (await this.isVisible(searchInput, 3000)) {
      await this.fill(searchInput, districtName);
      await this.page.waitForLoadState('domcontentloaded');
    }

    // Select district
    const districtOption = this.locators.districtOptions()
      .filter({ hasText: new RegExp(districtName, 'i') });
    await this.click(districtOption.first());

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass(`District changed to: ${districtName}`);
  }

  /**
   * Change to a different district (next available).
   *
   * Port of: changeAnotherDistrict()
   */
  async changeToAnotherDistrict(): Promise<void> {
    Logger.step('Changing to another district');

    await this.click(this.locators.districtSelectorButton());
    await this.locators.districtDropdown().waitFor({ state: 'visible', timeout: 10000 });

    // Click the first non-selected district
    const options = this.locators.districtOptions();
    const count = await options.count();

    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const classes = await option.getAttribute('class') || '';
      if (!classes.includes('selected')) {
        await this.click(option);
        await this.page.waitForLoadState('domcontentloaded');
        Logger.pass('Changed to another district');
        return;
      }
    }

    Logger.warn('No other district available to switch to');
    await this.page.keyboard.press('Escape');
  }

  // ─── View Mode Detection ──────────────────────────────────

  /**
   * Check if currently in DM (District Manager) view.
   *
   * Port of: ConsoleLocationSelectorPage.isDMView()
   */
  async isDMView(): Promise<boolean> {
    const districtBtn = this.locators.districtSelectorButton();
    return this.isVisible(districtBtn, 3000);
  }

  /**
   * Check if currently in SM (Store Manager) view.
   *
   * Port of: ConsoleLocationSelectorPage.isSMView()
   */
  async isSMView(): Promise<boolean> {
    const isDM = await this.isDMView();
    return !isDM;
  }

  // ─── Upper Field Navigation ───────────────────────────────

  /**
   * Change upper fields (Business Unit, Region) by name.
   *
   * Port of: changeUpperFieldsByName(String upperFieldType, String upperFieldName)
   */
  async changeUpperField(fieldType: 'Business Unit' | 'Region', fieldName: string): Promise<void> {
    Logger.step(`Changing ${fieldType} to: ${fieldName}`);

    let dropdown: Locator;
    let options: Locator;

    if (fieldType === 'Business Unit') {
      dropdown = this.locators.businessUnitDropdown();
      options = this.locators.businessUnitOptions();
    } else {
      dropdown = this.locators.regionDropdown();
      options = this.locators.regionOptions();
    }

    // Open dropdown
    await this.click(dropdown);
    await this.page.waitForLoadState('domcontentloaded');

    // Select matching option
    const option = options.filter({ hasText: new RegExp(fieldName, 'i') });
    await this.click(option.first());

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass(`${fieldType} changed to: ${fieldName}`);
  }
}
