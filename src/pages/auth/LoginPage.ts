import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TestContext } from '../../fixtures/test-fixtures';

export class LoginPage extends BasePage {
  private usernameInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;

  constructor(page: Page, context: TestContext) {
    super(page, context);
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.navigateTo('/login');
  }

  async login(username: string, password: string) {
    this.logger.info(`Logging in as: ${username}`);
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
    
    this.context.userData.username = username;
    this.context.sharedData.set('loginTimestamp', Date.now());
    
    await this.page.waitForURL(/dashboard|home/);
    
    const token = await this.page.evaluate(() => localStorage.getItem('authToken'));
    if (token) {
      this.context.userData.token = token;
    }
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
}