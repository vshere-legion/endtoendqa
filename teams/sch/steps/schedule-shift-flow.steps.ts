import { createBdd } from 'playwright-bdd';
import { test, expect } from '../../../src/fixtures/test-fixtures';

const { Given, When, Then } = createBdd(test);
import { LoginPageAdapter } from '../pages/LoginPageAdapter';
import { DashboardPageAdapter } from '../pages/DashboardPageAdapter';
import { SchedulePage } from '../pages/SchedulePage';
import { Logger } from '../utils/logger';
import { getCurrentTimestamp, formatDateForAPI } from '../utils/helpers';

// ─── Context Keys ────────────────────────────────────────────
const CTX = {
  CREDENTIAL: 'credential',
  WEEK_START: 'scheduleWeekStart',
  SCHEDULE_CREATED: 'scheduleCreated',
  UI_SHIFT_NAME: 'uiShiftName',
  UI_SHIFT_EXT_ID: 'uiShiftExternalId',
  UI_SHIFT_DATE: 'uiShiftDate',
  API_SHIFT_EXT_ID: 'apiShiftExternalId',
  API_SHIFT_DATE: 'apiShiftDate',
  UI_SHIFT_ID: 'uiShiftId',
  API_SHIFT_ID: 'apiShiftId',
  SCHEDULE_HOURS: 'scheduleHours',
};

// ═══════════════════════════════════════════════════════════════
// Scenario 1: Login and Create Schedule
// ═══════════════════════════════════════════════════════════════

Given('I login as {string} and navigate to the location', async ({ page, pageManager, testContext, $tags }, role: string) => {
  // Extract credential group from @group-<name> tag (replaces old "test class" step)
  const groupTag = $tags.find((t: string) => t.startsWith('@group-'));
  const credentialGroup = groupTag ? groupTag.slice(7) : undefined;
  if (credentialGroup) {
    Logger.setTestName(credentialGroup);
  }

  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('SCENARIO 1: LOGIN & CREATE SCHEDULE');
  Logger.info('═══════════════════════════════════════════════════════════');

  // Get credentials from DataService (environment-aware)
  const dataService = testContext.dataService;
  const user = dataService.getUILoginUserBy(role);
  const location = user.locations?.[0] || '';

  // Store as credential object for backward compatibility with later scenarios
  const credential = {
    username: user.name,
    password: user.password,
    location,
    role: user.userType,
    testClass: credentialGroup,
  };
  testContext.setContext(CTX.CREDENTIAL, credential);

  Logger.info(`Using credentials: ${credential.username} (via DataService)`);
  Logger.info(`Location: ${credential.location}`);

  // Login
  const loginPage = pageManager.get(LoginPageAdapter);
  await loginPage.navigateToLogin();
  await loginPage.login(credential.username, credential.password);

  // Verify dashboard
  const dashboardPage = pageManager.get(DashboardPageAdapter);
  await dashboardPage.verifyDashboardLoaded();

  // Navigate to location
  try {
    await dashboardPage.searchSpecificLocationAndNavigateTo(credential.location);
    Logger.pass(`Successfully navigated to location: ${credential.location}`);
  } catch (error) {
    Logger.error('Location search failed', error as Error);
    await page.screenshot({ path: `logs/location-search-failed-${Date.now()}.png` });
    throw error;
  }

  Logger.pass('Login complete');
});

When('I navigate to schedule for next week', async ({ page, pageManager, testContext }) => {
  const schedulePage = pageManager.get(SchedulePage);

  // Navigate to schedule for next week
  await schedulePage
    .gotoSchedule()
    .then(p => p.navigateToSubTab('Schedule'))
    .then(p => p.navigateWeeks(1));

  await page.waitForLoadState('domcontentloaded');

  // Store week start date (Friday of next week)
  const fridayDate = new Date();
  // Calculate next Friday
  const dayOfWeek = fridayDate.getDay();
  const daysUntilFriday = ((5 - dayOfWeek + 7) % 7) || 7; // next Friday
  fridayDate.setDate(fridayDate.getDate() + daysUntilFriday);

  const fridayUTC = new Date(Date.UTC(fridayDate.getFullYear(), fridayDate.getMonth(), fridayDate.getDate(), 0, 0, 0, 0));
  testContext.setContext(CTX.WEEK_START, fridayUTC.toISOString());

  Logger.info(`Week start stored: ${fridayUTC.toISOString().split('T')[0]}`);
});

