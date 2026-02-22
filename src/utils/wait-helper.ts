import { Page } from '@playwright/test';

export async function waitForPageLoad(page: Page, timeout = 30000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout });
}

export async function waitForNetworkIdle(page: Page, timeout = 30000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function waitForUrlChange(page: Page, urlPart: string, timeout = 30000): Promise<void> {
  await page.waitForURL(`**/*${urlPart}*`, { timeout });
}

export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`[retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
