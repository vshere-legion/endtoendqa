/**
 * Auth API Client
 *
 * Shared login API client for API-based authentication.
 * Port of LoginApi.java from the Selenium + Cucumber (CucumberTA) framework.
 *
 * Original: com.legion.api.LoginApi
 *   - consoleUILogin()       -> loginForSessionId()
 *   - newConsoleUILogin()     -> loginForSessionId() (v2 endpoint)
 *   - generateTokenForTimeClocks() -> createOrUpdateToken()
 *   - consoleUILogout()       -> logout()
 *
 * Usage:
 *   const authApi = new AuthApiClient();
 *   const { sessionId } = await authApi.loginForSessionId(enterprise, epId, user, pass);
 *   const { accessToken } = await authApi.createOrUpdateToken(sessionId);
 *   await authApi.logout(sessionId);
 */

export interface ApiLoginResult {
  sessionId: string;
  enterpriseId: string;
  responseData: Record<string, unknown>;
}

export interface TokenResult {
  accessToken: string;
  responseData: Record<string, unknown>;
}

export class AuthApiClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    if (baseURL) {
      this.baseURL = baseURL;
    } else {
      const appBaseUrl = process.env.BASE_URL || 'https://rc-enterprise.dev.legion.work';
      const cleanBase = appBaseUrl.replace(/\/legion\/.*$/, '').replace(/\/$/, '');
      this.baseURL = `${cleanBase}/legion`;
    }
  }

  /**
   * Login via API to get sessionId.
   *
   * Port of: LoginApi.newConsoleUILogin()
   * Endpoint: POST /authentication/v2/user/login
   */
  async loginForSessionId(
    enterpriseName: string,
    enterpriseId: string,
    username: string,
    password: string,
  ): Promise<ApiLoginResult> {
    const url = `${this.baseURL}/authentication/v2/user/login`;
    const body = {
      enterpriseName,
      userName: username,
      passwordPlainText: password,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        enterpriseId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`[AuthApiClient] Login API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();

    // Extract sessionId from response body or headers
    let sessionId =
      responseData.sessionId ||
      responseData.session?.id ||
      responseData.id ||
      responseData.data?.sessionId;

    if (!sessionId) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/(?:sessionId|JSESSIONID|session_id)=([^;]+)/i);
        if (match?.[1]) sessionId = match[1];
      }
      sessionId =
        sessionId ||
        response.headers.get('sessionid') ||
        response.headers.get('session-id') ||
        response.headers.get('x-session-id');
    }

    if (!sessionId) {
      throw new Error(
        `[AuthApiClient] Session ID not found in response. Keys: ${Object.keys(responseData).join(', ')}`,
      );
    }

    console.log(`[AuthApiClient] Login API successful for: ${username}`);
    return { sessionId, enterpriseId, responseData };
  }

  /**
   * Create or update access token for API operations.
   *
   * Port of: LoginApi.generateTokenForTimeClocks()
   * Endpoint: GET /apiInternal/createToken or PUT /apiInternal/updateToken
   */
  async createOrUpdateToken(sessionId: string, apiType: string = 'All'): Promise<TokenResult> {
    // Try creating token first
    try {
      const createUrl = `${this.baseURL}/apiInternal/createToken?apiType=${apiType}`;
      const response = await fetch(createUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', sessionId },
      });

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.accessToken || data.token;
        console.log('[AuthApiClient] Token created successfully');
        return { accessToken, responseData: data };
      }

      const errorData = await response.json().catch(() => ({}));
      const tokenExists =
        (errorData.errorString || '').toLowerCase().includes('already exists') ||
        response.status === 409;

      if (tokenExists) {
        return await this.updateToken(sessionId, apiType);
      }

      throw new Error(`Create Token failed: ${response.status} - ${errorData.errorString || ''}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('already exists')) {
        return await this.updateToken(sessionId, apiType);
      }
      // Fallback: try update
      try {
        return await this.updateToken(sessionId, apiType);
      } catch {
        throw error;
      }
    }
  }

  /**
   * Logout via API.
   *
   * Port of: LoginApi.consoleUILogout()
   * Endpoint: GET /authentication/logout
   */
  async logout(sessionId: string): Promise<void> {
    try {
      await fetch(`${this.baseURL}/authentication/logout`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          sessionid: sessionId,
        },
      });
      console.log('[AuthApiClient] Logout successful');
    } catch {
      // Best-effort logout — don't fail the test
    }
  }

  private async updateToken(sessionId: string, apiType: string = 'All'): Promise<TokenResult> {
    const url = `${this.baseURL}/apiInternal/updateToken?apiType=${apiType}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', sessionId },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`[AuthApiClient] Update Token failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[AuthApiClient] Token updated successfully');
    return { accessToken: data.accessToken || data.token, responseData: data };
  }
}
