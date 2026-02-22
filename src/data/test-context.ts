/**
 * Test Context
 *
 * Port of StepsBase.java context management.
 * Provides a type-safe way to share data between Cucumber steps.
 *
 * Original: com.legion.tests.testframework.bdd.StepsBase
 *   - ThreadLocal<Map<ContextKey, Object>> context
 *   - setContext(ContextKey key, Object value)
 *   - getContext(ContextKey key)
 *   - clearContext()
 *
 * In Playwright:
 *   - No ThreadLocal needed (process isolation per worker)
 *   - Context is per-scenario (created fresh in Before hook, cleared in After hook)
 */

import { Page } from '@playwright/test';
import { ContextKey } from './models';
import { DataService } from './data-service';
import { PageManager } from '../pages/page-manager';

export class TestContext {
  private context: Map<string, any> = new Map();
  private _dataService: DataService | null = null;
  private _pageManager: PageManager | null = null;

  /**
   * Set context value
   *
   * Port of: StepsBase.setContext(ContextKey key, Object value)
   */
  setContext(key: ContextKey | string, value: any): void {
    this.context.set(key, value);
  }

  /**
   * Get context value
   *
   * Port of: StepsBase.getContext(ContextKey key)
   */
  getContext<T = any>(key: ContextKey | string): T | undefined {
    return this.context.get(key) as T | undefined;
  }

  /**
   * Get context value (with default)
   */
  getContextOrDefault<T = any>(key: ContextKey | string, defaultValue: T): T {
    const value = this.context.get(key);
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Check if context has a key
   */
  hasContext(key: ContextKey | string): boolean {
    return this.context.has(key);
  }

  /**
   * Clear all context data
   *
   * Port of: StepsBase.clearContext()
   */
  clearContext(): void {
    this.context.clear();
  }

  /**
   * Get or create the PageManager for this feature's Page instance.
   * Lazily creates one PageManager per feature lifecycle.
   */
  getPageManager(page: Page): PageManager {
    if (!this._pageManager) {
      this._pageManager = new PageManager(page);
    }
    return this._pageManager;
  }

  /**
   * Get DataService instance (lazy-loaded, one per scenario).
   *
   * DataService implements CredentialProvider — consumers that only need
   * credential lookup can type their reference as CredentialProvider.
   * To swap the credential source in future, change this getter to return
   * any CredentialProvider implementation without touching auth.steps.ts.
   */
  get dataService(): DataService {
    if (!this._dataService) {
      this._dataService = new DataService();
    }
    return this._dataService;
  }

  /**
   * Release all resources and clear context
   *
   * Port of: Hook.afterAll() -> clearContext() + dataService.releaseLocationAndUsers()
   */
  cleanup(): void {
    if (this._dataService) {
      this._dataService.releaseLocationAndUsers();
    }
    this._pageManager?.clear();
    this._pageManager = null;
    this.clearContext();
  }

  // =========================================================================
  // Convenience getters (Port of LegionStepBase helper methods)
  // =========================================================================

  get userName(): string | undefined {
    return this.getContext(ContextKey.USER_NAME);
  }

  get userPassword(): string | undefined {
    return this.getContext(ContextKey.USER_PASSWORD);
  }

  get enterpriseName(): string | undefined {
    return this.getContext(ContextKey.ENTERPRISE_NAME);
  }

  get locationName(): string | undefined {
    return this.getContext(ContextKey.LOCATION_NAME);
  }

  get tmName(): string | undefined {
    return this.getContext(ContextKey.TM_NAME);
  }

  get tmId(): string | undefined {
    return this.getContext(ContextKey.TM_ID);
  }

  get accessToken(): string | undefined {
    return this.getContext(ContextKey.ACCESS_TOKEN);
  }

  get configuration(): string | undefined {
    return this.getContext(ContextKey.CONFIGURATION);
  }
}
