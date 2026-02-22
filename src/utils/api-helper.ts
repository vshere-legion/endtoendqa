/**
 * Enterprise API Helper — robust HTTP client with retry logic, token refresh,
 * response logging, request/response interceptors, and error classification.
 *
 * Features:
 *   - Automatic retry with exponential backoff for transient failures
 *   - Token refresh on 401 responses
 *   - Request/response logging with correlation IDs
 *   - Response time tracking
 *   - Error classification (transient vs permanent)
 *   - Request interceptors for custom headers, auth injection
 *   - Response validation helpers
 */

import { APIRequestContext, APIResponse } from '@playwright/test';
import { Logger } from './Logger';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
}

export interface ApiRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOnStatuses: number[];
}

export type TokenRefreshFn = () => Promise<string>;
export type RequestInterceptor = (config: { url: string; headers: Record<string, string> }) => void;
export type ResponseInterceptor = (response: APIResponse, durationMs: number) => void;

const DEFAULT_RETRY_CONFIG: ApiRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryOnStatuses: [408, 429, 500, 502, 503, 504],
};

const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export class ApiHelper {
  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  private retryConfig: ApiRetryConfig;
  private logger: Logger;
  private tokenRefreshFn: TokenRefreshFn | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(
    private request: APIRequestContext,
    options?: {
      logger?: Logger;
      retryConfig?: Partial<ApiRetryConfig>;
    },
  ) {
    this.logger = options?.logger ?? new Logger('ApiHelper');
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  }

  // ─── Configuration ───────────────────────────────────────

  setAuthToken(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
    this.logger.debug('Auth token set');
  }

  setHeader(key: string, value: string): void {
    this.headers[key] = value;
  }

  setTokenRefreshHandler(fn: TokenRefreshFn): void {
    this.tokenRefreshFn = fn;
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // ─── HTTP Methods ────────────────────────────────────────

  async get<T = unknown>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
    return this.executeWithRetry('GET', endpoint, undefined, options);
  }

  async post<T = unknown>(
    endpoint: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeWithRetry('POST', endpoint, body, options);
  }

  async put<T = unknown>(
    endpoint: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeWithRetry('PUT', endpoint, body, options);
  }

  async patch<T = unknown>(
    endpoint: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeWithRetry('PATCH', endpoint, body, options);
  }

  async delete<T = unknown>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
    return this.executeWithRetry('DELETE', endpoint, undefined, options);
  }

  // ─── Response Validation Helpers ─────────────────────────

  static assertOk(result: ApiResult<unknown>, message?: string): void {
    if (!result.ok) {
      throw new Error(
        message ||
          `API call failed: ${result.method} ${result.url} → ${result.status} (${result.statusText})`,
      );
    }
  }

  static assertStatus(result: ApiResult<unknown>, expectedStatus: number): void {
    if (result.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus} but got ${result.status}: ${result.method} ${result.url}`,
      );
    }
  }

  // ─── Internal: Retry Engine ──────────────────────────────

  private async executeWithRetry<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.execute<T>(method, endpoint, body, options);

        // Retry on transient status codes
        if (
          this.retryConfig.retryOnStatuses.includes(result.status) &&
          attempt < this.retryConfig.maxRetries
        ) {
          const delay = this.calculateBackoff(attempt);
          this.logger.warn(
            `Retryable status ${result.status} on ${method} ${endpoint}. Retry ${attempt + 1}/${this.retryConfig.maxRetries} in ${delay}ms`,
          );
          await this.sleep(delay);
          continue;
        }

        // Token refresh on 401
        if (result.status === 401 && this.tokenRefreshFn && attempt < this.retryConfig.maxRetries) {
          this.logger.info('Got 401 — attempting token refresh');
          try {
            const newToken = await this.tokenRefreshFn();
            this.setAuthToken(newToken);
            this.logger.info('Token refreshed, retrying request');
            continue;
          } catch (refreshError: any) {
            this.logger.error('Token refresh failed', refreshError);
            return result;
          }
        }

        return result;
      } catch (error: any) {
        lastError = error;
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateBackoff(attempt);
          this.logger.warn(
            `Request error on ${method} ${endpoint}: ${error.message}. Retry ${attempt + 1}/${this.retryConfig.maxRetries} in ${delay}ms`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `API call failed after ${this.retryConfig.maxRetries + 1} attempts: ${method} ${endpoint}. Last error: ${lastError?.message}`,
    );
  }

  private async execute<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResult<T>> {
    const mergedHeaders = { ...this.headers, ...options?.headers };

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      interceptor({ url: endpoint, headers: mergedHeaders });
    }

    // Build URL with query params
    let url = endpoint;
    if (options?.params) {
      const searchParams = new URLSearchParams(options.params);
      url += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }

    this.logger.debug(`→ ${method} ${url}`, body ? { bodySize: JSON.stringify(body).length } : undefined);

    const startTime = Date.now();

    const requestOpts: any = {
      headers: mergedHeaders,
      timeout: options?.timeout,
    };
    if (body !== undefined) {
      requestOpts.data = body;
    }

    let response: APIResponse;
    switch (method) {
      case 'GET':
        response = await this.request.get(url, requestOpts);
        break;
      case 'POST':
        response = await this.request.post(url, requestOpts);
        break;
      case 'PUT':
        response = await this.request.put(url, requestOpts);
        break;
      case 'PATCH':
        response = await this.request.patch(url, requestOpts);
        break;
      case 'DELETE':
        response = await this.request.delete(url, requestOpts);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const durationMs = Date.now() - startTime;

    // Parse response body
    let responseBody: T | null = null;
    try {
      responseBody = (await response.json()) as T;
    } catch {
      // Not JSON — that's fine
    }

    const result: ApiResult<T> = {
      ok: response.ok(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      body: responseBody,
      durationMs,
      method,
      url,
      isTransientError: TRANSIENT_STATUS_CODES.has(response.status()),
    };

    // Log result
    const logLevel = result.ok ? 'info' : 'warn';
    this.logger[logLevel](`← ${result.status} ${method} ${url} (${durationMs}ms)`, {
      status: result.status,
      durationMs,
    });

    // Run response interceptors
    for (const interceptor of this.responseInterceptors) {
      interceptor(response, durationMs);
    }

    return result;
  }

  private calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(2, attempt),
      this.retryConfig.maxDelayMs,
    );
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Typed API response wrapper
 */
export interface ApiResult<T> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: T | null;
  durationMs: number;
  method: string;
  url: string;
  isTransientError: boolean;
}
