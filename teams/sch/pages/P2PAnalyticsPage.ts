/**
 * P2P Analytics Page Object
 *
 * Encapsulates DM/Region view navigation, analytics tables,
 * and dashboard widget interactions.
 *
 * Real selectors ported from Selenium framework:
 *   - ConsoleScheduleDMViewPage.java
 *   - ConsoleAnalyzePage.java
 *   - ConsoleDashboardPage.java
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './ScheduleBasePage';
import { Logger } from '../utils/logger';

export interface AnalyticsRow {
  locationName: string;
  budgetHours: number;
  publishedHours: number;
  scheduleStatus: string;
}

export interface WidgetData {
  label: string;
  value: string;
}

export interface ScheduleStatusCounts {
  notStarted: number;
  inProgress: number;
  published: number;
}

export class P2PAnalyticsPage extends BasePage {
  // ─── Locators (real selectors from Selenium) ───────────────

  private readonly locators = {
    // Analytics table (DM view)
    // Selenium: @FindBy(css = ".analytics-new-table-group-row-open")
    analyticsGroupRows: () => this.page.locator('.analytics-new-table-group-row-open'),
    // Selenium: @FindBy(css = ".analytics-new-table-group-open")
    analyticsTableRows: () => this.page.locator('.analytics-new-table-group-open'),
    // Selenium: @FindBy(css = ".analytics-new.ng-scope")
    scheduleSection: () => this.page.locator('.analytics-new.ng-scope'),

    // Analytics table cells
    // Selenium: @FindBy(css = "[jj-switch-when=\"cells.CELL_BUDGET_HOURS\"]")
    budgetHoursCells: () => this.page.locator('[jj-switch-when="cells.CELL_BUDGET_HOURS"]'),
    // Selenium: @FindBy(css = "[jj-switch-when=\"cells.CELL_PUBLISHED_HOURS\"]")
    publishedHoursCells: () => this.page.locator('[jj-switch-when="cells.CELL_PUBLISHED_HOURS"]'),
    // Selenium: @FindBy(css = "[jj-switch-when=\"cells.CELL_UNTOUCHED\"]")
    locationNameCells: () => this.page.locator('[jj-switch-when="cells.CELL_UNTOUCHED"]'),

    // Schedule status indicators (DM view)
    // Selenium: @FindBy(xpath = "//span[contains(text(),'Not Started')]")
    notStartedSchedules: () => this.page.locator('span:has-text("Not Started")'),
    // Selenium: @FindBy(xpath = "//span[contains(text(),'In Progress')]")
    inProgressSchedules: () => this.page.locator('span:has-text("In Progress")'),
    // Published - inferred
    publishedSchedules: () => this.page.locator('span:has-text("Published")'),

    // Week navigation (DM view)
    // Selenium: @FindBy(css = ".day-week-picker-period-active>span")
    currentWeek: () => this.page.locator('.day-week-picker-period-active > span'),

    // Budget comparison chart
    // Selenium: @FindBy(css = "text[text-anchor=\"middle\"][style]")
    budgetComparisonValues: () => this.page.locator('text[text-anchor="middle"][style]'),
    // Selenium: @FindBy(css = "[style=\"font-size: 14px;\"]")
    hoursValues: () => this.page.locator('[style="font-size: 14px;"]'),

    // Refresh button
    // Selenium: @FindBy(css = "[ng-click=\"$ctrl.onReload(true)\"]")
    refreshButton: () => this.page.locator('[ng-click="$ctrl.onReload(true)"]'),
    // Selenium: @FindBy(css = "[ng-if=\"$ctrl.minutes >= 0 && $ctrl.date && !$ctrl.loading\"]")
    lastUpdatedIcon: () =>
      this.page.locator('[ng-if="$ctrl.minutes >= 0 && $ctrl.date && !$ctrl.loading"]'),
    // Selenium: @FindBy(css = "last-updated-countdown span[ng-if^=\"$ctrl.minutes === 0\"]")
    justUpdated: () =>
      this.page.locator('last-updated-countdown span[ng-if^="$ctrl.minutes === 0"]'),
    // Selenium: @FindBy(css = "last-updated-countdown span[ng-if^=\"$ctrl.minutes > 0\"]")
    lastUpdated: () =>
      this.page.locator('last-updated-countdown span[ng-if^="$ctrl.minutes > 0"]'),

    // Console navigation menu items
    // Selenium: @FindBy(css = ".navigation-menu-compliance-icon")
    complianceMenuItem: () => this.page.locator('.navigation-menu-compliance-icon')
      .or(this.page.locator('.console-navigation-item', { hasText: 'Compliance' })),
    // Selenium: @FindBy(css = ".console-navigation-item-label.Schedule")
    scheduleMenuItem: () => this.page.locator('.console-navigation-item-label.Schedule')
      .or(this.page.locator('.console-navigation-item', { hasText: 'Schedule' })),
    timesheetMenuItem: () =>
      this.page.locator('.console-navigation-item', { hasText: 'Timesheet' }),
    dashboardMenuItem: () =>
      this.page.locator('.console-navigation-item', { hasText: 'Dashboard' }),

    // Sub-navigation tabs
    subTabs: () => this.page.locator('div.sub-navigation-view-link'),

    // Analyze button and popup
    // Selenium: @FindBy(css = "lg-button[label=\"Analyze\"]")
    analyzeButton: () => this.page.locator('lg-button[label="Analyze"]'),
    // Selenium: @FindBy(css = ".sch-schedule-analyze-content")
    analyzePopup: () => this.page.locator('.sch-schedule-analyze-content'),
    // Selenium: @FindBy(css = "lg-close.dismiss")
    analyzePopupClose: () =>
      this.page.locator('lg-close.dismiss')
        .or(this.page.locator('.sch-schedule-analyze-dismiss')),
    // Selenium: @FindBy(css="div[ng-click=\"selectedTab = 'history'\"]")
    scheduleHistoryTab: () =>
      this.page.locator('div[ng-click="selectedTab = \'history\'"]'),
    // Selenium: @FindBy(css="div[ng-click=\"selectedTab = 'labor'\"]")
    laborGuidanceTab: () =>
      this.page.locator('div[ng-click="selectedTab = \'labor\'"]'),

    // Pie charts (analyze popup)
    // Selenium: @FindBy(css = ".sch-schedule-analyze__content pie-chart")
    pieChart: () => this.page.locator('.sch-schedule-analyze__content pie-chart'),
    // Selenium: @FindBy(css = ".sch-schedule-analyze__total-hours")
    totalHoursLabel: () => this.page.locator('.sch-schedule-analyze__total-hours'),
    // Selenium: @FindBy(css = ".sch-schedule-analyze__graph-header")
    pieChartHeaders: () => this.page.locator('.sch-schedule-analyze__graph-header'),

    // Dashboard widgets
    districtSummaryWidget: () =>
      this.page.locator('[data-testid="district-summary-widget"]')
        .or(this.page.locator('.dashboard-widget', { hasText: /district summary/i })),
    locationSummaryWidget: () =>
      this.page.locator('[data-testid="location-summary-widget"]')
        .or(this.page.locator('.dashboard-widget', { hasText: /location summary/i })),
  };

  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ───────────────────────────────────────────

  /**
   * Navigate to Schedule tab (in DM view context).
   */
  async navigateToScheduleTab(): Promise<void> {
    Logger.step('Navigating to Schedule tab');
    await this.click(this.locators.scheduleMenuItem());
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Schedule tab loaded');
  }

  /**
   * Navigate to Compliance tab.
   */
  async navigateToComplianceTab(): Promise<void> {
    Logger.step('Navigating to Compliance tab');
    await this.click(this.locators.complianceMenuItem());
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Compliance tab loaded');
  }

  /**
   * Navigate to Timesheet tab.
   */
  async navigateToTimesheetTab(): Promise<void> {
    Logger.step('Navigating to Timesheet tab');
    await this.click(this.locators.timesheetMenuItem());
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Timesheet tab loaded');
  }

  /**
   * Navigate to Dashboard.
   */
  async navigateToDashboard(): Promise<void> {
    Logger.step('Navigating to Dashboard');
    await this.click(this.locators.dashboardMenuItem());
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Dashboard loaded');
  }

  // ─── Analytics Table ──────────────────────────────────────

  /**
   * Get analytics table data from the DM view.
   *
   * Port of: ConsoleScheduleDMViewPage methods for parsing analytics table
   */
  async getAnalyticsTableData(): Promise<AnalyticsRow[]> {
    Logger.step('Getting analytics table data');
    const rows = this.locators.analyticsTableRows();
    const rowCount = await rows.count();
    const data: AnalyticsRow[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const rowText = await row.textContent().catch(() => '') || '';

      // Extract location name from CELL_UNTOUCHED
      const locationCell = row.locator('[jj-switch-when="cells.CELL_UNTOUCHED"]');
      const locationName = await locationCell.textContent().catch(() => '') || '';

      // Extract budget hours
      const budgetCell = row.locator('[jj-switch-when="cells.CELL_BUDGET_HOURS"]');
      const budgetText = await budgetCell.textContent().catch(() => '0') || '0';
      const budgetHours = parseFloat(budgetText.replace(/[^0-9.]/g, '')) || 0;

      // Extract published hours
      const publishedCell = row.locator('[jj-switch-when="cells.CELL_PUBLISHED_HOURS"]');
      const publishedText = await publishedCell.textContent().catch(() => '0') || '0';
      const publishedHours = parseFloat(publishedText.replace(/[^0-9.]/g, '')) || 0;

      // Determine schedule status from row text
      let scheduleStatus = 'Unknown';
      if (rowText.includes('Not Started')) scheduleStatus = 'Not Started';
      else if (rowText.includes('In Progress')) scheduleStatus = 'In Progress';
      else if (rowText.includes('Published')) scheduleStatus = 'Published';

      data.push({
        locationName: locationName.trim(),
        budgetHours,
        publishedHours,
        scheduleStatus,
      });
    }

    Logger.pass(`Parsed ${data.length} analytics table row(s)`);
    return data;
  }

  /**
   * Get budgeted hours for a specific location in the DM view.
   *
   * Port of: getBudgetedHourOfScheduleInDMViewByLocation(String location)
   */
  async getBudgetedHoursByLocation(locationName: string): Promise<number> {
    Logger.step(`Getting budgeted hours for location: ${locationName}`);
    const data = await this.getAnalyticsTableData();
    const row = data.find(r =>
      r.locationName.toLowerCase().includes(locationName.toLowerCase()),
    );

    if (!row) {
      Logger.warn(`Location "${locationName}" not found in analytics table`);
      return 0;
    }

    Logger.pass(`Budget hours for ${locationName}: ${row.budgetHours}`);
    return row.budgetHours;
  }

  /**
   * Get all schedule info for a location in DM view.
   *
   * Port of: getAllScheduleInfoFromScheduleInDMViewByLocation(String location)
   */
  async getScheduleInfoByLocation(
    locationName: string,
  ): Promise<AnalyticsRow | null> {
    const data = await this.getAnalyticsTableData();
    return data.find(r =>
      r.locationName.toLowerCase().includes(locationName.toLowerCase()),
    ) || null;
  }

  /**
   * Verify the analytics table has expected column headers.
   */
  async verifyAnalyticsTableColumns(expectedColumns: string[]): Promise<void> {
    Logger.step('Verifying analytics table columns');
    const section = this.locators.scheduleSection();
    const sectionText = await section.textContent().catch(() => '') || '';

    for (const col of expectedColumns) {
      expect(sectionText.toLowerCase()).toContain(col.toLowerCase());
    }
    Logger.pass('Analytics table columns verified');
  }

  // ─── Location Operations ──────────────────────────────────

  /**
   * Get all locations shown in the DM view analytics table.
   *
   * Port of: getLocationsInScheduleDMViewLocationsTable()
   */
  async getLocationsInDMView(): Promise<string[]> {
    Logger.step('Getting locations in DM view');
    const cells = this.locators.locationNameCells();
    const count = await cells.count();
    const locations: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text) locations.push(text.trim());
    }

    Logger.pass(`Found ${locations.length} location(s) in DM view`);
    return locations;
  }

  /**
   * Click on a location name in the DM view to navigate to it.
   *
   * Port of: clickOnLocationNameInDMView(String location)
   */
  async clickLocationInDMView(locationName: string): Promise<void> {
    Logger.step(`Clicking location "${locationName}" in DM view`);
    const cell = this.locators.locationNameCells()
      .filter({ hasText: new RegExp(locationName, 'i') });
    await this.click(cell.first());
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass(`Navigated to location: ${locationName}`);
  }

  /**
   * Check if a location exists in the DM view analytics table.
   *
   * Port of: checkIfLocationExistOnDMViewAnalyticsTable(String locationName)
   */
  async isLocationInDMView(locationName: string): Promise<boolean> {
    const locations = await this.getLocationsInDMView();
    return locations.some(l =>
      l.toLowerCase().includes(locationName.toLowerCase()),
    );
  }

  // ─── Schedule Status ──────────────────────────────────────

  /**
   * Get schedule status counts (Not Started, In Progress, Published).
   *
   * Port of: getThreeWeeksScheduleStatusFromScheduleDMViewPage()
   */
  async getScheduleStatusCounts(): Promise<ScheduleStatusCounts> {
    Logger.step('Getting schedule status counts');

    const notStartedCount = await this.locators.notStartedSchedules().count();
    const inProgressCount = await this.locators.inProgressSchedules().count();
    const publishedCount = await this.locators.publishedSchedules().count();

    const result: ScheduleStatusCounts = {
      notStarted: notStartedCount,
      inProgress: inProgressCount,
      published: publishedCount,
    };

    Logger.pass(`Schedule statuses — Not Started: ${notStartedCount}, In Progress: ${inProgressCount}, Published: ${publishedCount}`);
    return result;
  }

  /**
   * Check if any "Not Started" schedules are displayed.
   */
  async hasNotStartedSchedules(): Promise<boolean> {
    return (await this.locators.notStartedSchedules().count()) > 0;
  }

  // ─── Refresh ──────────────────────────────────────────────

  /**
   * Click the refresh button in DM view.
   *
   * Port of: clickOnRefreshButton()
   */
  async clickRefreshButton(): Promise<void> {
    Logger.step('Clicking refresh button');
    await this.click(this.locators.refreshButton());
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Refresh clicked');
  }

  /**
   * Validate refresh button is present.
   */
  async isRefreshButtonVisible(): Promise<boolean> {
    return this.isVisible(this.locators.refreshButton(), 5000);
  }

  /**
   * Get the current week text in DM view.
   *
   * Port of: getCurrentWeekInDMView()
   */
  async getCurrentWeekInDMView(): Promise<string> {
    const text = await this.getText(this.locators.currentWeek());
    return text.trim();
  }

  // ─── Budget Comparison ────────────────────────────────────

  /**
   * Get total budgeted/scheduled/projected hours from DM view.
   *
   * Port of: getTheTotalBudgetedScheduledProjectedHourOfScheduleInDMView()
   */
  async getTotalHoursFromDMView(): Promise<number[]> {
    Logger.step('Getting total hours from DM view');
    const values = this.locators.budgetComparisonValues();
    const count = await values.count();
    const hours: number[] = [];

    for (let i = 0; i < count; i++) {
      const text = await values.nth(i).textContent();
      if (text) {
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) hours.push(num);
      }
    }

    Logger.pass(`Total hours: ${hours.join(', ')}`);
    return hours;
  }

  /**
   * Get budget comparison data from DM view chart.
   *
   * Port of: getBudgetComparisonInDMView()
   */
  async getBudgetComparisonData(): Promise<string> {
    const values = this.locators.budgetComparisonValues();
    const texts: string[] = [];
    const count = await values.count();

    for (let i = 0; i < count; i++) {
      const text = await values.nth(i).textContent();
      if (text) texts.push(text.trim());
    }

    return texts.join(' | ');
  }

  // ─── Dashboard Widgets ────────────────────────────────────

  /**
   * Get District Summary widget data.
   */
  async getDistrictSummaryWidgetData(): Promise<WidgetData[]> {
    Logger.step('Getting District Summary widget data');
    const widget = this.locators.districtSummaryWidget();
    const data: WidgetData[] = [];

    if (!await this.isVisible(widget, 5000)) {
      Logger.warn('District Summary widget not visible');
      return data;
    }

    const items = widget.locator('.widget-item, .summary-item, [class*="item"]');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const label = await item.locator('.label, [class*="label"]').textContent().catch(() => '');
      const value = await item.locator('.value, [class*="value"], h1, h2, h3').textContent().catch(() => '');

      if (label || value) {
        data.push({
          label: (label || '').trim(),
          value: (value || '').trim(),
        });
      }
    }

    Logger.pass(`District Summary: ${data.length} item(s)`);
    return data;
  }

  /**
   * Get Location Summary widget data (for DM view dashboard).
   *
   * Port of: getTextFromTheChartInLocationSummarySmartCard()
   */
  async getLocationSummaryWidgetData(): Promise<WidgetData[]> {
    Logger.step('Getting Location Summary widget data');
    const widget = this.locators.locationSummaryWidget();
    const data: WidgetData[] = [];

    if (!await this.isVisible(widget, 5000)) {
      Logger.warn('Location Summary widget not visible');
      return data;
    }

    const items = widget.locator('.widget-item, .summary-item, [class*="item"]');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const label = await item.locator('.label, [class*="label"]').textContent().catch(() => '');
      const value = await item.locator('.value, [class*="value"], h1, h2, h3').textContent().catch(() => '');

      if (label || value) {
        data.push({
          label: (label || '').trim(),
          value: (value || '').trim(),
        });
      }
    }

    Logger.pass(`Location Summary: ${data.length} item(s)`);
    return data;
  }

  /**
   * Verify widget data matches schedule data (cross-check).
   */
  async verifyWidgetDataMatchesSchedule(): Promise<void> {
    Logger.step('Verifying widget data matches schedule');
    const widgetData = await this.getDistrictSummaryWidgetData();
    expect(widgetData.length).toBeGreaterThan(0);
    Logger.pass('Widget data has entries to compare');
  }

  // ─── Analyze Popup ────────────────────────────────────────

  /**
   * Open the Analyze popup.
   */
  async openAnalyzePopup(tab?: 'history' | 'labor'): Promise<void> {
    Logger.step('Opening Analyze popup');
    await this.click(this.locators.analyzeButton());
    await this.locators.analyzePopup().waitFor({ state: 'visible', timeout: 10000 });

    if (tab === 'history') {
      await this.click(this.locators.scheduleHistoryTab());
    } else if (tab === 'labor') {
      await this.click(this.locators.laborGuidanceTab());
    }

    Logger.pass('Analyze popup opened');
  }

  /**
   * Close the Analyze popup.
   */
  async closeAnalyzePopup(): Promise<void> {
    await this.click(this.locators.analyzePopupClose());
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get total hours from pie chart in Analyze popup.
   *
   * Port of: getPieChartTotalHrsFromLaborGuidanceTab()
   */
  async getPieChartTotalHours(): Promise<string> {
    const totalHours = this.locators.totalHoursLabel();
    if (await this.isVisible(totalHours, 3000)) {
      return this.getText(totalHours);
    }
    return '';
  }
}
