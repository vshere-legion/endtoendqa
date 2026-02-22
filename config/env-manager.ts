import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

type Environment = 'dev' | 'staging' | 'rc' | 'uat' | 'prod';

const VALID_ENVS: Environment[] = ['dev', 'staging', 'rc', 'uat', 'prod'];
const REQUIRED_VARS = ['BASE_URL', 'API_BASE_URL', 'TIMEOUT'];

export function loadEnvConfig(envName?: string): void {
  const env = (envName || process.env.TEST_ENV || 'dev') as Environment;

  if (!VALID_ENVS.includes(env)) {
    throw new Error(`Invalid environment: "${env}". Valid: ${VALID_ENVS.join(', ')}`);
  }

  const envFilePath = path.resolve(__dirname, 'environments', `${env}.env`);

  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Environment file not found: ${envFilePath}`);
  }

  const result = dotenv.config({ path: envFilePath });
  if (result.error) {
    throw new Error(`Failed to load ${env}.env: ${result.error.message}`);
  }

  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required vars in ${env}.env: ${missing.join(', ')}`);
  }

  process.env.TEST_ENV = env;
  console.log(`Environment loaded: ${env}`);
}

export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Environment variable "${key}" is not set.`);
  }
  return value;
}

export function getCurrentEnv(): Environment {
  return (process.env.TEST_ENV || 'dev') as Environment;
}
