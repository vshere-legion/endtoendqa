/**
 * TestRail Utility
 *
 * Port of TestRailUtil.java from the Selenium + Cucumber framework.
 * Handles creating test runs and adding test results.
 *
 * Original: com.legion.tests.testframework.bdd.utils.TestRailUtil
 */

import { TestRailAPIClient, TestRailAPIError } from './testrail-api-client';
import { TestRailConfig, loadTestRailConfig } from './testrail-config';

// Status IDs matching TestRail's built-in statuses
// Same as the Java constants: STATUS_PASS_ID=1, STATUS_PENDING_ID=2, STATUS_FAIL_ID=5
export const STATUS = {
  PASSED: 1,
  BLOCKED: 2,
  UNTESTED: 3,
  RETEST: 4,
  FAILED: 5,
} as const;

export interface TestRunInfo {
  runId: number;
  runUrl: string;
  runName: string;
}

export interface TestResultPayload {
  testCaseId: string;
  statusId: number;
  comment: string;
  elapsed?: string;
  version?: string;
}

export class TestRailUtil {
  private client: TestRailAPIClient;
  private config: TestRailConfig;
  private runId: string | null = null;

  constructor(config?: TestRailConfig) {
    this.config = config || loadTestRailConfig();

    this.client = new TestRailAPIClient(
      this.config.url,
      this.config.username,
      this.config.password,
    );
  }

  /**
   * Create a new test run in TestRail
   *
   * Port of: TestRailUtil.createTestRun(String suiteId, String name)
   *
   * @param suiteId - TestRail suite ID
   * @param runName - Name for the test run
   * @returns Test run ID as string
   */
  async createTestRun(suiteId?: string, runName?: string): Promise<string> {
    const sId = suiteId || this.config.suiteId;
    const name = runName || this.generateRunName();

    console.log(`[TestRail] Creating test run: "${name}" (Suite: ${sId})`);

    try {
      const data: Record<string, any> = {
        suite_id: parseInt(sId, 10),
        name: name,
        include_all: true, // Include all test cases in the suite
      };

      const response = await this.client.sendPost(
        `add_run/${this.config.projectId}`,
        data
      );

      this.runId = response.id.toString();

      console.log(`[TestRail] Test run created: ID=${this.runId}`);
      console.log(`[TestRail] URL: ${this.config.url}index.php?/runs/view/${this.runId}`);

      return this.runId;
    } catch (error: any) {
      console.error(`[TestRail] Failed to create test run: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add test result for a specific test case
   *
   * Port of: TestRailUtil.addResults(String testCaseId, int status, String error, String versionString)
   *
   * @param testCaseId - TestRail test case ID (just the number, without "C" prefix)
   * @param statusId - Status ID (1=Passed, 5=Failed, 2=Blocked)
   * @param comment - Comment/error message
   * @param version - Version string (optional)
   */
  async addResults(
    testCaseId: string,
    statusId: number,
    comment: string,
    version?: string
  ): Promise<void> {
    const runNumber = this.runId || this.config.runNumber;

    if (!runNumber) {
      console.warn(`[TestRail] No run ID available. Skipping result for case ${testCaseId}`);
      return;
    }

    if (!testCaseId) {
      console.warn('[TestRail] No test case ID provided. Skipping.');
      return;
    }

    try {
      const env = this.config.environment || process.env.TEST_ENV || 'staging';
      const enterprise = this.config.enterprise || process.env.ENTERPRISE || '';

      const data: Record<string, any> = {
        status_id: statusId,
        comment: `Executed from automation suite. ${comment} using version ${version || 'N/A'} on enterprise ${env}/${enterprise}`,
      };

      if (version) {
        data.version = version;
      }

      console.log(`[TestRail] Adding result for case C${testCaseId}: ${this.getStatusName(statusId)}`);

      await this.client.sendPost(
        `add_result_for_case/${runNumber}/${testCaseId}`,
        data
      );
    } catch (error: any) {
      // Don't throw - TestRail failures shouldn't break test execution
      console.error(`[TestRail] Failed to add result for case ${testCaseId}: ${error.message}`);
    }
  }

  /**
   * Close a test run
   *
   * @param runId - Test run ID to close (defaults to current run)
   */
  async closeTestRun(runId?: string): Promise<void> {
    const id = runId || this.runId;

    if (!id) {
      console.warn('[TestRail] No run ID to close');
      return;
    }

    try {
      await this.client.sendPost(`close_run/${id}`, {});
      console.log(`[TestRail] Test run ${id} closed`);
    } catch (error: any) {
      console.error(`[TestRail] Failed to close run ${id}: ${error.message}`);
    }
  }

  /**
   * Get the current test run ID
   */
  getRunId(): string | null {
    return this.runId || this.config.runNumber || null;
  }

  /**
   * Set the test run ID (e.g., from environment variable or CI)
   */
  setRunId(runId: string): void {
    this.runId = runId;
  }

  /**
   * Check if TestRail integration is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Extract TestRail case ID from Cucumber tags
   *
   * Supports both formats:
   *   @TestRail_12345   (legacy format from Selenium framework)
   *   @TestRail-C12345  (standard format)
   *   @C12345           (short format)
   *
   * @param tags - Array of scenario tags
   * @returns Test case ID (just the number) or null
   */
  static extractCaseId(tags: string[]): string | null {
    for (const tag of tags) {
      // Match @TestRail_12345 (legacy format from Selenium framework)
      const legacyMatch = tag.match(/^@TestRail_(\d+)$/);
      if (legacyMatch) {
        return legacyMatch[1];
      }

      // Match @TestRail-C12345
      const standardMatch = tag.match(/^@TestRail-C(\d+)$/);
      if (standardMatch) {
        return standardMatch[1];
      }

      // Match @C12345
      const shortMatch = tag.match(/^@C(\d+)$/);
      if (shortMatch) {
        return shortMatch[1];
      }
    }

    return null;
  }

  /**
   * Check if scenario has @CreateTestRailRun tag
   * (Same as Selenium framework - this tag creates a run, doesn't report results)
   */
  static isCreateRunScenario(tags: string[]): boolean {
    return tags.some(tag => tag === '@CreateTestRailRun');
  }

  /**
   * Generate a default run name with date
   */
  private generateRunName(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const env = this.config.environment || process.env.TEST_ENV || 'staging';
    return `Automation Suite Run ${env} ${dateStr}`;
  }

  /**
   * Get human-readable status name
   */
  private getStatusName(statusId: number): string {
    switch (statusId) {
      case STATUS.PASSED: return 'PASSED';
      case STATUS.FAILED: return 'FAILED';
      case STATUS.BLOCKED: return 'BLOCKED';
      case STATUS.RETEST: return 'RETEST';
      case STATUS.UNTESTED: return 'UNTESTED';
      default: return `UNKNOWN(${statusId})`;
    }
  }
}
