import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

/**
 * Base Page Object
 * Contains common methods and utilities for all page objects
 * Similar to BasePage.java in the Selenium framework
 */
export class BasePage {
  protected page: Page;
  protected timeout: number = 30000;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    Logger.info(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    // await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for element to be visible
   */
  async waitForElementVisible(
    locator: Locator,
    timeout: number = this.timeout
  ): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementHidden(
    locator: Locator,
    timeout: number = this.timeout
  ): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click on element with wait
   */
  async click(locator: Locator, options?: { force?: boolean; timeout?: number }): Promise<void> {
    await this.waitForElementVisible(locator, options?.timeout);
    await locator.click({ force: options?.force, timeout: options?.timeout });
    Logger.debug(`Clicked on element`);
  }

  /**
   * Double click on element
   */
  async doubleClick(locator: Locator): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.dblclick();
    Logger.debug(`Double clicked on element`);
  }

  /**
   * Fill input field
   */
  async fill(locator: Locator, text: string): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.fill(text);
    Logger.debug(`Filled text: ${text}`);
  }

  /**
   * Type text with delay (simulates human typing)
   */
  async type(locator: Locator, text: string, delay: number = 50): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.type(text, { delay });
    Logger.debug(`Typed text: ${text}`);
  }

  /**
   * Clear input field
   */
  async clear(locator: Locator): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.clear();
    Logger.debug(`Cleared input field`);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(locator: Locator, value: string): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.selectOption(value);
    Logger.debug(`Selected option: ${value}`);
  }

  /**
   * Check checkbox or radio button
   */
  async check(locator: Locator): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.check();
    Logger.debug(`Checked element`);
  }

  /**
   * Uncheck checkbox
   */
  async uncheck(locator: Locator): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.uncheck();
    Logger.debug(`Unchecked element`);
  }

  /**
   * Get text content from element
   */
  async getText(locator: Locator): Promise<string> {
    await this.waitForElementVisible(locator);
    const text = await locator.textContent();
    Logger.debug(`Retrieved text: ${text}`);
    return text || '';
  }

  /**
   * Get inner text from element
   */
  async getInnerText(locator: Locator): Promise<string> {
    await this.waitForElementVisible(locator);
    const text = await locator.innerText();
    Logger.debug(`Retrieved inner text: ${text}`);
    return text;
  }

  /**
   * Get attribute value
   */
  async getAttribute(locator: Locator, attribute: string): Promise<string | null> {
    await this.waitForElementVisible(locator);
    return await locator.getAttribute(attribute);
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator, timeout: number = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(locator: Locator): Promise<boolean> {
    await this.waitForElementVisible(locator);
    return await locator.isEnabled();
  }

  /**
   * Check if element is checked
   */
  async isChecked(locator: Locator): Promise<boolean> {
    await this.waitForElementVisible(locator);
    return await locator.isChecked();
  }

  /**
   * Scroll to element
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    Logger.debug(`Scrolled to element`);
  }

  /**
   * Scroll to top of page
   */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    Logger.debug(`Scrolled to top`);
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    Logger.debug(`Scrolled to bottom`);
  }

  /**
   * Hover over element
   */
  async hover(locator: Locator): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.hover();
    Logger.debug(`Hovered over element`);
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
    Logger.debug(`Pressed key: ${key}`);
  }

  /**
   * Wait for specific amount of time
   */
  async wait(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Wait for page load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    Logger.debug(`Page loaded`);
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    Logger.info(`Taking screenshot: ${name}`);
    return await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Execute JavaScript
   */
  async executeScript<T>(script: string, ...args: any[]): Promise<T> {
    return await this.page.evaluate(script, ...args);
  }

  /**
   * Get element count
   */
  async getElementCount(locator: Locator): Promise<number> {
    return await locator.count();
  }

  /**
   * Wait for element to have specific text
   */
  async waitForText(locator: Locator, text: string, timeout: number = this.timeout): Promise<void> {
    await expect(locator).toHaveText(text, { timeout });
  }

  /**
   * Wait for element to contain text
   */
  async waitForTextContains(
    locator: Locator,
    text: string,
    timeout: number = this.timeout
  ): Promise<void> {
    await expect(locator).toContainText(text, { timeout });
  }

  /**
   * Verify element is visible
   */
  async verifyElementVisible(locator: Locator, timeout: number = this.timeout): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
    Logger.pass(`Element is visible`);
  }

  /**
   * Verify element is hidden
   */
  async verifyElementHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
    Logger.pass(`Element is hidden`);
  }

  /**
   * Verify text equals
   */
  async verifyText(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toHaveText(expectedText);
    Logger.pass(`Text verified: ${expectedText}`);
  }

  /**
   * Verify text contains
   */
  async verifyTextContains(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toContainText(expectedText);
    Logger.pass(`Text contains: ${expectedText}`);
  }

  /**
   * Upload file
   */
  async uploadFile(locator: Locator, filePath: string): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.setInputFiles(filePath);
    Logger.debug(`Uploaded file: ${filePath}`);
  }

  /**
   * Handle alert dialog
   */
  async handleAlert(action: 'accept' | 'dismiss', promptText?: string): Promise<void> {
    this.page.on('dialog', async dialog => {
      Logger.debug(`Alert dialog: ${dialog.message()}`);
      if (action === 'accept') {
        await dialog.accept(promptText);
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Switch to iframe
   */
  async switchToFrame(locator: Locator): Promise<Page> {
    const frameElement = await locator.elementHandle();
    if (!frameElement) {
      throw new Error('Frame element not found');
    }
    const frame = await frameElement.contentFrame();
    if (!frame) {
      throw new Error('Could not get frame content');
    }
    return frame as any;
  }

  /**
   * Get new page after popup/new tab
   */
  async getNewPage(): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
    ]);
    await newPage.waitForLoadState();
    return newPage;
  }

  /**
   * Close current page
   */
  async closePage(): Promise<void> {
    await this.page.close();
    Logger.debug(`Closed page`);
  }

  /**
   * Check if element is BOTH visible AND enabled
   * This ensures element is actually actionable
   */
  async isVisibleAndEnabled(locator: Locator, timeout: number = 5000): Promise<boolean> {
    try {
      // Check 1: Is visible?
      const isVisible = await locator.isVisible({ timeout });
      if (!isVisible) {
        return false;
      }

      // Check 2: Is enabled? (not disabled)
      const isEnabled = await locator.isEnabled({ timeout: 1000 });

      return isVisible && isEnabled;

    } catch (error) {
      return false;
    }
  }
}
