/**
 * PageManager — Playwright's equivalent of Java's PageFactory.
 *
 * Lazily creates and caches page object instances keyed by their constructor.
 * Each page class is instantiated once per feature (matches the shared Page
 * lifecycle) and reused across all steps/scenarios within that feature.
 *
 * Playwright locators are already lazy (page.locator() doesn't query DOM
 * until an action is performed), so unlike Java's PageFactory there is no
 * need for @FindBy / initElements. The value here is centralized creation
 * and caching — eliminating redundant `new PageObject(page)` calls in
 * every step definition.
 *
 * Usage in step definitions:
 *   const schedulePage = pageManager.get(P2PSchedulePage);
 *
 * Provided as a fixture via test-fixtures.ts → testContext.getPageManager(page).
 */

import { Page } from '@playwright/test';

export class PageManager {
  private readonly cache = new Map<new (...args: any[]) => any, any>();

  constructor(private readonly page: Page) {}

  /**
   * Get or create a cached page object instance.
   *
   * @param PageClass  The page object constructor (e.g., P2PSchedulePage)
   * @param extraArgs  Additional constructor arguments after `page` (rare)
   * @returns Cached instance of PageClass
   *
   * Standard usage (constructor takes only Page):
   *   pageManager.get(P2PSchedulePage)
   *
   * Multi-arg usage (constructor takes Page + extras):
   *   pageManager.get(SomePage, extraArg)
   */
  get<T>(PageClass: new (page: Page, ...args: any[]) => T, ...extraArgs: any[]): T {
    if (!this.cache.has(PageClass)) {
      this.cache.set(PageClass, new PageClass(this.page, ...extraArgs));
    }
    return this.cache.get(PageClass) as T;
  }

  /**
   * Clear the cache.
   * Called on feature change (TestContext.cleanup) or page recovery.
   */
  clear(): void {
    this.cache.clear();
  }
}
