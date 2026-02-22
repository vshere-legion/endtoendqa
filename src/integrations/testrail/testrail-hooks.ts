/**
 * TestRail Cucumber Hooks
 *
 * Port of Hook.java TestRail integration from the Selenium + Cucumber framework.
 * Automatically reports test results to TestRail after each scenario.
 *
 * Original: com.legion.tests.bdd.Hook (afterStep method)
 *
 * Flow (matches Selenium framework exactly):
 *   1. BeforeAll: Initialize TestRailUtil, optionally create a test run
 *   2. Before each scenario: Extract @TestRail_<id> from tags
 *   3. After each scenario: Report PASSED/FAILED/SKIPPED to TestRail
 *
 * Tag formats supported (same as Selenium framework):
 *   @TestRail_12345     - Legacy format (from Selenium framework)
 *   @TestRail-C12345    - Standard format
 *   @C12345             - Short format
 *   @CreateTestRailRun  - Create a new test run (same as LoginApiSteps.java)
 */

import { Before, After, BeforeAll, AfterAll, ITestCaseHookParameter } from '@cucumber/cucumber';
import { TestRailUtil, STATUS } from './testrail-util';
import { loadTestRailConfig } from './testrail-config';

// Shared TestRail utility instance (initialized once per process)
let testRailUtil: TestRailUtil | null = null;
let testRailEnabled = false;

// Track results for summary
let totalReported = 0;
let passedReported = 0;
let failedReported = 0;
let skippedReported = 0;

/**
 * BeforeAll - Initialize TestRail connection
 *
 * Equivalent to the static initialization in TestRailUtil.java
 */
BeforeAll(async function () {
  const config = loadTestRailConfig();

  if (!config.enabled) {
    console.log('[TestRail] Integration disabled. Set TESTRAIL_ENABLED=true to enable.');
    return;
  }

  testRailUtil = new TestRailUtil(config);
  testRailEnabled = true;

  console.log('[TestRail] Hooks initialized');
});

/**
 * Before - Handle @CreateTestRailRun tag
 *
 * Port of LoginApiSteps.java:
 *   @Given("Create Test rail run")
 *   public void createTestRailRun() {
 *     String runNumber = TestRailUtil.createTestRun(suiteId, runName);
 *   }
 */
Before({ tags: '@CreateTestRailRun' }, async function () {
  if (!testRailEnabled || !testRailUtil) return;

  try {
    console.log('[TestRail] Creating new test run (@CreateTestRailRun tag detected)');
    const runId = await testRailUtil.createTestRun();
    console.log(`[TestRail] Test run created: ${runId}`);
  } catch (error: any) {
    console.error(`[TestRail] Failed to create test run: ${error.message}`);
  }
});

/**
 * After - Report test results to TestRail
 *
 * Port of Hook.java:
 *   @After
 *   public void afterStep(Scenario scenario) throws IOException, APIException {
 *     String testCaseId = null;
 *     for (String tag : scenario.getSourceTagNames()) {
 *       if (tag.contains("@TestRail_")) {
 *         testCaseId = tag.split("_")[1];
 *       }
 *     }
 *     if (scenario.isFailed()) {
 *       TestRailUtil.addResults(testCaseId, STATUS_FAIL_ID, "test got failed", version);
 *     } else if (scenario.getStatus().toString().equalsIgnoreCase("PASSED")) {
 *       TestRailUtil.addResults(testCaseId, STATUS_PASS_ID, "test got passed", version);
 *     } else {
 *       TestRailUtil.addResults(testCaseId, STATUS_PENDING_ID, "test got skipped", version);
 *     }
 *   }
 */
After(async function (scenario: ITestCaseHookParameter) {
  if (!testRailEnabled || !testRailUtil) return;

  const tags = scenario.pickle.tags.map(tag => tag.name);
  const scenarioName = scenario.pickle.name;

  // Skip TestRail reporting for @CreateTestRailRun scenarios
  // Same as Java: if (isCreateTestRailRun) { return; }
  if (TestRailUtil.isCreateRunScenario(tags)) {
    console.log(`[TestRail] Skipping reporting for @CreateTestRailRun scenario: ${scenarioName}`);
    return;
  }

  // Extract test case ID from tags
  const testCaseId = TestRailUtil.extractCaseId(tags);

  if (!testCaseId) {
    // No TestRail tag found - skip silently
    return;
  }

  // Get version string (from env, same as Java: System.getProperty("versionString"))
  const versionString = process.env.VERSION_STRING || process.env.BUILD_NUMBER || '';

  // Determine status and report
  // Same logic as Java Hook.afterStep()
  const status = scenario.result?.status;

  if (status === 'FAILED') {
    const errorMessage = scenario.result?.message || 'test got failed in automation';
    await testRailUtil.addResults(
      testCaseId,
      STATUS.FAILED,
      `FAILED: ${errorMessage}`,
      versionString
    );
    failedReported++;
  } else if (status === 'PASSED') {
    await testRailUtil.addResults(
      testCaseId,
      STATUS.PASSED,
      'test got passed in automation',
      versionString
    );
    passedReported++;
  } else {
    // SKIPPED, PENDING, UNDEFINED, etc.
    await testRailUtil.addResults(
      testCaseId,
      STATUS.BLOCKED,
      'test got skipped in automation',
      versionString
    );
    skippedReported++;
  }

  totalReported++;
});

/**
 * AfterAll - Print TestRail summary
 */
AfterAll(async function () {
  if (!testRailEnabled || !testRailUtil) return;

  console.log('\n' + '='.repeat(60));
  console.log('TestRail Integration Summary');
  console.log('='.repeat(60));
  console.log(`  Total Reported:  ${totalReported}`);
  console.log(`  Passed:          ${passedReported}`);
  console.log(`  Failed:          ${failedReported}`);
  console.log(`  Skipped:         ${skippedReported}`);

  const runId = testRailUtil.getRunId();
  if (runId) {
    const config = loadTestRailConfig();
    console.log(`  Run URL:         ${config.url}index.php?/runs/view/${runId}`);
  }

  console.log('='.repeat(60) + '\n');
});
