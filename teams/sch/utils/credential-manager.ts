/**
 * @deprecated Use DataService instead (src/data/data-service.ts).
 *
 * Credentials are now stored in test-data/users/user_loc_{ENTERPRISE}_{ENV}.json
 * and resolved via DataService.getUILoginUserByTypeAndGroup(userType, group).
 *
 * The credentials.json file this class reads has been archived to credentials.json.bak.
 * This file is kept temporarily for any code that still imports CredentialManager.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

/** @deprecated Use UserData from src/data/models.ts instead */
export interface Credential {
  username: string;
  password: string;
  location: string;
  role?: string;
  testClass?: string;
}

export class CredentialManager {
  private credentialsData: any;

  constructor(credentialsFilePath?: string) {
    const filePath = credentialsFilePath ||
      path.join(__dirname, '../test-data/credentials.json');
    this.loadCredentials(filePath);
  }

  private loadCredentials(filePath: string): void {
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      this.credentialsData = JSON.parse(rawData);
      Logger.info(`Loaded credentials from: ${filePath}`);
      Logger.info(`Total credential entries: ${Object.keys(this.credentialsData).length}`);
    } catch (error) {
      Logger.error('Failed to load credentials', error as Error);
      throw new Error(`Could not load credentials: ${error}`);
    }
  }

  /**
   * Get credential for specific test class and role
   * Pattern: {Role}Of{TestClassName}
   */
  getCredentialForTest(testClassName: string, role: string): Credential {
    const credentialKey = `${role}Of${testClassName}`;
    Logger.info(`Looking for credential key: ${credentialKey}`);

    if (!this.credentialsData[credentialKey]) {
      Logger.error(`Credential not found: ${credentialKey}`);
      throw new Error(`Credential not found for: ${credentialKey}`);
    }

    const credArray = this.credentialsData[credentialKey];

    if (!Array.isArray(credArray) || credArray.length === 0) {
      throw new Error(`Invalid credential format for: ${credentialKey}. Expected array format.`);
    }

    const credData = credArray[0];

    if (!Array.isArray(credData) || credData.length < 3) {
      throw new Error(`Invalid credential data for: ${credentialKey}. Expected [username, password, location]`);
    }

    const credential: Credential = {
      username: credData[0],
      password: credData[1],
      location: credData[2],
      role: role,
      testClass: testClassName
    };

    Logger.pass(`Assigned: ${credential.username} (${role})`);
    Logger.info(`Location: ${credential.location}`);

    return credential;
  }

  /**
   * Get credential by exact key
   */
  getCredentialByKey(key: string): Credential {
    if (!this.credentialsData[key]) {
      throw new Error(`Credential key not found: ${key}`);
    }

    const credArray = this.credentialsData[key];
    if (!Array.isArray(credArray) || credArray.length === 0) {
      throw new Error(`Invalid credential format for: ${key}`);
    }

    const credData = credArray[0];
    if (!Array.isArray(credData) || credData.length < 3) {
      throw new Error(`Invalid credential data for: ${key}`);
    }

    return {
      username: credData[0],
      password: credData[1],
      location: credData[2]
    };
  }

  hasCredentialForTest(testClassName: string, role: string): boolean {
    return this.credentialsData.hasOwnProperty(`${role}Of${testClassName}`);
  }
}
