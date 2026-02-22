import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TestContext } from '../../fixtures/test-fixtures';

export class DashboardPage extends BasePage {
  private welcomeMessage: Locator;

  constructor(page: Page, context: TestContext) {
    super(page, context);
    this.welcomeMessage = page.locator('.welcome-message');
  }

  async goto() {
    await this.navigateTo('/dashboard');
  }

  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }
}