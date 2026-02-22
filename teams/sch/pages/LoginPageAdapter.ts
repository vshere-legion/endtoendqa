import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';

/**
 * LoginPageAdapter - Ported from source POM framework's LoginPage.
 * Uses battle-tested selectors with .or() fallback strategies.
 */
export class LoginPageAdapter {
  protected page: Page;

  private readonly usernameField: Locator;
  private readonly passwordField: Locator;
  private readonly signInButton: Locator;
  private readonly tosHeading: Locator;
  private readonly tosAcceptButton: Locator;

  private configManager: ConfigManager;

  constructor(page: Page) {
    this.page = page;
    this.configManager = ConfigManager.getInstance();

    this.usernameField = page.locator('input[name="username"]')
      .or(page.getByRole('textbox', { name: 'Email or Username' }))
      .or(page.getByPlaceholder(/email|username/i))
      .first();

    this.passwordField = page.locator('input[name="password"]')
      .or(page.getByRole('textbox', { name: 'Password' }))
      .or(page.locator('input[type="password"]'))
      .first();

    this.signInButton = page.getByTestId('sign-in')
      .or(page.getByRole('button', { name: /sign in|login/i }))
      .first();

    this.tosHeading = page.getByRole('heading', { name: 'Legion Terms of Service' });
    this.tosAcceptButton = page.getByTestId('accept-btn');
  }

  async navigateToLogin(): Promise<void> {
    const url = this.configManager.getCompleteURL();
    Logger.info(`Navigating to: ${url}`);

    await this.page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 90000
    });

    await this.page.waitForLoadState('domcontentloaded');
    Logger.pass('Application initialized successfully');

    const currentUrl = this.page.url();
    Logger.debug(`Current URL after navigation: ${currentUrl}`);

    await this.page.waitForTimeout(2000);
  }

  async login(username: string, password: string): Promise<void> {
    Logger.info(`Logging in as: ${username}`);

    try {
      await this.usernameField.waitFor({ state: 'visible', timeout: 30000 });
      await this.passwordField.waitFor({ state: 'visible', timeout: 10000 });
      await this.signInButton.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      const currentUrl = this.page.url();
      Logger.debug(`Current URL when login form not found: ${currentUrl}`);

      if (currentUrl.includes('/console') || currentUrl.includes('/dashboard')) {
        Logger.pass(`Already logged in - on dashboard (URL: ${currentUrl})`);
        return;
      }

      await this.page.screenshot({
        path: `logs/login-form-not-found-${Date.now()}.png`,
        fullPage: true
      });

      throw new Error(`Login form not visible and not on dashboard. URL: ${currentUrl}`);
    }

    Logger.debug('Filling credentials...');
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);

    Logger.debug('Clicking sign in button...');
    await this.signInButton.click();

    await this.handleTermsOfService();
    await this.page.waitForLoadState('domcontentloaded');

    Logger.pass(`Successfully logged in as: ${username}`);
  }

  private async handleTermsOfService(): Promise<void> {
    try {
      const tosVisible = await this.tosHeading.isVisible({ timeout: 5000 });

      if (tosVisible) {
        Logger.info('Terms of Service modal detected, accepting...');
        await this.tosAcceptButton.click();
        await this.page.waitForLoadState('domcontentloaded');
        Logger.pass('Terms of Service accepted');
      }
    } catch (error) {
      Logger.debug('No Terms of Service modal detected');
    }
  }

  async logout(): Promise<void> {
    try {
      Logger.info('Logging out...');
      const logoutButton = this.page.locator('.fa-sign-out');
      await logoutButton.click();
      await logoutButton.click();
      await this.usernameField.waitFor({ state: 'visible', timeout: 10000 });
      Logger.pass('Successfully logged out');
    } catch (error) {
      Logger.error('Logout failed', error as Error);
      throw error;
    }
  }
}
