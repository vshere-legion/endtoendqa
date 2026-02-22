/**
 * Enterprise BasePage — all page objects extend this.
 *
 * Features:
 *   - Smart waits: auto-wait for network idle, element stability
 *   - Action retry: retries flaky actions with configurable attempts
 *   - Action logging: every interaction logged with timing
 *   - Screenshot on failure: auto-captures on action errors
 *   - Locator builder: chainable, readable locator construction
 *   - Table helpers: read table data, find rows, extract columns
 *   - iframe support: switch to/from iframes
 *   - Soft assertions: collect failures without stopping the test
 */

import { Page, Locator, FrameLocator, Dialog, expect } from '@playwright/test';
import { Logger } from '../../utils/Logger';

export interface ActionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_ACTION_TIMEOUT = 15000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 500;

export class BasePage {
  protected logger: Logger;

  constructor(
    protected readonly page: Page,
    pageName?: string,
  ) {
    this.logger = new Logger(pageName || this.constructor.name);
  }

  // ─── Navigation ──────────────────────────────────────────

  async navigateTo(path: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    this.logger.info(`Navigating to: ${path}`);
    await this.page.goto(path, {
      waitUntil: options?.waitUntil ?? 'networkidle',
      timeout: 30000,
    });
    this.logger.info('Navigation complete');
  }

  async navigateBack(): Promise<void> {
    this.logger.info('Navigating back');
    await this.page.goBack({ waitUntil: 'networkidle' });
  }

  async reload(): Promise<void> {
    this.logger.info('Reloading page');
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  // ─── Click Actions ───────────────────────────────────────

  async clickElement(selector: string, options?: ActionOptions): Promise<void> {
    await this.retryAction(`Click: ${selector}`, async () => {
      await this.page.locator(selector).click({ timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT });
    }, options);
  }

  async doubleClick(selector: string, options?: ActionOptions): Promise<void> {
    await this.retryAction(`Double-click: ${selector}`, async () => {
      await this.page.locator(selector).dblclick({ timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT });
    }, options);
  }

  async rightClick(selector: string, options?: ActionOptions): Promise<void> {
    await this.retryAction(`Right-click: ${selector}`, async () => {
      await this.page.locator(selector).click({ button: 'right', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT });
    }, options);
  }

  async forceClick(selector: string): Promise<void> {
    this.logger.info(`Force-click: ${selector}`);
    await this.page.locator(selector).click({ force: true });
  }

  async clickByText(text: string, options?: ActionOptions): Promise<void> {
    await this.retryAction(`Click text: "${text}"`, async () => {
      await this.page.getByText(text, { exact: true }).click({ timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT });
    }, options);
  }

  async clickByRole(role: Parameters<Page['getByRole']>[0], name: string, options?: ActionOptions): Promise<void> {
    await this.retryAction(`Click role: ${role} "${name}"`, async () => {
      await this.page.getByRole(role, { name }).click({ timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT });
    }, options);
  }

  // ─── Form Interactions ───────────────────────────────────

  async fillField(selector: string, value: string, options?: ActionOptions): Promise<void> {
    await this.retryAction(`Fill: ${selector} = "${value.substring(0, 20)}..."`, async () => {
      const locator = this.page.locator(selector);
      await locator.clear({ timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT });
      await locator.fill(value);
    }, options);
  }

  async typeText(selector: string, text: string, delay = 50): Promise<void> {
    this.logger.info(`Type: ${selector} = "${text.substring(0, 20)}..."`);
    await this.page.locator(selector).pressSequentially(text, { delay });
  }

  async clearField(selector: string): Promise<void> {
    this.logger.info(`Clear: ${selector}`);
    await this.page.locator(selector).clear();
  }

  async selectDropdown(selector: string, value: string, options?: ActionOptions): Promise<void> {
    await this.retryAction(`Select: ${selector} = "${value}"`, async () => {
      await this.page.locator(selector).selectOption(value, { timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT });
    }, options);
  }

  async selectDropdownByLabel(selector: string, label: string): Promise<void> {
    this.logger.info(`Select by label: ${selector} = "${label}"`);
    await this.page.locator(selector).selectOption({ label });
  }

  async checkCheckbox(selector: string): Promise<void> {
    this.logger.info(`Check: ${selector}`);
    await this.page.locator(selector).check();
  }

  async uncheckCheckbox(selector: string): Promise<void> {
    this.logger.info(`Uncheck: ${selector}`);
    await this.page.locator(selector).uncheck();
  }

  async setCheckbox(selector: string, checked: boolean): Promise<void> {
    this.logger.info(`Set checkbox: ${selector} = ${checked}`);
    await this.page.locator(selector).setChecked(checked);
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    this.logger.info(`Upload: ${selector} ← ${filePath}`);
    await this.page.locator(selector).setInputFiles(filePath);
  }

  // ─── Element State ───────────────────────────────────────

  async getText(selector: string): Promise<string> {
    return (await this.page.locator(selector).textContent()) ?? '';
  }

  async getInputValue(selector: string): Promise<string> {
    return this.page.locator(selector).inputValue();
  }

  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return this.page.locator(selector).getAttribute(attribute);
  }

