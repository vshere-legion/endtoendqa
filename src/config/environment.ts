/**
 * Environment Configuration
 *
 * Port of PropertyMap.java from the Selenium + Cucumber framework.
 * Loads environment settings from config/env.config.json and environment variables.
 *
 * Original: com.legion.tests.testframework.PropertyMap
 *   - Reads from /envCfg.json (classpath resource)
 *   - getEnvironment(), getEnterprise(), getFileNumber(), getEnvironmentURL()
 *   - getBrowser(), getTimeOutSeconds(), isGridOn(), isLocal()
 *
 * In Playwright:
 *   - Reads from config/env.config.json + .env file + env vars
 *   - Priority: env vars > .env file > config file > defaults
 *   - No Maven property substitution needed (we use env vars directly)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  /** Target environment: STG, EA, EAR, REL, EPH, DEV */
  environment: string;

  /** Enterprise name (used for data file lookup) */
  enterprise: string;

  /** File number suffix for data files (optional) */
  fileNumber: string;

  /** Base URL for the application under test */
  baseUrl: string;

  /** API base URL */
  apiBaseUrl: string;

  /** Auth token endpoint — used by TokenManager for API authentication (Phase 2) */
  authTokenEndpoint: string;

  /** Whether running against a local environment */
  isLocal: boolean;

  /** Implicit wait timeout in seconds */
  timeoutSeconds: number;

  /** Polling interval in seconds */
  pollingSeconds: number;

  /** Whether headless browser mode is on */
  headless: boolean;

  /** Database host — used by DbHelper for direct DB validation (optional) */
  dbHost: string;

  /** Database port (default: 5432) */
  dbPort: number;

  /** Database name */
  dbName: string;

  /** All environment URLs */
  urls: Record<string, string>;
}

/** URL map keyed by environment code */
const DEFAULT_URLS: Record<string, string> = {
  STG: 'https://staging-enterprise.dev.legion.work/',
  EA: 'https://rc-enterprise.dev.legion.work/',
  EAR: 'https://legioncoffee.ear.legion.work/',
  REL: 'https://enterprise.rel.legion.work/',
  EPH: 'https://ephemeral-tna.dev.legion.work/',
  EPHLIP: 'https://ephemeral-lp.dev.legion.work/',
};

/**
 * Load raw config from config/env.config.json (if it exists)
 *
 * Port of: PropertyMap.getPropertiesFromJsonFile("/envCfg.json")
 */
function loadConfigFile(): Record<string, string> {
  const configPath = path.resolve(process.cwd(), 'config', 'env.config.json');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    console.warn(`[EnvConfig] Failed to load config file: ${error.message}`);
    return {};
  }
}

/**
 * Resolve a config value with priority: env var > config file > default
 */
function resolve(envKey: string, fileConfig: Record<string, string>, fileKey: string, defaultValue: string): string {
  return process.env[envKey] || fileConfig[fileKey] || defaultValue;
}

/**
 * Get the base URL for a given environment
 *
 * Port of: PropertyMap.getEnvironmentURL()
 */
function resolveBaseUrl(environment: string, fileConfig: Record<string, string>): string {
  // Check explicit BASE_URL env var first
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // Build URL map from config file + defaults
  const urls: Record<string, string> = { ...DEFAULT_URLS };

  // Override with any URLs from config file
  if (fileConfig['STGURL']) urls['STG'] = fileConfig['STGURL'];
  if (fileConfig['EATURL']) urls['EA'] = fileConfig['EATURL'];
  if (fileConfig['EARURL']) urls['EAR'] = fileConfig['EARURL'];
  if (fileConfig['RELURL']) urls['REL'] = fileConfig['RELURL'];
  if (fileConfig['EPHURL']) urls['EPH'] = fileConfig['EPHURL'];
  if (fileConfig['EPHLIPURL']) urls['EPHLIP'] = fileConfig['EPHLIPURL'];

  const url = urls[environment.toUpperCase()];
  if (!url) {
    console.warn(`[EnvConfig] No URL found for environment: ${environment}. Using STG as fallback.`);
    return urls['STG'] || 'https://staging-enterprise.dev.legion.work/';
  }

  return url;
}

/**
 * Get the full environment configuration
 *
 * Combines config file, env vars, and defaults into a single EnvironmentConfig object.
 *
 * Environment variables (matching the Java Maven properties):
 *   TEST_ENV or ENVIRONMENT    -> environment (STG, EA, EAR, etc.)
 *   ENTERPRISE                 -> enterprise name
 *   FILE_NUMBER                -> data file number suffix
 *   BASE_URL                   -> explicit base URL override
 *   IS_LOCAL                   -> local environment flag
 *   TIMEOUT_SECONDS            -> implicit wait timeout
 *   HEADED                     -> headed mode (inverse of headless)
 *   AUTH_TOKEN_ENDPOINT        -> API auth endpoint for TokenManager
 *   DB_HOST                    -> database host for DbHelper (optional)
 *   DB_PORT                    -> database port (default: 5432)
 *   DB_NAME                    -> database name
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const fileConfig = loadConfigFile();

  const environment = resolve('TEST_ENV', fileConfig, 'ENVIRONMENT', 'STG');
  const enterprise = resolve('ENTERPRISE', fileConfig, 'legion.automation.enterprise.name', '');
  const fileNumber = resolve('FILE_NUMBER', fileConfig, 'FILENUMBER', '');
  const isLocal = resolve('IS_LOCAL', fileConfig, 'legion.environment.local', 'false') === 'true';
  const timeoutSeconds = parseInt(resolve('TIMEOUT_SECONDS', fileConfig, 'legion.timeout.implicit.in.seconds', '60'), 10);
  const pollingSeconds = parseInt(resolve('POLLING_SECONDS', fileConfig, 'legion.timeout.polling.every.seconds', '1'), 10);
  const headless = process.env.HEADED !== 'true';

  const baseUrl = resolveBaseUrl(environment, fileConfig);
  const apiBaseUrl = process.env.API_BASE_URL || fileConfig['API_BASE_URL'] || '';
  const authTokenEndpoint = process.env.AUTH_TOKEN_ENDPOINT || fileConfig['AUTH_TOKEN_ENDPOINT'] || '';
  const dbHost = process.env.DB_HOST || fileConfig['DB_HOST'] || '';
  const dbPort = parseInt(process.env.DB_PORT || fileConfig['DB_PORT'] || '5432', 10);
  const dbName = process.env.DB_NAME || fileConfig['DB_NAME'] || '';

  const config: EnvironmentConfig = {
    environment,
    enterprise,
    fileNumber,
    baseUrl,
    apiBaseUrl,
    authTokenEndpoint,
    isLocal,
    timeoutSeconds,
    pollingSeconds,
    headless,
    dbHost,
    dbPort,
    dbName,
    urls: { ...DEFAULT_URLS },
  };

  return config;
}

/**
 * Singleton cached config (loaded once per process)
 */
let cachedConfig: EnvironmentConfig | null = null;

export function getConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = getEnvironmentConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached config (useful for tests)
 */
export function resetConfig(): void {
  cachedConfig = null;
}
