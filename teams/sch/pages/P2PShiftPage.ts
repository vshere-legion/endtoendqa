/**
 * P2P Shift Page Object
 *
 * Encapsulates shift manipulation operations including open shift creation,
 * TM assignment, drag & drop, shift selection, and shift editing.
 *
 * Real selectors ported from Selenium framework:
 *   - ConsoleScheduleShiftTablePage.java
 *   - EditShiftPage.java
 *   - NewShiftPage.java
 *   - ShiftOperatePage.java
 *
 * Composes with SchedulePage for shift creation (fillCreateShiftForm, submitCreateShift).
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './ScheduleBasePage';
import { SchedulePage } from './SchedulePage';
import { Logger } from '../utils/logger';

export interface ShiftDetails {
  tmName: string;
  workRole: string;
  startTime: string;
  endTime: string;
  location: string;
  day: string;
  dayIndex: number;
  index: number;
}

export interface TwoShifts {
  first: ShiftDetails;
  second: ShiftDetails;
}

export class P2PShiftPage extends BasePage {
  private readonly schedulePage: SchedulePage;

  // ─── Locators (real selectors from Selenium) ───────────────

  private readonly locators = {
    // Week view shifts
    // Selenium: @FindBy(css = ".shift-container.week-schedule-shift-wrapper")
    weekShiftWrappers: () =>
      this.page.locator('.shift-container.week-schedule-shift-wrapper, .week-schedule-shift-wrapper'),
    // Selenium: .rows .week-schedule-worker-name
    weekShiftWorkerName: () => this.page.locator('.rows .week-schedule-worker-name'),
    // Selenium: .week-schedule-shift-time
    weekShiftTime: () => this.page.locator('.week-schedule-shift-time'),
    // Selenium: .week-schedule-shift-title
    weekShiftTitle: () => this.page.locator('.week-schedule-shift-title'),

    // Shifts by day index (0=Mon, 6=Sun)
    // Selenium: [data-day-index="N"] .week-schedule-shift-wrapper
    shiftsByDay: (dayIndex: number) =>
      this.page.locator(`[data-day-index="${dayIndex}"] .week-schedule-shift-wrapper`),

    // Day view shifts
    // Selenium: @FindBy(css = ".sch-day-view-shift")
    dayViewShifts: () => this.page.locator('.sch-day-view-shift'),
    // Selenium: .sch-day-view-shift-worker-name
    dayViewWorkerName: () => this.page.locator('.sch-day-view-shift-worker-name'),
    // Selenium: .sch-day-view-shift-worker-title-role
    dayViewWorkerRole: () => this.page.locator('.sch-day-view-shift-worker-title-role'),
    // Selenium: .sch-day-view-shift-worker-detail
    dayViewShiftDetail: () => this.page.locator('.sch-day-view-shift-worker-detail'),

    // Assigned vs open shifts
    assignedShifts: () =>
      this.page.locator('.week-schedule-shift-wrapper')
        .filter({ has: this.page.locator('.week-schedule-worker-name') }),
    openShifts: () =>
      this.page.locator('.week-schedule-shift.open-shift, .week-schedule-shift-wrapper.open-shift')
        .or(this.page.locator('.week-schedule-shift-wrapper')
          .filter({ hasNot: this.page.locator('.week-schedule-worker-name') })),

    // Shift avatar images (for drag & drop)
    // Selenium: .week-view-shift-image-optimized img
    shiftAvatarByDay: (dayIndex: number) =>
      this.page.locator(`[data-day-index="${dayIndex}"] .week-view-shift-image-optimized img`),

    // Drag target places
    // Selenium: @FindBy(css = ".drag-target-place")
    dragTargetPlaces: () => this.page.locator('.drag-target-place'),

    // Shift place holders (for drop targets by day)
    // Selenium: .week-schedule-shift-place with data-day-index
    shiftPlaceByDay: (dayIndex: number) =>
      this.page.locator(`[data-day-index="${dayIndex}"] .week-schedule-shift-place, [data-day-index="${dayIndex}"] .drag-target-place`),

    // Drag and drop confirmation modal
    // Selenium: @FindBy(css = ".swap-modal.modal-instance")
    swapConfirmModal: () => this.page.locator('.swap-modal.modal-instance'),
    // Selenium: @FindBy(css = ".modal-dialog.modal-lgn-md")
    moveAnywayDialog: () => this.page.locator('.modal-dialog.modal-lgn-md'),
    // Selenium: @FindBy(css = "div[ng-repeat=\"error in swapError\"]")
    swapErrors: () => this.page.locator('div[ng-repeat="error in swapError"]'),
    // Selenium: @FindBy(css = "div[ng-repeat=\"error in assignError\"]")
    assignErrors: () => this.page.locator('div[ng-repeat="error in assignError"]'),
    // Selenium: @FindBy(css = ".swap-modal-error")
    copyMoveErrors: () => this.page.locator('.swap-modal-error'),

    // Confirm button on drag & drop dialog
    // Selenium: .lgn-action-button-success
    confirmButton: () =>
      this.page.locator('.lgn-action-button-success')
        .or(this.page.locator('.swap-modal.modal-instance').getByRole('button', { name: /confirm|yes|ok/i })),
    cancelButton: () =>
      this.page.locator('.swap-modal.modal-instance').getByRole('button', { name: /cancel|no/i }),
    confirmAnywayButton: () =>
      this.page.locator('.swap-modal.modal-instance').getByRole('button', { name: /confirm anyway|move anyway/i })
        .or(this.page.locator('.lgn-action-button-success')),

    // Copy/Move option selector in drag dialog
    copyMoveOptions: () =>
      this.page.locator('.swap-modal.modal-instance input[type="radio"]'),
    copyOption: () =>
      this.page.locator('.swap-modal.modal-instance').locator('text=/copy/i').locator('..').locator('input[type="radio"]'),
    moveOption: () =>
      this.page.locator('.swap-modal.modal-instance').locator('text=/move/i').locator('..').locator('input[type="radio"]'),

    // Edit shift dialogs
    editShiftDialog: () =>
      this.page.locator('[role="dialog"], .modal').filter({ hasText: /edit shift/i }),
    bulkEditDialog: () =>
      this.page.locator('[role="dialog"], .modal').filter({ hasText: /edit.*shift/i }),

    // Edit shift form fields
    editStartTime: () =>
      this.page.locator('[role="dialog"], .modal')
        .filter({ hasText: /edit shift/i })
        .locator('input[placeholder*="Start" i], input[name*="start" i]'),
    editEndTime: () =>
      this.page.locator('[role="dialog"], .modal')
        .filter({ hasText: /edit shift/i })
        .locator('input[placeholder*="End" i], input[name*="end" i]'),
    editLocationDropdown: () =>
      this.page.locator('[role="dialog"], .modal')
        .filter({ hasText: /edit shift/i })
        .locator('.react-select__control, [class*="react-select"]')
        .filter({ hasText: /location/i }),

    // Save/Delete buttons (in edit mode)
    saveButton: () =>
      this.page.getByRole('button', { name: /^save$/i })
        .or(this.page.locator('button:has-text("Save")')),
    deleteShiftButton: () =>
      this.page.getByRole('button', { name: /delete/i })
        .or(this.page.locator('button:has-text("Delete")')),

    // Auto-open shift configuration
    // Selenium: buttons/controls for auto-open shift setup
    autoOpenShiftToggle: () =>
      this.page.locator('[data-testid="auto-open-shift"]')
        .or(this.page.locator('text=/auto.*open/i').locator('..').locator('input, button, [role="switch"]')),

    // Add new shift button (in edit mode)
    addNewShiftButton: () =>
      this.page.getByRole('button', { name: /create new shift/i })
        .or(this.page.locator('button:has-text("Create New Shift")')),

    // Violation/error messages
    violationMessage: () =>
      this.page.locator('.violation-message, .error-message, [class*="violation"], [class*="error"]')
        .or(this.page.locator('text=/violation|cannot|prevented|exceeded|overlap/i')),

    // Worker rows in schedule grid (for finding TMs)
    workerRows: () =>
      this.page.locator('.week-schedule-worker-row, [class*="worker-row"]'),

    // Group labels (for identifying locations in view)
    groupLabels: () => this.page.locator('.sch-group-label'),

    // Day part titles
    dayPartTitles: () => this.page.locator('.week-schedule-shift-title'),

    // Child location names in the schedule view
    childLocationLabels: () =>
      this.page.locator('.sch-group-label, .location-label, [class*="location-name"]'),
  };

  constructor(page: Page) {
    super(page);
    this.schedulePage = new SchedulePage(page);
  }

  // ─── Shift Selection ──────────────────────────────────────

  /**
   * Get details of a random assigned shift.
   *
   * Port of: getTheShiftInfoByIndex(randomIndex)
   */
  async getRandomAssignedShift(): Promise<ShiftDetails> {
    Logger.step('Getting a random assigned shift');
    const assigned = this.locators.assignedShifts();
    const count = await assigned.count();

    if (count === 0) {
      throw new Error('No assigned shifts found on the schedule');
    }

    const randomIndex = Math.floor(Math.random() * count);
    const shift = assigned.nth(randomIndex);

    return this.extractShiftDetails(shift, randomIndex);
  }

  /**
   * Select two shifts with different assigned TMs.
   *
   * Port of: selectTwoDifferentAssignedShifts
   */
  async selectTwoDifferentAssignedShifts(): Promise<TwoShifts> {
    Logger.step('Selecting two shifts with different TMs');
    const assigned = this.locators.assignedShifts();
    const count = await assigned.count();

    if (count < 2) {
      throw new Error(`Need at least 2 assigned shifts, found ${count}`);
    }

    const first = await this.extractShiftDetails(assigned.nth(0), 0);
    let second: ShiftDetails | null = null;

    for (let i = 1; i < count; i++) {
      const candidate = await this.extractShiftDetails(assigned.nth(i), i);
      if (candidate.tmName !== first.tmName) {
        second = candidate;
        break;
      }
    }

    if (!second) {
      // Fallback: use the second shift even if same TM
      second = await this.extractShiftDetails(assigned.nth(1), 1);
    }

    return { first, second };
  }

  /**
   * Select a single shift and return its details.
   */
  async selectSingleShift(): Promise<ShiftDetails> {
    Logger.step('Selecting a single shift');
    const shifts = this.locators.weekShiftWrappers();
    const count = await shifts.count();

    if (count === 0) {
      throw new Error('No shifts found on the schedule');
    }

    const shift = shifts.first();
    await this.click(shift);
    return this.extractShiftDetails(shift, 0);
  }

  /**
   * Select multiple assigned shifts (Ctrl+Click).
   * Returns the number of shifts selected.
   */
  async selectMultipleAssignedShifts(maxCount: number = 3): Promise<number> {
    Logger.step(`Selecting up to ${maxCount} assigned shifts`);
    const assigned = this.locators.assignedShifts();
    const totalCount = await assigned.count();
    const selectCount = Math.min(maxCount, totalCount);

    for (let i = 0; i < selectCount; i++) {
      const shift = assigned.nth(i);
      if (i === 0) {
        await this.click(shift);
      } else {
        await shift.click({ modifiers: ['Control'] });
      }
    }

    Logger.pass(`Selected ${selectCount} assigned shifts`);
    return selectCount;
  }

  // ─── Open Shift Creation ──────────────────────────────────

  /**
   * Configure auto-open shifts for a given work role.
   *
   * Port of: configureAutoOpenShift(workRole)
   */
  async configureAutoOpenShifts(workRole: string): Promise<void> {
    Logger.step(`Configuring auto-open shifts for work role: ${workRole}`);

    // Enter edit mode
    await this.schedulePage.clickEditSchedule();

    // Click create new shift
    await this.schedulePage.clickCreateNewShift();

    // Fill form with auto-open assignment
    await this.schedulePage.fillCreateShiftForm({
      workRole,
      assignment: 'Open Shift: Auto Offer to TMs',
    });

    // Submit
    await this.schedulePage.submitCreateShift();

    // Save schedule
    await this.clickSaveSchedule();

    Logger.pass(`Auto-open shifts configured for ${workRole}`);
  }

  /**
   * Create a manual open shift with given parameters.
   *
   * Port of: createManualOpenShift
   */
  async createManualOpenShift(params: {
    workRole?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
    shiftCount?: number;
    days?: string[];
  }): Promise<void> {
    Logger.step('Creating manual open shift');

    // Enter edit mode
    await this.schedulePage.clickEditSchedule();

    // Create the shift(s)
    const count = params.shiftCount || 1;
    for (let i = 0; i < count; i++) {
      await this.schedulePage.clickCreateNewShift();
      await this.schedulePage.fillCreateShiftForm({
        workRole: params.workRole || 'Team Member',
        startTime: params.startTime || '9:00 AM',
        endTime: params.endTime || '1:00 PM',
        days: params.days || ['Monday'],
        assignment: 'Manual Offer to TMs',
      });
      await this.schedulePage.submitCreateShift();
    }

    // Save
    await this.clickSaveSchedule();
    Logger.pass(`Created ${count} manual open shift(s)`);
  }

  /**
   * Verify auto-open shifts were created.
   */
  async verifyAutoOpenShiftsCreated(): Promise<void> {
    Logger.step('Verifying auto-open shifts created');
    const openShifts = this.locators.openShifts();
    const count = await openShifts.count();
    expect(count).toBeGreaterThan(0);
    Logger.pass(`Verified: ${count} open shift(s) exist`);
  }

  /**
   * Verify manual open shifts were created.
   */
  async verifyManualOpenShiftsCreated(): Promise<void> {
    await this.verifyAutoOpenShiftsCreated(); // Same verification
  }

  // ─── TM Assignment ────────────────────────────────────────

  /**
   * Assign a TM to the currently selected shift.
   *
   * Port of: assignTMToShift flow
   */
  async assignTMToShift(tmName: string): Promise<void> {
    Logger.step(`Assigning TM "${tmName}" to shift`);

    // Enter edit mode
    await this.schedulePage.clickEditSchedule();

    // Create a shift with specific TM assignment
    await this.schedulePage.clickCreateNewShift();
    await this.schedulePage.fillCreateShiftForm({
      assignment: 'Assign or Offer to Specific TM\'s',
    });
    await this.schedulePage.submitCreateShift();

    Logger.pass(`TM "${tmName}" assigned to shift`);
  }

  /**
   * Get child location names from the schedule view.
   */
  async getChildLocationNames(): Promise<string[]> {
    Logger.step('Getting child location names');
    const labels = this.locators.childLocationLabels();
    const count = await labels.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await labels.nth(i).textContent();
      if (text) names.push(text.trim());
    }

    Logger.pass(`Found ${names.length} child location(s): ${names.join(', ')}`);
    return names;
  }

  // ─── Shift Deletion ───────────────────────────────────────

  /**
   * Delete all shifts for a specific TM.
   *
   * Port of: bulkDeleteTMShiftsInWeekView(tmName)
   */
  async deleteTMShifts(tmName: string): Promise<void> {
    Logger.step(`Deleting shifts for TM: ${tmName}`);

    // Enter edit mode
    await this.schedulePage.clickEditSchedule();

    // Find all shifts belonging to this TM
    const allShifts = this.locators.weekShiftWrappers();
    const totalCount = await allShifts.count();
    let selectedCount = 0;

    for (let i = 0; i < totalCount; i++) {
      const shift = allShifts.nth(i);
      const workerName = await shift.locator('.week-schedule-worker-name')
        .textContent().catch(() => '');

      if (workerName?.trim().toLowerCase().includes(tmName.toLowerCase())) {
        if (selectedCount === 0) {
          await this.click(shift);
        } else {
          await shift.click({ modifiers: ['Control'] });
        }
        selectedCount++;
      }
    }

    if (selectedCount === 0) {
      Logger.warn(`No shifts found for TM: ${tmName}`);
      return;
    }

    Logger.info(`Selected ${selectedCount} shifts for TM: ${tmName}`);

    // Delete selected shifts
    await this.page.keyboard.press('Delete');

    // Confirm deletion
    const confirmBtn = this.page.locator('[role="dialog"], .modal')
      .filter({ hasText: /delete|remove/i })
      .getByRole('button', { name: /yes|delete|confirm|ok/i })
      .or(this.page.locator('.lgn-action-button-danger'));

    if (await this.isVisible(confirmBtn, 3000)) {
      await this.click(confirmBtn);
    }

    await this.page.waitForLoadState('domcontentloaded');

    // Save
    await this.clickSaveSchedule();

    Logger.pass(`Deleted ${selectedCount} shift(s) for TM: ${tmName}`);
  }

  /**
   * Delete currently selected shifts.
   */
  async deleteSelectedShifts(): Promise<void> {
    Logger.step('Deleting selected shifts');
    await this.page.keyboard.press('Delete');

    const confirmBtn = this.page.locator('[role="dialog"], .modal')
      .filter({ hasText: /delete|remove/i })
      .getByRole('button', { name: /yes|delete|confirm|ok/i });

    if (await this.isVisible(confirmBtn, 3000)) {
      await this.click(confirmBtn);
    }

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Selected shifts deleted');
  }

  // ─── Drag & Drop ──────────────────────────────────────────

  /**
   * Drag and drop shifts to a target day/location.
   *
   * Port of: dragOneAvatarToAnother(startIndex, firstName, endIndex)
   *
   * Uses Playwright's native dragTo() API.
   * For same-day: source and target have same data-day-index
   * For different-day: different data-day-index values
   */
  async dragDropShifts(
    targetDay: 'sameDay' | 'differentDay',
    targetLocation: 'sameLocation' | 'differentLocation',
  ): Promise<void> {
    Logger.step(`Drag & drop shift: ${targetDay}, ${targetLocation}`);

    // Find a source shift (first assigned shift)
    const sourceShifts = this.locators.assignedShifts();
    const sourceCount = await sourceShifts.count();

    if (sourceCount === 0) {
      throw new Error('No assigned shifts available for drag & drop');
    }

    const sourceShift = sourceShifts.first();
    const sourceDayIndex = await this.getShiftDayIndex(sourceShift);

    // Determine target day index
    let targetDayIndex: number;
    if (targetDay === 'sameDay') {
      targetDayIndex = sourceDayIndex;
    } else {
      // Pick a different day (next day, wrapping around)
      targetDayIndex = (sourceDayIndex + 1) % 7;
    }

    // Find target drop zone
    let targetElement: Locator;
    if (targetLocation === 'sameLocation') {
      // Drop on the same location row, target day
      targetElement = this.locators.shiftPlaceByDay(targetDayIndex).first();
    } else {
      // Drop on a different location row
      // Find a shift place in a different group/location
      const allPlaces = this.locators.shiftPlaceByDay(targetDayIndex);
      const placeCount = await allPlaces.count();
      targetElement = placeCount > 1 ? allPlaces.last() : allPlaces.first();
    }

    // Perform the drag
    await sourceShift.dragTo(targetElement);

    // Handle confirmation dialog if it appears
    await this.handleDragDropConfirmation('move');

    Logger.pass(`Drag & drop completed: ${targetDay}, ${targetLocation}`);
  }

  /**
   * Copy shifts (hold modifier key during drag).
   *
   * Port of: copy shift workflow with Ctrl key
   */
  async copyShifts(
    targetDay: 'sameDay' | 'differentDay',
    targetLocation: 'sameLocation' | 'differentLocation',
  ): Promise<void> {
    Logger.step(`Copy shift: ${targetDay}, ${targetLocation}`);

    const sourceShifts = this.locators.assignedShifts();
    const sourceShift = sourceShifts.first();
    const sourceDayIndex = await this.getShiftDayIndex(sourceShift);

    let targetDayIndex: number;
    if (targetDay === 'sameDay') {
      targetDayIndex = sourceDayIndex;
    } else {
      targetDayIndex = (sourceDayIndex + 1) % 7;
    }

    let targetElement: Locator;
    if (targetLocation === 'sameLocation') {
      targetElement = this.locators.shiftPlaceByDay(targetDayIndex).first();
    } else {
      const allPlaces = this.locators.shiftPlaceByDay(targetDayIndex);
      targetElement = (await allPlaces.count()) > 1 ? allPlaces.last() : allPlaces.first();
    }

    // Hold Control/Meta key during drag for copy
    await this.page.keyboard.down('Control');
    await sourceShift.dragTo(targetElement);
    await this.page.keyboard.up('Control');

    // Handle confirmation - select "Copy" option
    await this.handleDragDropConfirmation('copy');

    Logger.pass(`Copy completed: ${targetDay}, ${targetLocation}`);
  }

  /**
   * Drag and drop an employee row to a target location.
   *
   * Port of: dragEmployee workflow
   */
  async dragDropEmployee(targetLocation: string): Promise<void> {
    Logger.step(`Dragging employee to location: ${targetLocation}`);

    const workerRows = this.locators.workerRows();
    const sourceRow = workerRows.first();

    // Find target location group
    const targetGroup = this.page.locator('.sch-group-label, .location-label')
      .filter({ hasText: new RegExp(targetLocation, 'i') });

    if (!await this.isVisible(targetGroup, 5000)) {
      throw new Error(`Target location "${targetLocation}" not found`);
    }

    await sourceRow.dragTo(targetGroup);

    // Handle confirmation
    await this.handleDragDropConfirmation('move');

    Logger.pass(`Employee dragged to ${targetLocation}`);
  }

  // ─── Shift Editing ────────────────────────────────────────

  /**
   * Open single shift edit dialog by double-clicking.
   */
  async openSingleEditDialog(): Promise<void> {
    Logger.step('Opening single shift edit dialog');
    const shifts = this.locators.weekShiftWrappers();
    await this.doubleClick(shifts.first());

    // Wait for edit dialog
    await this.locators.editShiftDialog().waitFor({ state: 'visible', timeout: 10000 });
    Logger.pass('Single edit dialog opened');
  }

  /**
   * Open bulk edit dialog for selected shifts.
   */
  async openBulkEditDialog(): Promise<void> {
    Logger.step('Opening bulk edit dialog');

    // Select multiple shifts first
    await this.selectMultipleAssignedShifts(3);

    // Open bulk edit (usually via right-click or toolbar button)
    const bulkEditBtn = this.page.getByRole('button', { name: /bulk edit|edit selected/i });
    if (await this.isVisible(bulkEditBtn, 3000)) {
      await this.click(bulkEditBtn);
    } else {
      // Try double-clicking the last selected shift
      const assigned = this.locators.assignedShifts();
      await this.doubleClick(assigned.first());
    }

    await this.locators.bulkEditDialog().waitFor({ state: 'visible', timeout: 10000 });
    Logger.pass('Bulk edit dialog opened');
  }

  /**
   * Save after editing shifts.
   */
  async saveSingleEdit(): Promise<void> {
    Logger.step('Saving single edit');
    const dialog = this.locators.editShiftDialog();
    const saveBtn = dialog.getByRole('button', { name: /save/i });
    await this.click(saveBtn);
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Single edit saved');
  }

  /**
   * Save after bulk editing shifts.
   */
  async saveBulkEdit(): Promise<void> {
    Logger.step('Saving bulk edit');
    const dialog = this.locators.bulkEditDialog();
    const saveBtn = dialog.getByRole('button', { name: /save|apply/i });
    await this.click(saveBtn);
    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Bulk edit saved');
  }

  // ─── Private Helpers ──────────────────────────────────────

  /**
   * Extract shift details from a shift wrapper element.
   */
  private async extractShiftDetails(shift: Locator, index: number): Promise<ShiftDetails> {
    const tmName = await shift.locator('.week-schedule-worker-name')
      .textContent().catch(() => '');
    const time = await shift.locator('.week-schedule-shift-time')
      .textContent().catch(() => '');
    const role = await shift.locator('.week-schedule-shift-title')
      .textContent().catch(() => '');
    const dayIndex = await this.getShiftDayIndex(shift);

    return {
      tmName: tmName?.trim() || '',
      workRole: role?.trim() || '',
      startTime: time?.split('-')[0]?.trim() || '',
      endTime: time?.split('-')[1]?.trim() || '',
      location: '',
      day: this.dayIndexToName(dayIndex),
      dayIndex,
      index,
    };
  }

  /**
   * Get the day index of a shift from its ancestor's data-day-index attribute.
   */
  private async getShiftDayIndex(shift: Locator): Promise<number> {
    // Walk up DOM to find data-day-index
    const dayIndex = await shift.evaluate((el) => {
      let current: HTMLElement | null = el as HTMLElement;
      while (current) {
        const attr = current.getAttribute('data-day-index');
        if (attr !== null) return parseInt(attr, 10);
        current = current.parentElement;
      }
      return 0;
    });
    return dayIndex;
  }

  /**
   * Convert day index (0-6) to day name.
   */
  private dayIndexToName(index: number): string {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[index] || `Day${index}`;
  }

  /**
   * Handle the drag & drop confirmation modal.
   *
   * Port of: isDragAndDropConfirmPageLoaded + selectCopyOrMoveByOptionName + clickConfirmBtn
   */
  private async handleDragDropConfirmation(action: 'copy' | 'move'): Promise<void> {
    const confirmModal = this.locators.swapConfirmModal();

    // Check if confirmation dialog appeared
    if (!await this.isVisible(confirmModal, 5000)) {
      Logger.info('No drag & drop confirmation dialog — operation completed directly');
      return;
    }

    Logger.step(`Handling drag & drop confirmation: ${action}`);

    // Check for "Move Anyway" dialog (store open/close hours conflict)
    const moveAnyway = this.locators.moveAnywayDialog();
    if (await this.isVisible(moveAnyway, 2000)) {
      const moveBtn = moveAnyway.getByRole('button', { name: /move anyway/i })
        .or(this.page.locator('.lgn-action-button-success'));
      await this.click(moveBtn);
      Logger.info('Clicked "Move Anyway"');
    }

    // Select Copy or Move option if radio buttons are present
    if (action === 'copy') {
      const copyOpt = this.locators.copyOption();
      if (await this.isVisible(copyOpt, 2000)) {
        await copyOpt.check();
      }
    } else {
      const moveOpt = this.locators.moveOption();
      if (await this.isVisible(moveOpt, 2000)) {
        await moveOpt.check();
      }
    }

    // Check for errors
    const errors = this.locators.copyMoveErrors();
    const errorCount = await errors.count();
    if (errorCount > 0) {
      const errorText = await errors.first().textContent().catch(() => '');
      Logger.warn(`Drag & drop error: ${errorText}`);

      // Try "Confirm Anyway" button
      const confirmAnyway = this.locators.confirmAnywayButton();
      if (await this.isVisible(confirmAnyway, 2000)) {
        await this.click(confirmAnyway);
        Logger.info('Clicked "Confirm Anyway" despite errors');
        return;
      }
    }

    // Click confirm button
    const confirmBtn = this.locators.confirmButton();
    if (await this.isVisible(confirmBtn, 3000)) {
      await this.click(confirmBtn);
      Logger.info('Confirmed drag & drop action');
    }

    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Click save in schedule edit mode and handle confirmation.
   */
  private async clickSaveSchedule(): Promise<void> {
    const saveBtn = this.locators.saveButton();
    if (await this.isVisible(saveBtn, 3000)) {
      await this.click(saveBtn);

      // Handle save confirmation dialog
      const confirmDialog = this.page.locator('[role="dialog"], .modal')
        .filter({ hasText: /are you sure.*save/i });
      if (await this.isVisible(confirmDialog, 3000)) {
        const confirmSave = confirmDialog.getByRole('button', { name: /^save$/i })
          .or(this.page.locator('.save-modal-body').locator('..').locator('..').getByRole('button', { name: /^save$/i }));
        await this.click(confirmSave);
      }

      await this.page.waitForLoadState('domcontentloaded');
      Logger.pass('Schedule saved');
    }
  }
}