  async isVisible(selector: string, timeout?: number): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout: timeout ?? 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isEnabled(selector: string): Promise<boolean> {
    return this.page.locator(selector).isEnabled();
  }

  async isChecked(selector: string): Promise<boolean> {
    return this.page.locator(selector).isChecked();
  }

  async getElementCount(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }

  async getAllTexts(selector: string): Promise<string[]> {
    return this.page.locator(selector).allTextContents();
  }

  // ─── Wait Helpers ────────────────────────────────────────

  async waitForElement(
    selector: string,
    state: 'visible' | 'hidden' | 'attached' | 'detached' = 'visible',
    timeout?: number,
  ): Promise<void> {
    this.logger.debug(`Wait for: ${selector} [${state}]`);
    await this.page.locator(selector).waitFor({ state, timeout: timeout ?? DEFAULT_ACTION_TIMEOUT });
  }

  async waitForNetworkIdle(timeout = 10000): Promise<void> {
    this.logger.debug('Waiting for network idle');
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async waitForPageLoad(timeout = 30000): Promise<void> {
    this.logger.debug('Waiting for page load');
    await this.page.waitForLoadState('load', { timeout });
  }

  async waitForUrl(urlPattern: string | RegExp, timeout = 15000): Promise<void> {
    this.logger.debug(`Waiting for URL: ${urlPattern}`);
    await this.page.waitForURL(urlPattern, { timeout });
  }

  async waitForResponse(urlPattern: string | RegExp, timeout = 15000): Promise<void> {
    this.logger.debug(`Waiting for response: ${urlPattern}`);
    await this.page.waitForResponse(urlPattern, { timeout });
  }

  async waitMs(ms: number): Promise<void> {
    this.logger.debug(`Waiting ${ms}ms`);
    await this.page.waitForTimeout(ms);
  }

  // ─── Scroll & Hover ──────────────────────────────────────

  async scrollToElement(selector: string): Promise<void> {
    this.logger.debug(`Scroll to: ${selector}`);
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async hoverElement(selector: string): Promise<void> {
    this.logger.debug(`Hover: ${selector}`);
    await this.page.locator(selector).hover();
  }

  async dragAndDrop(source: string, target: string): Promise<void> {
    this.logger.info(`Drag: ${source} → ${target}`);
    await this.page.locator(source).dragTo(this.page.locator(target));
  }

  // ─── Keyboard & Mouse ───────────────────────────────────

  async pressKey(key: string): Promise<void> {
    this.logger.debug(`Press key: ${key}`);
    await this.page.keyboard.press(key);
  }

  async pressKeys(selector: string, keys: string): Promise<void> {
    this.logger.debug(`Press keys on ${selector}: ${keys}`);
    await this.page.locator(selector).press(keys);
  }

  // ─── Table Helpers ───────────────────────────────────────

  async getTableData(tableSelector: string): Promise<string[][]> {
    this.logger.debug(`Reading table: ${tableSelector}`);
    return this.page.locator(tableSelector).evaluate((table: HTMLTableElement) => {
      const rows: string[][] = [];
      table.querySelectorAll('tr').forEach((row) => {
        const cells: string[] = [];
        row.querySelectorAll('td, th').forEach((cell) => {
          cells.push((cell as HTMLElement).innerText.trim());
        });
        if (cells.length > 0) rows.push(cells);
      });
      return rows;
    });
  }

  async getTableRowCount(tableSelector: string): Promise<number> {
    return this.page.locator(`${tableSelector} tbody tr`).count();
  }

  async getTableCellText(tableSelector: string, row: number, col: number): Promise<string> {
    return this.getText(`${tableSelector} tbody tr:nth-child(${row}) td:nth-child(${col})`);
  }

  // ─── iframe Support ──────────────────────────────────────

  getFrame(selector: string): FrameLocator {
    this.logger.debug(`Switch to frame: ${selector}`);
    return this.page.frameLocator(selector);
  }

  async clickInFrame(frameSelector: string, elementSelector: string): Promise<void> {
    this.logger.info(`Click in frame: ${frameSelector} → ${elementSelector}`);
    await this.page.frameLocator(frameSelector).locator(elementSelector).click();
  }

  // ─── Dialog Handling ─────────────────────────────────────

  async acceptDialog(expectedMessage?: string): Promise<string> {
    return new Promise((resolve) => {
      this.page.once('dialog', async (dialog: Dialog) => {
        const message = dialog.message();
        this.logger.info(`Dialog accepted: "${message}"`);
        if (expectedMessage) {
          expect(message).toContain(expectedMessage);
        }
        await dialog.accept();
        resolve(message);
      });
    });
  }

  async dismissDialog(): Promise<string> {
    return new Promise((resolve) => {
      this.page.once('dialog', async (dialog: Dialog) => {
        const message = dialog.message();
        this.logger.info(`Dialog dismissed: "${message}"`);
        await dialog.dismiss();
        resolve(message);
      });
    });
  }

  // ─── Screenshots ─────────────────────────────────────────

  async takeScreenshot(name: string): Promise<Buffer> {
    const screenshotPath = `reports/screenshots/${name}-${Date.now()}.png`;
    this.logger.info(`Screenshot: ${screenshotPath}`);
    return this.page.screenshot({ path: screenshotPath, fullPage: true });
  }

  async takeElementScreenshot(selector: string, name: string): Promise<Buffer> {
    const screenshotPath = `reports/screenshots/${name}-${Date.now()}.png`;
    return this.page.locator(selector).screenshot({ path: screenshotPath });
  }

  // ─── Locator Builder ─────────────────────────────────────

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected byRole(role: Parameters<Page['getByRole']>[0], options?: { name?: string | RegExp }): Locator {
    return this.page.getByRole(role, options);
  }

  protected byText(text: string, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  protected byLabel(text: string): Locator {
    return this.page.getByLabel(text);
  }

  protected byPlaceholder(text: string): Locator {
    return this.page.getByPlaceholder(text);
  }

  // ─── Retry Engine ────────────────────────────────────────

  protected async retryAction(
    actionName: string,
    action: () => Promise<void>,
    options?: ActionOptions,
  ): Promise<void> {
    const maxRetries = options?.retries ?? DEFAULT_RETRIES;
    const retryDelay = options?.retryDelay ?? DEFAULT_RETRY_DELAY;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const start = Date.now();
        await action();
        const duration = Date.now() - start;
        this.logger.info(`${actionName} (${duration}ms)`);
        return;
      } catch (error: any) {
        if (attempt === maxRetries) {
          this.logger.error(`${actionName} FAILED after ${maxRetries + 1} attempts`, error);
          // Auto-screenshot on failure
          try {
            await this.takeScreenshot(`failure-${actionName.replace(/[^a-zA-Z0-9]/g, '_')}`);
          } catch {
            // Ignore screenshot errors
          }
          throw error;
        }
        this.logger.warn(
          `${actionName} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. Retrying in ${retryDelay}ms...`,
        );
        await this.page.waitForTimeout(retryDelay);
      }
    }
  }

  // ─── Soft Assertions ─────────────────────────────────────

  private softErrors: string[] = [];

  softAssert(condition: boolean, message: string): void {
    if (!condition) {
      this.logger.warn(`Soft assertion failed: ${message}`);
      this.softErrors.push(message);
    }
  }

  async softExpectVisible(selector: string, message?: string): Promise<void> {
    const visible = await this.isVisible(selector, 3000);
    this.softAssert(visible, message || `Expected ${selector} to be visible`);
  }

  async softExpectText(selector: string, expected: string, message?: string): Promise<void> {
    const actual = await this.getText(selector);
    this.softAssert(
      actual.includes(expected),
      message || `Expected "${selector}" to contain "${expected}" but got "${actual}"`,
    );
  }

  flushSoftAssertions(): void {
    if (this.softErrors.length > 0) {
      const errors = [...this.softErrors];
      this.softErrors = [];
      throw new Error(`Soft assertion failures:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`);
    }
  }
}
