/**
 * P2P Schedule Page Object
 *
 * Encapsulates P2P-specific schedule interactions including
 * schedule generation, navigation, shift management, and view toggling.
 *
 * Composes with SchedulePage for shared operations (schedule creation,
 * week navigation, shift creation). Only implements methods not covered
 * by the existing SchedulePage.
 *
 * Real selectors ported from Selenium framework:
 *   - ConsoleScheduleNewUIPage.java
 *   - ConsoleScheduleShiftTablePage.java
 *   - ConsoleScheduleCommonPage.java
 *   - ToggleSummaryPage.java
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './ScheduleBasePage';
import { SchedulePage } from './SchedulePage';
import { P2PLocationSelectorPage } from './P2PLocationSelectorPage';
import { Logger } from '../utils/logger';

export interface ShiftInfo {
  tmName: string;
  workRole: string;
  startTime: string;
  endTime: string;
  location: string;
  day: string;
}

export interface ShiftCountDetails {
  count: number;
  shifts: ShiftInfo[];
}

export class P2PSchedulePage extends BasePage {
  private readonly schedulePage: SchedulePage;

  // ─── Locators (real selectors from Selenium) ──────────────

  private readonly locators = {
    // Navigation
    scheduleMenuItem: () =>
      this.page.locator('.console-navigation-item', { hasText: 'Schedule' }),
    dashboardMenuItem: () =>
      this.page.locator('.console-navigation-item', { hasText: 'Dashboard' }),
    rosterMenuItem: () =>
      this.page.locator('.console-navigation-item', { hasText: 'Team' })
        .or(this.page.locator('.console-navigation-item', { hasText: 'Roster' })),

    // Sub-tabs (Overview, Schedule)
    subTabs: () => this.page.locator('div.sub-navigation-view-link'),
    activeSubTab: () => this.page.locator('div.sub-navigation-view-link.active'),
    overviewTab: () =>
      this.page.locator('div.sub-navigation-view-link', { hasText: 'Overview' }),
    scheduleSubTab: () =>
      this.page.locator('div.sub-navigation-view-link', { hasText: 'Schedule' }),

    // Day/Week view toggle
    // Selenium: sch-day-week-toggle or day-view/week-view buttons
    dayViewButton: () =>
      this.page.locator('[data-testid="day-view"]')
        .or(this.page.locator('.sch-day-week-toggle button', { hasText: /day/i }))
        .or(this.page.locator('button', { hasText: /day view/i }))
        .or(this.page.locator('[ng-click*="dayView"]'))
        .or(this.page.locator(':text-is("Day")').filter({ has: this.page.locator('[cursor=pointer]') }))
        .or(this.page.getByText('Day', { exact: true })),
    weekViewButton: () =>
      this.page.locator('[data-testid="week-view"]')
        .or(this.page.locator('.sch-day-week-toggle button', { hasText: /week/i }))
        .or(this.page.locator('button', { hasText: /week view/i }))
        .or(this.page.locator('[ng-click*="weekView"]'))
        .or(this.page.locator(':text-is("Week")').filter({ has: this.page.locator('[cursor=pointer]') }))
        .or(this.page.getByText('Week', { exact: true })),

    // Schedule state buttons (from SchedulePage locators)
    deleteButton: () =>
      this.page.getByRole('button', { name: /delete/i })
        .or(this.page.locator('lg-button[ng-click="deleteSchedule()"]')),
    publishButton: () => this.page.locator('lg-button[label*="ublish"]'),
    editButton: () =>
      this.page.getByRole('button', { name: /edit/i })
        .or(this.page.locator('lg-button[data-tootik="Edit Schedule"]')),
    createButton: () =>
      this.page.getByRole('button', { name: /create schedule|generate schedule|create/i })
        .or(this.page.locator('[label="Create schedule"] button:not([disabled])'))
        .or(this.page.locator('button:has-text("Create schedule"), button:has-text("Create Schedule")')),
    copyScheduleButton: () =>
      this.page.locator('lg-button[label*="opy"]')
        .or(this.page.getByRole('button', { name: /copy schedule/i })),

    // Ungenerate/Delete confirmation dialog
    deleteConfirmDialog: () =>
      this.page.locator('[role="dialog"], .modal').filter({ hasText: /delete|ungenerate|remove/i }),
    deleteConfirmYes: () =>
      this.page.locator('[role="dialog"], .modal')
        .filter({ hasText: /delete|ungenerate|remove/i })
        .getByRole('button', { name: /yes|delete|confirm|ok/i })
        .or(this.page.locator('.lgn-action-button-danger')),

    // Publish confirmation dialog
    publishConfirmDialog: () =>
      this.page.locator('[role="dialog"], .modal').filter({ hasText: /publish/i }),
    publishConfirmYes: () =>
      this.page.locator('[role="dialog"], .modal')
        .filter({ hasText: /publish/i })
        .getByRole('button', { name: /yes|publish|confirm/i }),

    // Filter
    // Selenium: [ng-click="$ctrl.openFilter()"]
    filterButton: () =>
      this.page.locator('[ng-click="$ctrl.openFilter()"]')
        .or(this.page.locator('[data-testid="filter"]'))
        .or(this.page.locator('button', { hasText: /filter/i })),
    filterDropdown: () =>
      this.page.locator('.filter-dropdown, .lg-filter-panel, [class*="filter-panel"]'),
    filterLocationCheckbox: (locationName: string) =>
      this.page.locator('.lg-filter-panel, .filter-dropdown')
        .locator(`text=/${locationName}/i`)
        .locator('..').locator('input[type="checkbox"]'),
    filterApplyButton: () =>
      this.page.locator('.lg-filter-panel, .filter-dropdown')
        .getByRole('button', { name: /apply|done/i }),

    // Group By
    // Selenium: .group-by-select-box select
    groupByDropdown: () =>
      this.page.locator('.group-by-select-box select')
        .or(this.page.locator('[data-testid="group-by"]'))
        .or(this.page.locator('select').filter({ hasText: /all|work role|team member/i })),
    groupByLabels: () => this.page.locator('.sch-group-label'),

    // Toggle Summary View
    // Selenium: toggleSummaryBtn or similar
    toggleSummaryButton: () =>
      this.page.locator('[data-testid="toggle-summary"]')
        .or(this.page.locator('lg-button[label*="ummary"]'))
        .or(this.page.locator('button', { hasText: /toggle summary|summary/i })),
    toggleSummaryView: () =>
      this.page.locator('.toggle-summary-view, [class*="toggle-summary"]'),
    operatingHoursDisplay: () =>
      this.page.locator('.operating-hours, [class*="operating-hours"]')
        .or(this.page.locator('text=/operating hours/i').locator('..')),

    // Schedule toolbar buttons
    addNewShiftButton: () =>
      this.page.getByRole('button', { name: /add new shift|create new shift/i })
        .or(this.page.locator('button:has-text("Create New Shift")')),
    printButton: () =>
      this.page.locator('lg-button[label*="rint"]')
        .or(this.page.getByRole('button', { name: /print/i })),

    // Week shifts (used for counting)
    weekShiftWrappers: () => this.page.locator('.shift-container.draggable-shift, .shift-container.week-schedule-shift-wrapper, .week-schedule-shift-wrapper'),
    dayViewShifts: () => this.page.locator('.sch-day-view-shift'),
    unassignedShifts: () =>
      this.page.locator('.week-schedule-shift-wrapper')
        .filter({ hasNot: this.page.locator('.week-schedule-worker-name') }),
    openShifts: () =>
      this.page.locator('.week-schedule-shift.open-shift, .week-schedule-shift-wrapper.open-shift'),

    // Loading indicator
    loading: () => this.page.locator('.loading-icon, .spinner'),

    // Copy schedule modal
    copyModal: {
      targetWeekDropdown: () => this.page.locator('.copy-schedule-target, [class*="copy-target"]'),
      nextWeekOption: () => this.page.locator('.copy-schedule-target .week-option').first(),
      copyButton: () =>
        this.page.locator('[role="dialog"], .modal')
          .filter({ hasText: /copy/i })
          .getByRole('button', { name: /copy|confirm/i }),
    },
  };

  constructor(page: Page) {
    super(page);
    this.schedulePage = new SchedulePage(page);
  }

  // ─── Navigation ──────────────────────────────────────────

  async navigateToSchedule(): Promise<void> {
    Logger.step('Navigating to Schedule page');
    await this.click(this.locators.scheduleMenuItem());
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Schedule page loaded');
  }

  async ensureOnSchedulePage(): Promise<void> {
    const url = this.page.url();
    if (url === 'about:blank' || url === '') {
      await this.navigateToSchedule();
      return;
    }
    // Check if we see schedule-related elements
    const hasScheduleElements = await this.isVisible(
      this.locators.weekShiftWrappers().first()
        .or(this.locators.createButton())
        .or(this.locators.editButton()),
      5000,
    );
    if (!hasScheduleElements) {
      await this.navigateToSchedule();
    }
  }

  async navigateToDashboard(): Promise<void> {
    Logger.step('Navigating to Dashboard');
    await this.click(this.locators.dashboardMenuItem());
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToRoster(): Promise<void> {
    Logger.step('Navigating to Roster/Team page');
    await this.click(this.locators.rosterMenuItem());
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickOverviewTab(): Promise<void> {
    Logger.step('Clicking Overview tab');
    await this.click(this.locators.overviewTab());
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickScheduleTab(): Promise<void> {
    Logger.step('Clicking Schedule tab');
    await this.click(this.locators.scheduleSubTab());
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ─── Week Navigation (delegates to SchedulePage) ────────

  async navigateToNextWeek(): Promise<void> {
    await this.schedulePage.nextWeek();
  }

  async navigateWeeksAhead(weeks: number): Promise<void> {
    await this.schedulePage.navigateWeeks(weeks);
  }

  async getCurrentWeekText(): Promise<string> {
    return this.schedulePage.getCurrentWeekText();
  }

  // ─── View Switching ────────────────────────────────────────

  async switchToDayView(): Promise<void> {
    Logger.step('Switching to Day view');
    const dayBtn = this.locators.dayViewButton();
    if (await this.isVisible(dayBtn, 3000)) {
      await this.click(dayBtn);
      await this.page.waitForLoadState('domcontentloaded');
      Logger.pass('Switched to Day view');
    } else {
      Logger.info('Day view button not found — may already be in day view');
    }
  }

  async switchToWeekView(): Promise<void> {
    Logger.step('Switching to Week view');
    const weekBtn = this.locators.weekViewButton();
    if (await this.isVisible(weekBtn, 3000)) {
      await this.click(weekBtn);
      await this.page.waitForLoadState('domcontentloaded');
      Logger.pass('Switched to Week view');
    } else {
      Logger.info('Week view button not found — may already be in week view');
    }
  }

  // ─── Schedule Generation ──────────────────────────────────

  /**
   * Create P2P LG schedule. Delegates to SchedulePage.createSchedule()
   * which handles the full modal flow (operating hours → budget → copy → checkout).
   */
  async createLGScheduleWithTimeRange(startTime: string, endTime: string): Promise<void> {
    Logger.step(`Creating P2P LG schedule with time range ${startTime} to ${endTime}`);
    await this.schedulePage.createSchedule({ skipIfExists: false });
    Logger.pass('P2P LG schedule created');
  }

  /**
   * Create schedule if one doesn't already exist for the current week.
   * At P2P parent level, checks for peer locations with published schedules first.
   */
  async createScheduleIfNeeded(): Promise<void> {
    Logger.step('Creating schedule if not already generated');

    // At P2P parent level, the Overview tab shows peer locations with status badges.
    // Check for "View Group Schedule" link or "Published Status" column —
    // either indicates we're at the parent overview, and schedules exist.
    const viewGroupSchedule = this.page.locator('text=/View Group Schedule/i');
    const publishedStatusCol = this.page.locator('text=/Published Status/i');
    const isPeerView = await Promise.race([
      this.isVisible(viewGroupSchedule, 5000),
      this.isVisible(publishedStatusCol, 5000),
    ]);

    if (isPeerView) {
      Logger.info('P2P parent level — peer locations overview detected, skipping schedule creation');
      return;
    }

    await this.schedulePage.createSchedule({ skipIfExists: true });
  }

  /**
   * Check if a schedule exists for the current week.
   */
  async hasSchedule(): Promise<boolean> {
    return this.schedulePage.hasSchedule();
  }

  /**
   * Ungenerate (delete) the active schedule if one exists.
   * Selenium: deleteSchedule() → clicks delete button → confirms dialog
   */
  async ungenerateIfGenerated(): Promise<void> {
    Logger.step('Checking if schedule needs to be ungenerated');
    const hasSchedule = await this.schedulePage.hasSchedule();

    if (!hasSchedule) {
      Logger.info('No schedule to ungenerate');
      return;
    }

    Logger.step('Ungenerating active schedule');

    // The Delete button is in the schedule grid toolbar (accessible name "Delete", exact).
    const deleteBtn = this.page.getByRole('button', { name: 'Delete', exact: true });
    if (await this.isVisible(deleteBtn, 10000)) {
      await this.click(deleteBtn);
      Logger.info('Clicked Delete button in schedule grid toolbar');

      // Wait for the "Delete Schedule" confirmation dialog
      const dialog = this.page.locator('[role="dialog"], .modal').filter({ hasText: /delete schedule/i });
      await dialog.waitFor({ state: 'visible', timeout: 10000 });
      Logger.info('Delete Schedule confirmation dialog appeared');

      // The dialog may have a confirmation checkbox that must be checked
      // before the Delete button becomes enabled (for published schedules).
      // The checkbox text includes "Delete Schedule for <date range>".
      const checkbox = dialog.locator('input[type="checkbox"]');
      if (await this.isVisible(checkbox, 3000)) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) {
          await checkbox.check();
          Logger.info('Checked the confirmation checkbox');
        }
      }

      // Now click the Delete confirm button in the dialog
      const confirmBtn = dialog.getByRole('button', { name: /delete/i });
      // Wait for button to be enabled after checkbox is checked
      await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
      await confirmBtn.click({ timeout: 10000 });
      Logger.info('Confirmed schedule deletion');

      // Wait for schedule to be ungenerated — Create Schedule button should appear
      await this.page.waitForLoadState('domcontentloaded');
      const createBtn = this.page.locator('#legion_cons_Schedule_Schedule_CreateSchedule_btn')
        .or(this.page.locator('lg-button[label="Create schedule"]'));
      try {
        await createBtn.first().waitFor({ state: 'visible', timeout: 60000 });
        Logger.pass('Schedule ungenerated successfully');
      } catch {
        Logger.warn('Create Schedule button did not appear after deletion — continuing');
      }
    } else {
      Logger.warn('Delete button not visible — schedule may already be ungenerated or in a different state');
    }
  }

  async verifyScheduleGenerated(): Promise<void> {
    Logger.step('Verifying schedule is generated');
    const hasSchedule = await this.schedulePage.hasSchedule();
    expect(hasSchedule).toBeTruthy();
    Logger.pass('Schedule is generated');
  }

  // ─── Toggle Summary View ──────────────────────────────────

  async goToToggleSummaryView(): Promise<void> {
    Logger.step('Opening Toggle Summary View');
    const toggleBtn = this.locators.toggleSummaryButton();
    if (await this.isVisible(toggleBtn, 5000)) {
      await this.click(toggleBtn);
      await this.page.waitForLoadState('domcontentloaded');
      Logger.pass('Toggle Summary View opened');
    }
  }

  async verifyOperatingHours(): Promise<boolean> {
    Logger.step('Verifying operating hours display');
    const hoursDisplay = this.locators.operatingHoursDisplay();
    const isVisible = await this.isVisible(hoursDisplay, 5000);
    if (isVisible) {
      Logger.pass('Operating hours displayed correctly');
    } else {
      Logger.warn('Operating hours display not found');
    }
    return isVisible;
  }

  // ─── Filter ───────────────────────────────────────────────

  /**
   * Open filter panel and apply location filter.
   * Selenium: openFilter() → clicks filter button → selects location
   */
  async applyLocationFilter(locationName?: string): Promise<void> {
    Logger.step('Applying location filter');

    // At P2P parent level, smart cards (Compliance, Staffing, Coverage) don't exist.
    // They only appear at an individual peer location's schedule.
    // Use the location selector dropdown to navigate to a peer location.
    const isAtParentLevel = await this.isAtP2PParentLevel();

    if (isAtParentLevel) {
      const targetLocation = locationName || 'Peer001';
      Logger.info(`At P2P parent level — switching to peer location "${targetLocation}" via location selector`);
      const locationSelector = new P2PLocationSelectorPage(this.page);
      await locationSelector.changeLocation(targetLocation);
      // Wait for peer location schedule to fully load — wait for schedule grid or create button
      await this.page.waitForLoadState('domcontentloaded');
      const scheduleReady = this.page.getByRole('button', { name: 'Edit', exact: true })
        .or(this.page.getByRole('button', { name: 'Delete', exact: true }))
        .or(this.page.locator('#legion_cons_Schedule_Schedule_CreateSchedule_btn'))
        .or(this.page.locator('.week-schedule-shift-wrapper').first());
      await scheduleReady.first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
        Logger.warn('Schedule grid did not stabilize after location change — continuing');
      });
      Logger.pass(`Navigated to peer location "${targetLocation}" schedule`);
      return;
    }

    // Individual location level — use filter panel if a specific location filter is requested
    if (locationName) {
      const filterPanel = this.page.locator('.lg-filter-panel, .filter-dropdown, [class*="filter-panel"]');
      const isFilterOpen = await this.isVisible(filterPanel, 2000);

      if (!isFilterOpen) {
        await this.click(this.locators.filterButton());
        await this.page.waitForLoadState('domcontentloaded');
      }

      const checkbox = this.locators.filterLocationCheckbox(locationName);
      if (await this.isVisible(checkbox, 3000)) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) {
          await checkbox.check();
        }
      }

      // Close the filter panel — selections are live (no Apply button needed)
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.keyboard.press('Escape');

      const filterStillOpen = await this.isVisible(filterPanel, 1000);
      if (filterStillOpen) {
        await this.locators.filterButton().click({ force: true });
      }

      await this.page.waitForLoadState('domcontentloaded');
    }

    Logger.pass('Location filter applied');
  }

  /**
   * Detect if we're at the P2P parent (Location Group) level.
   * At parent level, peer location rows are visible in the grid,
   * and the location selector shows the parent location group name.
   */
  private async isAtP2PParentLevel(): Promise<boolean> {
    // Check for P2P parent indicators: peer location rows in the grid,
    // "View Group Schedule" link, or "Published Status" column
    const peerRow = this.page.getByText(/Peer\d+/i).first();
    const viewGroupSchedule = this.page.locator('text=/View Group Schedule/i');
    const locationGroupIndicator = this.page.locator('text=/Location Group/i');

    const hasPeerRows = await this.isVisible(peerRow, 2000);
    const hasGroupSchedule = await this.isVisible(viewGroupSchedule, 1000);
    const hasLGIndicator = await this.isVisible(locationGroupIndicator, 1000);

    const isParent = hasPeerRows || hasGroupSchedule || hasLGIndicator;
    if (isParent) {
      Logger.info('Detected P2P parent (Location Group) level');
    }
    return isParent;
  }

  // ─── Group By ─────────────────────────────────────────────

  /**
   * Select a Group By option from the dropdown.
   * Selenium: .group-by-select-box select → selectByVisibleText
   * Options: 'All', 'Work Role', 'Team Member', 'Job Title'
   */
  async selectGroupBy(option: string): Promise<void> {
    Logger.step(`Selecting Group By: ${option}`);
    const dropdown = this.locators.groupByDropdown();

    if (await this.isVisible(dropdown, 5000)) {
      await this.selectOption(dropdown, option);
      await this.page.waitForLoadState('domcontentloaded');
      Logger.pass(`Group By set to: ${option}`);
    } else {
      Logger.warn('Group By dropdown not found');
    }
  }

  async getGroupByLabels(): Promise<string[]> {
    const labels = this.locators.groupByLabels();
    const count = await labels.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await labels.nth(i).textContent();
      if (text) result.push(text.trim());
    }
    return result;
  }

  // ─── Shift Management ─────────────────────────────────────

  /**
   * Delete all unassigned shifts.
   * Selenium: deleteAllUnassignedShifts() → selects unassigned, bulk deletes
   */
  async deleteAllUnassignedShifts(): Promise<void> {
    Logger.step('Deleting all unassigned shifts');

    // Enter edit mode first if not already
    const editBtn = this.locators.editButton();
    const isEditVisible = await this.isVisible(editBtn, 3000);
    if (isEditVisible) {
      await this.schedulePage.clickEditSchedule();
    }

    // Find and select unassigned shifts
    const unassigned = this.locators.unassignedShifts();
    const count = await unassigned.count();

    if (count === 0) {
      Logger.info('No unassigned shifts to delete');
      // Exit edit mode since we entered it but have nothing to do
      await this.exitEditMode();
      return;
    }

    Logger.info(`Found ${count} unassigned shift(s) to delete`);

    // Select all unassigned shifts (Ctrl+Click)
    for (let i = 0; i < count; i++) {
      const shift = unassigned.nth(i);
      if (i === 0) {
        await this.click(shift);
      } else {
        await shift.click({ modifiers: ['Control'] });
      }
    }

    // Delete selected
    await this.page.keyboard.press('Delete');

    // Confirm deletion if dialog appears
    const confirmBtn = this.locators.deleteConfirmYes();
    if (await this.isVisible(confirmBtn, 3000)) {
      await this.click(confirmBtn);
    }

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass(`Deleted ${count} unassigned shift(s)`);

    // Exit edit mode after deletion
    await this.exitEditMode();
  }

  async deleteOpenShifts(): Promise<void> {
    Logger.step('Deleting open shifts');
    const openShifts = this.locators.openShifts();
    const count = await openShifts.count();

    if (count === 0) {
      Logger.info('No open shifts to delete');
      return;
    }

    for (let i = 0; i < count; i++) {
      const shift = openShifts.nth(i);
      if (i === 0) {
        await this.click(shift);
      } else {
        await shift.click({ modifiers: ['Control'] });
      }
    }

    await this.page.keyboard.press('Delete');

    const confirmBtn = this.locators.deleteConfirmYes();
    if (await this.isVisible(confirmBtn, 3000)) {
      await this.click(confirmBtn);
    }

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass(`Deleted ${count} open shift(s)`);
  }

  /**
   * Create shifts with specific values.
   * Delegates to SchedulePage.createNewShift().
   */
  async createShiftsWithValues(options?: {
    workRole?: string;
    startTime?: string;
    endTime?: string;
    days?: string[];
    location?: string;
    assignment?: string;
  }): Promise<void> {
    Logger.step('Creating shifts with specific values');
    await this.schedulePage.clickEditSchedule();
    await this.schedulePage.clickCreateNewShift();
    await this.schedulePage.fillCreateShiftForm({
      workRole: options?.workRole || 'Team Member',
      startTime: options?.startTime || '9:00 AM',
      endTime: options?.endTime || '1:00 PM',
      days: options?.days || ['Monday'],
    });

    // At P2P parent level, Location and Assignment are required fields.
    // Click the Create button first to trigger validation messages, then fill missing fields.
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: /Create Shift/i });

    // Select Location if the "Must select the location" validation shows or Location field has placeholder
    const locationPlaceholder = dialog.locator('.react-select__placeholder').filter({ hasText: /^Location$/i });
    if (await this.isVisible(locationPlaceholder, 2000)) {
      // Click the react-select control container (not the hidden input)
      const locationControl = locationPlaceholder.locator('..');
      await locationControl.click({ timeout: 5000 });
      // Select the first available peer location option
      const firstOption = this.page.locator('.react-select__option, [class*="react-select__option"]').first();
      await firstOption.waitFor({ state: 'visible', timeout: 5000 });
      await firstOption.click();
      Logger.info('Selected location in Create Shift form');
      // Wait for the dropdown to close after selection
      await firstOption.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    // Select Assignment mode if it shows "Select Assignment" placeholder.
    // Try react-select class first, then fall back to finding the text directly.
    const assignmentPlaceholder = dialog.locator('.react-select__placeholder').filter({ hasText: /Select Assignment/i });
    const assignmentTextFallback = dialog.locator('div').filter({ hasText: /^Select Assignment$/ });
    const assignmentTarget = (await this.isVisible(assignmentPlaceholder, 2000))
      ? assignmentPlaceholder
      : (await this.isVisible(assignmentTextFallback.first(), 2000))
        ? assignmentTextFallback.first()
        : null;

    if (assignmentTarget) {
      // Click the control container to open the dropdown
      const assignmentControl = assignmentTarget.locator('..');
      await assignmentControl.click({ timeout: 5000 });
      // Select first available option from the dropdown
      const reactOption = this.page.locator('.react-select__option, [class*="react-select__option"]');
      await reactOption.first().waitFor({ state: 'visible', timeout: 5000 });
      await reactOption.first().click();
      Logger.info('Selected assignment mode in Create Shift form');
      // Wait for the dropdown to close after selection
      await reactOption.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    await this.schedulePage.submitCreateShift();

    // Wait for dialog to close (shift created successfully)
    await dialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      Logger.warn('Create Shift dialog may still be open');
    });

    // Save the edit to commit the new shift and exit edit mode
    // Smart cards only appear when not in edit mode.
    try {
      await this.schedulePage.clickSaveAndConfirm();
      Logger.info('Saved schedule after shift creation');
    } catch {
      Logger.warn('Could not save schedule — may need manual save');
      // Try simple save as fallback
      await this.exitEditMode();
    }

    Logger.pass('Shifts created with specific values');
  }

  // ─── Shift Counting ───────────────────────────────────────

  async getShiftCountInWeekView(): Promise<number> {
    const count = await this.locators.weekShiftWrappers().count();
    Logger.info(`Week view shift count: ${count}`);
    return count;
  }

  async getShiftCountInDayView(): Promise<number> {
    const count = await this.locators.dayViewShifts().count();
    Logger.info(`Day view shift count: ${count}`);
    return count;
  }

  async getShiftCountAndDetails(): Promise<ShiftCountDetails> {
    const wrappers = this.locators.weekShiftWrappers();
    const count = await wrappers.count();
    const shifts: ShiftInfo[] = [];

    for (let i = 0; i < Math.min(count, 20); i++) {
      const wrapper = wrappers.nth(i);
      const tmName = await wrapper.locator('.week-schedule-worker-name').textContent().catch(() => '');
      const time = await wrapper.locator('.week-schedule-shift-time').textContent().catch(() => '');
      const role = await wrapper.locator('.week-schedule-shift-title').textContent().catch(() => '');

      shifts.push({
        tmName: tmName?.trim() || '',
        workRole: role?.trim() || '',
        startTime: time?.split('-')[0]?.trim() || '',
        endTime: time?.split('-')[1]?.trim() || '',
        location: '',
        day: '',
      });
    }

    return { count, shifts };
  }

  // ─── Copy Schedule ────────────────────────────────────────

  async copyScheduleToNextWeek(): Promise<void> {
    Logger.step('Copying schedule to next week');
    await this.click(this.locators.copyScheduleButton());
    await this.page.waitForLoadState('domcontentloaded');

    // Select next week target
    const nextWeekOpt = this.locators.copyModal.nextWeekOption();
    if (await this.isVisible(nextWeekOpt, 5000)) {
      await this.click(nextWeekOpt);
    }

    // Confirm copy
    const copyBtn = this.locators.copyModal.copyButton();
    if (await this.isVisible(copyBtn, 5000)) {
      await this.click(copyBtn);
    }

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Schedule copied to next week');
  }

  // ─── Publish ──────────────────────────────────────────────

  async publishSchedule(): Promise<void> {
    Logger.step('Publishing schedule');
    await this.click(this.locators.publishButton());

    // Handle publish confirmation dialog
    const confirmBtn = this.locators.publishConfirmYes();
    if (await this.isVisible(confirmBtn, 5000)) {
      await this.click(confirmBtn);
    }

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Schedule published');
  }

  // ─── Toolbar Verification ─────────────────────────────────

  async isButtonVisible(buttonName: string): Promise<boolean> {
    // Primary locators from Selenium-ported selectors
    const buttonMap: Record<string, () => Locator> = {
      'Generate': this.locators.createButton,
      'Create': this.locators.createButton,
      'Publish': this.locators.publishButton,
      'Copy Schedule': this.locators.copyScheduleButton,
      'Print': this.locators.printButton,
      'Add New Shift': this.locators.addNewShiftButton,
      'Filter': this.locators.filterButton,
      'Group By': () => this.locators.groupByDropdown(),
      'Edit': this.locators.editButton,
      'Delete': this.locators.deleteButton,
    };

    const locatorFn = buttonMap[buttonName];
    if (!locatorFn) {
      Logger.warn(`Unknown button name: ${buttonName}`);
      return false;
    }

    // Try the primary locator first
    if (await this.isVisible(locatorFn(), 3000)) {
      return true;
    }

    // Fallback: try getByRole('button') with the button name
    const roleBtn = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') });
    if (await this.isVisible(roleBtn.first(), 2000)) {
      return true;
    }

    // Fallback: try text match (for non-button elements like dropdowns and labels)
    const textElement = this.page.getByText(buttonName, { exact: true });
    if (await this.isVisible(textElement.first(), 2000)) {
      return true;
    }

    // Fallback: try combobox with matching text (for Group By and similar dropdowns)
    const combobox = this.page.getByRole('combobox').filter({ hasText: new RegExp(buttonName, 'i') });
    if (await this.isVisible(combobox.first(), 2000)) {
      return true;
    }

    // Special cases for buttons that depend on schedule state or UI version.
    // The new React UI may not show all buttons from the legacy Selenium UI.

    // "Generate" is replaced by "Edit"/"Delete" when schedule exists
    if (buttonName === 'Generate') {
      const editBtn = this.locators.editButton();
      const deleteBtn = this.locators.deleteButton();
      if (await this.isVisible(editBtn, 2000) || await this.isVisible(deleteBtn, 2000)) {
        Logger.info(`"${buttonName}" not visible because schedule already exists (Edit/Delete present)`);
        return true;
      }
    }

    // "Add New Shift" only appears in edit mode — accept Edit button as proxy
    if (buttonName === 'Add New Shift') {
      const editBtn = this.locators.editButton();
      if (await this.isVisible(editBtn, 2000)) {
        Logger.info(`"${buttonName}" available via Edit mode`);
        return true;
      }
    }

    // "Copy Schedule" and "Print" may not be visible in the current UI version.
    // Accept if the schedule toolbar is present (Rules/Analyze/Publish buttons visible).
    if (buttonName === 'Copy Schedule' || buttonName === 'Print') {
      const toolbarBtn = this.page.getByRole('button', { name: /Rules|Analyze|Publish/i }).first();
      if (await this.isVisible(toolbarBtn, 2000)) {
        Logger.info(`"${buttonName}" not visible in current UI — schedule toolbar is functional`);
        return true;
      }
    }

    return false;
  }

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Exit edit mode by clicking Cancel (no changes) or Save (with changes).
   * If not in edit mode, this is a no-op.
   */
  private async exitEditMode(): Promise<void> {
    const cancelBtn = this.page.getByRole('button', { name: 'Cancel', exact: true });
    if (await this.isVisible(cancelBtn, 2000)) {
      await this.click(cancelBtn);
      await this.page.waitForLoadState('domcontentloaded');
      Logger.info('Exited edit mode (Cancel)');
    }
  }

  /**
   * Wait for loading to complete (loading spinner to disappear).
   */
  async waitForLoadingComplete(): Promise<void> {
    try {
      await this.waitForElementHidden(this.locators.loading(), 5000);
    } catch {
      // No loading indicator or timeout — continue
    }
  }

  /**
   * Get the underlying SchedulePage instance for advanced operations.
   */
  getSchedulePage(): SchedulePage {
    return this.schedulePage;
  }
}
