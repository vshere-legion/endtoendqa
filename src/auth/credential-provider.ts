/**
 * CredentialProvider Interface
 *
 * Abstracts credential lookup so DataService, AWS Secrets Manager, or any
 * other source can be swapped in auth.steps.ts without changing call sites.
 *
 * DataService already satisfies this interface — adding `implements CredentialProvider`
 * to its class declaration is the only change needed there.
 *
 * To add a new provider (e.g. AWS Secrets Manager):
 *   1. Create AwsCredentialProvider implements CredentialProvider
 *   2. Update TestContext.dataService to return the new provider when configured
 *   3. No changes needed in auth.steps.ts
 */

import { UserData } from '../data/models';

export interface CredentialProvider {
  /** Returns true when credential data has been loaded and is available. */
  hasData(): boolean;

  /** Resolve a UI login user by userType (e.g. "Admin", "StoreManager"). */
  getUILoginUserBy(userType: string): UserData;

  /**
   * Resolve a UI login user scoped to a test group.
   * Falls back to ungrouped users if no grouped match is found.
   */
  getUILoginUserByTypeAndGroup(userType: string, group: string): UserData;

  /** Release selected credentials so they can be reused by other workers. */
  releaseLocationAndUsers(): void;
}