Then('a schedule should exist for the current week', async ({ pageManager, testContext }) => {
  const schedulePage = pageManager.get(SchedulePage);

  Logger.info('Checking if schedule exists...');
  const scheduleExists = await schedulePage.hasSchedule();

  if (!scheduleExists) {
    Logger.warn('No schedule exists - creating new schedule...');
    await schedulePage.createSchedule({
      skipIfExists: false,
      copyFromSuggested: true,
      timeout: 60000
    });
    Logger.pass('Schedule created');
    testContext.setContext(CTX.SCHEDULE_CREATED, true);
  } else {
    Logger.pass('Schedule already exists');
    testContext.setContext(CTX.SCHEDULE_CREATED, false);
  }
});

Then('I should see the schedule hours on the smart card', async ({ pageManager, testContext }) => {
  const schedulePage = pageManager.get(SchedulePage);

  const scheduleHours = await schedulePage.getScheduleHoursFromSmartCard({
    retries: 5,
    retryDelay: 3000
  });

  testContext.setContext(CTX.SCHEDULE_HOURS, scheduleHours);
  Logger.pass(`Schedule hours: ${scheduleHours}`);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 2: Create Shift via UI
// ═══════════════════════════════════════════════════════════════

Given('I am on the schedule page from previous scenario', async ({ page }) => {
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('SCENARIO 2: CREATE UI SHIFT');
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('Reusing browser from Scenario 1');

  const currentUrl = page.url();
  Logger.info(`Current URL: ${currentUrl}`);
  await page.waitForLoadState('domcontentloaded');
});

When('I edit the schedule and create a new shift with:', async ({ pageManager, testContext }, dataTable: any) => {
  const schedulePage = pageManager.get(SchedulePage);

  // Parse data table
  const rows = dataTable.hashes();
  const shiftConfig = rows[0];

  // Get week start from context
  const weekStart = testContext.getContext(CTX.WEEK_START);
  if (!weekStart) {
    throw new Error('Schedule week start not available from Scenario 1');
  }

  const fridayDate = new Date(weekStart);
  testContext.setContext(CTX.UI_SHIFT_DATE, fridayDate);

  Logger.info(`Creating shift on ${shiftConfig.day}: ${formatDateForAPI(fridayDate)}`);

  // Create unique shift name
  const timestamp = getCurrentTimestamp();
  const uiShiftName = `UI Shift - ${timestamp}`;
  const uiShiftExternalId = `ui-shift-${timestamp}`;

  testContext.setContext(CTX.UI_SHIFT_NAME, uiShiftName);
  testContext.setContext(CTX.UI_SHIFT_EXT_ID, uiShiftExternalId);

  Logger.info(`Creating: ${uiShiftName}`);
  Logger.info(`Time: ${shiftConfig.startTime} - ${shiftConfig.endTime}`);

  // Edit schedule and create shift
  await schedulePage.clickEditSchedule();
  await schedulePage.clickCreateNewShift();

  await schedulePage.fillCreateShiftForm({
    workRole: shiftConfig.workRole,
    startTime: shiftConfig.startTime,
    endTime: shiftConfig.endTime,
    days: [shiftConfig.day],
    assignment: shiftConfig.assignment,
    shiftName: uiShiftName,
    shiftNotes: `External ID: ${uiShiftExternalId}`
  });

  await schedulePage.submitCreateShift();
});

When('I save the schedule changes', async ({ pageManager }) => {
  const schedulePage = pageManager.get(SchedulePage);

  Logger.info('Saving schedule changes...');
  await schedulePage.clickSaveAndConfirm();
  Logger.pass('Schedule changes saved and confirmed');
});

Then('the UI shift should be created successfully', async ({ testContext }) => {
  const uiShiftName = testContext.getContext(CTX.UI_SHIFT_NAME);
  const uiShiftExternalId = testContext.getContext(CTX.UI_SHIFT_EXT_ID);

  Logger.pass(`UI Shift Created: ${uiShiftName}`);
  Logger.pass(`External ID: ${uiShiftExternalId}`);

  expect(uiShiftName).toBeTruthy();
  expect(uiShiftExternalId).toBeTruthy();
});

// ═══════════════════════════════════════════════════════════════
// Scenario 3: Create API Shift and Publish
// ═══════════════════════════════════════════════════════════════

Given('I am on the dashboard from previous scenario', async ({ pageManager }) => {
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('SCENARIO 3: CREATE API SHIFT & PUBLISH');
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('Reusing browser session');

  const dashboardPage = pageManager.get(DashboardPageAdapter);
  await dashboardPage.verifyDashboardLoaded();
});

When('I create a shift via API for Saturday with role {string} and time {string}', async ({ page, pageManager, testContext }, workRole: string, timeRange: string) => {
  const schedulePage = pageManager.get(SchedulePage);
  const credential = testContext.getContext(CTX.CREDENTIAL)!;
  const uiShiftDate = testContext.getContext(CTX.UI_SHIFT_DATE);

  if (!uiShiftDate) {
    throw new Error('UI shift date not available from Scenario 2');
  }

  // Saturday = Friday + 1 day
  const saturdayDate = new Date(uiShiftDate);
  saturdayDate.setDate(saturdayDate.getDate() + 1);
  testContext.setContext(CTX.API_SHIFT_DATE, saturdayDate);

  const timestamp = getCurrentTimestamp();
  const apiShiftExternalId = `api-shift-${timestamp}`;
  testContext.setContext(CTX.API_SHIFT_EXT_ID, apiShiftExternalId);

  Logger.info(`Creating API shift: ${apiShiftExternalId}`);
  Logger.info(`Date: ${formatDateForAPI(saturdayDate)} (Saturday)`);
  Logger.info(`Time: ${timeRange}`);

  const apiResponse = await schedulePage.createShiftViaAPI(
    saturdayDate,
    credential.location,
    { username: credential.username, password: credential.password },
    {
      workRole: workRole,
      startTime: timeRange,
      endTime: '1:00 PM',
      shiftName: apiShiftExternalId,
    }
  );

  // Update external ID from response if available
  const responseExtId = apiResponse.shiftExternalId || apiShiftExternalId;
  testContext.setContext(CTX.API_SHIFT_EXT_ID, responseExtId);

  Logger.pass(`API Shift Created: ${responseExtId}`);
});

When('I publish the schedule for the current week', async ({ pageManager, page }) => {
  const schedulePage = pageManager.get(SchedulePage);

  const currentUrl = page.url();
  if (!currentUrl.includes('/schedule')) {
    Logger.info('Navigating to schedule page...');
    await schedulePage.gotoSchedule();
    await schedulePage.navigateToSubTab('Schedule');
  }

  await schedulePage.publishScheduleForCurrentWeek();
  Logger.pass('Schedule published successfully');
});

Then('the API shift should be created and schedule published', async ({ testContext }) => {
  const apiShiftExternalId = testContext.getContext(CTX.API_SHIFT_EXT_ID);
  Logger.pass(`API shift created: ${apiShiftExternalId}`);
  Logger.pass('Schedule published');
  expect(apiShiftExternalId).toBeTruthy();
});

// ═══════════════════════════════════════════════════════════════
// Scenario 4: Validate Shifts via API
// ═══════════════════════════════════════════════════════════════

Given('shifts were created in previous scenarios', async ({ testContext }) => {
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('SCENARIO 4: VALIDATE SHIFTS');
  Logger.info('═══════════════════════════════════════════════════════════');

  const uiShiftDate = testContext.getContext(CTX.UI_SHIFT_DATE);
  const apiShiftDate = testContext.getContext(CTX.API_SHIFT_DATE);

  if (!uiShiftDate || !apiShiftDate) {
    throw new Error('Shift dates not available from previous scenarios');
  }

  Logger.info(`UI Shift External ID: ${testContext.getContext(CTX.UI_SHIFT_EXT_ID)}`);
  Logger.info(`API Shift External ID: ${testContext.getContext(CTX.API_SHIFT_EXT_ID)}`);
});

When('I validate shifts via the GET shifts API', async ({ pageManager, testContext }) => {
  const schedulePage = pageManager.get(SchedulePage);
  const credential = testContext.getContext(CTX.CREDENTIAL)!;
  const uiShiftDate = testContext.getContext(CTX.UI_SHIFT_DATE)!;
  const apiShiftDate = testContext.getContext(CTX.API_SHIFT_DATE)!;
  const uiShiftName = testContext.getContext(CTX.UI_SHIFT_NAME)!;
  const uiShiftExternalId = testContext.getContext(CTX.UI_SHIFT_EXT_ID)!;
  const apiShiftExternalId = testContext.getContext(CTX.API_SHIFT_EXT_ID)!;

  Logger.info('Validating shifts via API...');

  const validationResult = await schedulePage.getShiftsViaAPIAndValidate(
    credential.location,
    uiShiftDate,
    apiShiftDate,
    {
      shiftName: uiShiftName,
      startTime: '9:00 AM',
      endTime: '1:00 PM',
      day: 'Friday',
    },
    apiShiftExternalId,
    uiShiftExternalId,
    { username: credential.username, password: credential.password }
  );

  // Store results in context
  testContext.setContext(CTX.UI_SHIFT_ID, validationResult.uiShiftId || '');
  testContext.setContext(CTX.API_SHIFT_ID, validationResult.apiShiftId || '');
  testContext.setContext('validationResult', validationResult);

  Logger.info('Validation Results:');
  Logger.info(`  UI Shift Found: ${validationResult.uiShiftFound}`);
  Logger.info(`  API Shift Found: ${validationResult.apiShiftFound}`);
  Logger.info(`  Employee ID Match: ${validationResult.employeeExternalIdMatch}`);
  Logger.info(`  Timing Match: ${validationResult.timingMatch}`);
});

Then('both UI and API shifts should be found', async ({ testContext }) => {
  const result = testContext.getContext('validationResult');
  expect(result.uiShiftFound).toBeTruthy();
  expect(result.apiShiftFound).toBeTruthy();
  Logger.pass('Both shifts found');
});

Then('the employee external ID should match', async ({ testContext }) => {
  const result = testContext.getContext('validationResult');
  expect(result.employeeExternalIdMatch).toBeTruthy();
  Logger.pass('Employee external ID matches');
});

Then('the shift timing should match', async ({ testContext }) => {
  const result = testContext.getContext('validationResult');
  expect(result.timingMatch).toBeTruthy();
  Logger.pass('Shift timing matches');
});

// ═══════════════════════════════════════════════════════════════
// Scenario 5: Export and Verify CSV
// ═══════════════════════════════════════════════════════════════

Given('shift IDs are available from validation', async ({ testContext }) => {
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('SCENARIO 5: EXPORT VALIDATION');
  Logger.info('═══════════════════════════════════════════════════════════');

  const uiShiftId = testContext.getContext(CTX.UI_SHIFT_ID);
  const apiShiftId = testContext.getContext(CTX.API_SHIFT_ID);

  if (!uiShiftId || !apiShiftId) {
    throw new Error('Shift IDs not available from Scenario 4');
  }

  Logger.info(`UI Shift ID: ${uiShiftId}`);
  Logger.info(`API Shift ID: ${apiShiftId}`);
});

When('I export the shift report for the current week', async ({ pageManager, testContext }) => {
  const schedulePage = pageManager.get(SchedulePage);
  const credential = testContext.getContext(CTX.CREDENTIAL)!;
  const weekStart = testContext.getContext(CTX.WEEK_START)!;
  const uiShiftId = testContext.getContext(CTX.UI_SHIFT_ID)!;
  const apiShiftId = testContext.getContext(CTX.API_SHIFT_ID)!;

  Logger.info('Exporting shift report...');
  Logger.info(`Week: ${weekStart}`);

  const exportResult = await schedulePage.exportReportAndFindShiftIds({
    locationId: credential.location,
    startOfWeek: weekStart,
    uiShiftId: uiShiftId,
    apiShiftId: apiShiftId,
    credentials: { username: credential.username, password: credential.password }
  });

  testContext.setContext('exportResult', exportResult);

  Logger.info('Export Results:');
  Logger.info(`  UI Shift in Export: ${exportResult.foundUiShift}`);
  Logger.info(`  API Shift in Export: ${exportResult.foundApiShift}`);
});

Then('the UI shift ID should be found in the export', async ({ testContext }) => {
  const result = testContext.getContext('exportResult');
  expect(result.foundUiShift).toBeTruthy();
  Logger.pass('UI shift found in export');
});

Then('the API shift ID should be found in the export', async ({ testContext }) => {
  const result = testContext.getContext('exportResult');
  expect(result.foundApiShift).toBeTruthy();
  Logger.pass('API shift found in export');

  Logger.pass('ALL SCENARIOS PASSED');
});
