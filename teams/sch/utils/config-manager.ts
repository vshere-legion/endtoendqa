import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * ConfigManager - Singleton config manager matching the source POM framework interface.
 * Loads from .env files and environment variables.
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private configMap: Map<string, string>;

  private constructor() {
    this.configMap = new Map();
    this.loadConfiguration();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfiguration(): void {
    // Load .env file from project root
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }

    // Load .env.local if exists
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(localEnvPath)) {
      dotenv.config({ path: localEnvPath, override: true });
    }

    // Store all environment variables
    Object.keys(process.env).forEach(key => {
      if (process.env[key]) {
        this.configMap.set(key, process.env[key]!);
      }
    });
  }

  get(key: string, defaultValue?: string): string {
    return this.configMap.get(key) || defaultValue || '';
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key);
    return value ? parseInt(value, 10) : (defaultValue || 0);
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key);
    if (!value) return defaultValue || false;
    return value.toLowerCase() === 'true' || value === '1';
  }

  getCompleteURL(): string {
    const baseUrl = this.get('BASE_URL');
    const enterprise = this.get('ENTERPRISE_NAME');

    if (!baseUrl) {
      throw new Error('BASE_URL is not configured. Set it in .env file.');
    }
    if (!enterprise) {
      throw new Error('ENTERPRISE_NAME is not configured. Set it in .env file.');
    }

    if (baseUrl.includes('?enterprise=')) {
      return baseUrl;
    }

    const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // Avoid doubling /legion/ if BASE_URL already includes it
    const path = cleanUrl.endsWith('/legion') ? '' : '/legion';
    return `${cleanUrl}${path}/?enterprise=${enterprise}`;
  }

  getBaseURL(): string {
    return this.getCompleteURL();
  }

  getAPIBaseURL(): string {
    return this.get('API_BASE_URL', '');
  }

  getDefaultCredentials(): { username: string; password: string } {
    const username = this.get('DEFAULT_USERNAME');
    const password = this.get('DEFAULT_PASSWORD');
    if (!username || !password) {
      throw new Error('DEFAULT_USERNAME and DEFAULT_PASSWORD must be configured.');
    }
    return { username, password };
  }

  getEnterpriseConfig(): { name: string; id: string } {
    const name = this.get('ENTERPRISE_NAME');
    const id = this.get('ENTERPRISE_ID');
    if (!name) {
      throw new Error('ENTERPRISE_NAME must be configured.');
    }
    return { name, id: id || '' };
  }
}

export const config = ConfigManager.getInstance();
