/**
 * TestRail Configuration
 *
 * Port of PropertyMap.java TestRail getters + envCfg.json configuration.
 * Supports loading from config file or environment variables.
 *
 * Original: com.legion.tests.testframework.PropertyMap (TestRail fields)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestRailConfig {
  /** TestRail instance URL (e.g. https://legiontech.testrail.io/) */
  url: string;
  /** TestRail username/email */
  username: string;
  /** TestRail password or API key */
  password: string;
  /** TestRail project ID */
  projectId: string;
  /** TestRail test suite ID */
  suiteId: string;
  /** Pre-existing test run number (optional - if set, results go to this run) */
  runNumber: string;
  /** Whether TestRail integration is enabled */
  enabled: boolean;
  /** Environment name for comments (e.g. "RC", "staging") */
  environment: string;
  /** Enterprise name for comments */
  enterprise: string;
}

/**
 * Load TestRail configuration from config file and environment variables.
 *
 * Priority:
 *   1. Environment variables (highest)
 *   2. Config file (config/testrail.config.json)
 *   3. Default values (lowest)
 *
 * Environment variables:
 *   TESTRAIL_URL          - TestRail instance URL
 *   TESTRAIL_USER         - Username/email
 *   TESTRAIL_PASSWORD     - Password or API key
 *   TESTRAIL_PROJECT_ID   - Project ID
 *   TESTRAIL_SUITE_ID     - Suite ID
 *   TESTRAIL_RUN_NUMBER   - Pre-existing run ID
 *   TESTRAIL_ENABLED      - Enable/disable integration (true/false)
 */
export function loadTestRailConfig(): TestRailConfig {
  // Try to load config file
  let fileConfig: Record<string, any> = {};

  const configPath = path.resolve(
    process.cwd(),
    'config',
    'testrail.config.json'
  );

  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(content);
    } catch (error: any) {
      console.warn(`[TestRail] Failed to load config from ${configPath}: ${error.message}`);
    }
  }

  // Build config with priority: env vars > config file > defaults
  const config: TestRailConfig = {
    url: process.env.TESTRAIL_URL
      || fileConfig.TESTRAIL_URL
      || fileConfig.url
      || 'https://legiontech.testrail.io/',

    username: process.env.TESTRAIL_USER
      || fileConfig.TESTRAIL_USER
      || fileConfig.username
      || fileConfig.testRailUsername
      || '',

    password: process.env.TESTRAIL_PASSWORD
      || fileConfig.TESTRAIL_PASSWORD
      || fileConfig.password
      || fileConfig.testRailPassword
      || '',

    projectId: process.env.TESTRAIL_PROJECT_ID
      || fileConfig.TESTRAIL_PROJECT_ID
      || fileConfig.projectId
      || fileConfig.testRailProjectId
      || '2',

    suiteId: process.env.TESTRAIL_SUITE_ID
      || fileConfig.TESTRAIL_SUITE_ID
      || fileConfig.suiteId
      || fileConfig.SUITE_ID
      || '890',

    runNumber: process.env.TESTRAIL_RUN_NUMBER
      || fileConfig.TESTRAIL_RUN_NUMBER
      || fileConfig.runNumber
      || '',

    enabled: toBool(
      process.env.TESTRAIL_ENABLED
      ?? fileConfig.TESTRAIL_ENABLED
      ?? fileConfig.enabled
      ?? 'false'
    ),

    environment: process.env.TEST_ENV
      || fileConfig.environment
      || 'staging',

    enterprise: process.env.ENTERPRISE
      || fileConfig.enterprise
      || '',
  };

  if (config.enabled) {
    console.log('[TestRail] Integration ENABLED');
    console.log(`[TestRail] URL: ${config.url}`);
    console.log(`[TestRail] Project: ${config.projectId}, Suite: ${config.suiteId}`);

    if (config.runNumber) {
      console.log(`[TestRail] Run Number: ${config.runNumber}`);
    }
  }

  return config;
}

function toBool(value: string | boolean): boolean {
  if (typeof value === 'boolean') return value;
  return value.toLowerCase() === 'true';
}
