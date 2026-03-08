/**
 * NavigationComponent — Shared sidebar navigation & sub-tab locators.
 *
 * Composable component (NOT a page object). Receives a Page instance
 * and provides locators + methods for sidebar menu items and sub-tabs.
 *
 * Consolidates duplicated locators from:
 *   - teams/sch/pages/P2PSchedulePage.ts (lines 45-59)
 *   - teams/sch/pages/P2PAnalyticsPage.ts (lines 87-99)
 *   - teams/sch/pages/SchedulePage.ts (lines 101-105)
 */

import { Page, Locator } from '@playwright/test';

export type MenuItem = 'schedule' | 'dashboard' | 'team' | 'compliance' | 'timesheet';
export type SubTab = 'overview' | 'schedule';

export class NavigationComponent {
  constructor(private readonly page: Page) {}

  // ─── Sidebar Menu Items ─────────────────────────────────────

  readonly menuItems = {
    schedule: (): Locator =>
      this.page.locator('.console-navigation-item', { hasText: 'Schedule' }),

    dashboard: (): Locator =>
      this.page.locator('.console-navigation-item', { hasText: 'Dashboard' }),

    team: (): Locator =>
      this.page.locator('.console-navigation-item', { hasText: 'Team' })
        .or(this.page.locator('.console-navigation-item', { hasText: 'Roster' })),

    compliance: (): Locator =>
      this.page.locator('.navigation-menu-compliance-icon')
        .or(this.page.locator('.console-navigation-item', { hasText: 'Compliance' })),

    timesheet: (): Locator =>
      this.page.locator('.console-navigation-item', { hasText: 'Timesheet' }),
  };

  // ─── Sub-Navigation Tabs ────────────────────────────────────

  readonly subTabs = {
    all: (): Locator =>
      this.page.locator('div.sub-navigation-view-link'),

    active: (): Locator =>
      this.page.locator('div.sub-navigation-view-link.active'),

    overview: (): Locator =>
      this.page.locator('div.sub-navigation-view-link', { hasText: 'Overview' }),

    schedule: (): Locator =>
      this.page.locator('div.sub-navigation-view-link', { hasText: 'Schedule' }),
  };

  // ─── Methods ────────────────────────────────────────────────

  async navigateTo(item: MenuItem): Promise<void> {
    const locator = this.menuItems[item]();
    await locator.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickSubTab(tab: SubTab): Promise<void> {
    const locator = this.subTabs[tab]();
    await locator.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getActiveSubTab(): Promise<string> {
    const active = this.subTabs.active();
    const text = await active.textContent();
    return text?.trim() || '';
  }

  async isMenuItemVisible(item: MenuItem, timeout = 3000): Promise<boolean> {
    try {
      await this.menuItems[item]().waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }
}
