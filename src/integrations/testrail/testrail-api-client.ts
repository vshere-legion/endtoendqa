/**
 * TestRail API Client for TypeScript
 *
 * Port of Gurock's APIClient.java from the Selenium + Cucumber framework.
 * Uses axios for HTTP communication with TestRail API v2.
 *
 * Original: com.legion.test.testrail.APIClient
 *
 * @see http://docs.gurock.com/testrail-api2/start
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class TestRailAPIError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 0) {
    super(message);
    this.name = 'TestRailAPIError';
    this.statusCode = statusCode;
  }
}

export class TestRailAPIClient {
  private baseUrl: string;
  private user: string;
  private password: string;
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(baseUrl: string, user: string, password: string, maxRetries: number = 3) {
    // Ensure base URL ends with /
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }

    this.baseUrl = baseUrl + 'index.php?/api/v2/';
    this.user = user;
    this.password = password;
    this.maxRetries = maxRetries;
    this.retryDelayMs = 2000;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: this.user,
        password: this.password,
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Send GET request to TestRail API
   *
   * @param uri - API endpoint (e.g. 'get_case/1')
   * @returns Parsed JSON response
   */
  async sendGet(uri: string): Promise<any> {
    return this.executeWithRetry(async () => {
      const response: AxiosResponse = await this.client.get(uri);
      return response.data;
    });
  }

  /**
   * Send POST request to TestRail API
   *
   * @param uri - API endpoint (e.g. 'add_case/1')
   * @param data - Request body data
   * @returns Parsed JSON response
   */
  async sendPost(uri: string, data: Record<string, any>): Promise<any> {
    return this.executeWithRetry(async () => {
      const response: AxiosResponse = await this.client.post(uri, data);
      return response.data;
    });
  }

  /**
   * Execute API request with retry logic
   *
   * Retries on transient failures (network errors, 429 rate limits, 5xx server errors)
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Extract status code from axios error
        const statusCode = error.response?.status || 0;
        const errorMessage = error.response?.data?.error || error.message;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          throw new TestRailAPIError(
            `TestRail API returned HTTP ${statusCode}: ${errorMessage}`,
            statusCode
          );
        }

        // Retry on rate limit, server errors, or network errors
        if (attempt < this.maxRetries) {
          const delay = statusCode === 429
            ? this.retryDelayMs * attempt * 2  // Longer backoff for rate limits
            : this.retryDelayMs * attempt;

          console.warn(
            `[TestRail] Request failed (attempt ${attempt}/${this.maxRetries}): ${errorMessage}. ` +
            `Retrying in ${delay}ms...`
          );

          await this.sleep(delay);
        }
      }
    }

    throw lastError || new TestRailAPIError('Request failed after all retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
