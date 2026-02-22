/**
 * TestRail Integration - Public API
 *
 * Usage:
 *   // Import hooks (auto-registers with Cucumber)
 *   import './integrations/testrail/testrail-hooks';
 *
 *   // Or use the utility directly
 *   import { TestRailUtil, STATUS } from './integrations/testrail';
 */

export { TestRailAPIClient, TestRailAPIError } from './testrail-api-client';
export { TestRailUtil, STATUS } from './testrail-util';
export { TestRailConfig, loadTestRailConfig } from './testrail-config';
