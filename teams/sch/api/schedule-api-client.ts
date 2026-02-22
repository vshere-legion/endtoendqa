import { Logger } from '../utils/logger';

/**
 * Schedule API Client - uses native fetch() instead of axios.
 * Ports the 4 critical API methods from the source POM framework.
 */

export interface CreateShiftRecord {
  shiftDate: string;
  locationId: string;
  workRole: string;
  shiftExternalId?: string;
  employeeExternalId?: string;
  deleted?: boolean;
  startMinutes: number;
  endMinutes: number;
  mealBreakStartMinutes?: number;
  mealBreakEndMinutes?: number;
  notes?: string;
}

export class ScheduleApiClient {
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
   * Login API for Session ID
   */
  async loginForSessionId(
    enterpriseName: string,
    enterpriseId: string,
    username: string,
    password: string
  ): Promise<any> {
    Logger.step(`Logging in via API to get sessionId...`);

    const url = `${this.baseURL}/authentication/v2/user/login`;
    const body = {
      enterpriseName: enterpriseName,
      userName: username,
      passwordPlainText: password,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'enterpriseId': enterpriseId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Login API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();

    // Extract sessionId from response
    let sessionId = responseData.sessionId ||
                    responseData.session?.id ||
                    responseData.id ||
                    responseData.data?.sessionId;

    // Check response headers for sessionId
    if (!sessionId) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/(?:sessionId|JSESSIONID|session_id)=([^;]+)/i);
        if (match && match[1]) {
          sessionId = match[1];
        }
      }

      sessionId = sessionId ||
                  response.headers.get('sessionid') ||
                  response.headers.get('session-id') ||
                  response.headers.get('x-session-id');
    }

    if (!sessionId) {
      Logger.warn('Session ID not found in expected locations. Response keys: ' + Object.keys(responseData).join(', '));
      return responseData;
    }

    Logger.pass('Login API successful, sessionId retrieved');
    return { ...responseData, sessionId };
  }

  /**
   * Create or Update Token
   */
  async createOrUpdateToken(sessionId: string, apiType: string = 'All'): Promise<any> {
    Logger.step(`Creating/updating token for session: ${sessionId.substring(0, 8)}...`);

    // Try creating token first (GET)
    try {
      const createUrl = `${this.baseURL}/apiInternal/createToken?apiType=${apiType}`;
      const response = await fetch(createUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'sessionId': sessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        Logger.pass('Token created successfully');
        return data;
      }

      // Check if token already exists
      const errorData = await response.json().catch(() => ({}));
      const errorString = errorData.errorString || '';
      const tokenExists =
        errorString.toLowerCase().includes('token already exists') ||
        errorString.toLowerCase().includes('already exists') ||
        response.status === 409;

      if (tokenExists) {
        Logger.info(`Token already exists, updating instead...`);
        return await this.updateToken(sessionId, apiType);
      }

      throw new Error(`Create Token failed: ${response.status} - ${errorString}`);
    } catch (error: any) {
      if (error.message?.includes('Token already exists') || error.message?.includes('already exists')) {
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

  private async updateToken(sessionId: string, apiType: string = 'All'): Promise<any> {
    const updateUrl = `${this.baseURL}/apiInternal/updateToken?apiType=${apiType}`;
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Update Token failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    Logger.pass('Token updated successfully');
    return data;
  }

  /**
   * Create Shift API
   */
  async createShift(
    accessToken: string,
    shiftData: CreateShiftRecord[],
    enterpriseName: string,
    mode: string = 'ValidateSave'
  ): Promise<any> {
    Logger.step(`Creating ${shiftData.length} shift(s) via API...`);

    const url = `${this.baseURL}/v2/shifts`;
    const requestBody = {
      records: shiftData,
      mode: mode,
    };

    const requestHeaders: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'Legion-Version': '2022-08-01',
      'Legion-Enterprise': enterpriseName,
      'accessToken': accessToken,
    };

    Logger.info(`CREATE SHIFT API: POST ${url}`);
    Logger.info(`Request Body: ${JSON.stringify(requestBody, null, 2)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      Logger.error(`CREATE SHIFT API ERROR: ${response.status} - ${errorText}`);
      throw new Error(`Create Shift failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();

    // Check for errorRecords
    const errorRecords = responseData.errorRecords || [];
    if (errorRecords.length > 0) {
      const errors = errorRecords.map((err: any) =>
        `${err.errorCode || 'Unknown'}: ${err.errorMessage || 'Unknown error'}`
      ).join(', ');
      throw new Error(`Shift creation failed: ${errors}`);
    }

    Logger.pass(`Successfully created ${shiftData.length} shift(s) via API`);
    return responseData;
  }

  /**
   * Get Shifts API
   */
  async getShifts(
    accessToken: string,
    locationExternalId: string,
    date: string,
    enterpriseName: string,
    includeWeeklyShifts: boolean = true,
    page: number = 0,
    size: number = 20,
    employeeExternalId?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      date: date,
      includeWeeklyShifts: includeWeeklyShifts.toString(),
      page: page.toString(),
      size: size.toString(),
    });

    if (employeeExternalId) {
      params.append('employeeExternalId', employeeExternalId);
    } else {
      params.append('locationExternalId', locationExternalId);
    }

    const url = `${this.baseURL}/v2/shifts?${params.toString()}`;
    const requestHeaders: Record<string, string> = {
      'accept': 'application/json',
      'Legion-Version': '2022-08-01',
      'Legion-Enterprise': enterpriseName,
      'accessToken': accessToken,
    };

    Logger.info(`GET SHIFTS API: GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      Logger.error(`GET SHIFTS API ERROR: ${response.status} - ${errorText}`);
      throw new Error(`Get Shifts failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    Logger.pass(`Successfully retrieved shifts`);
    return responseData;
  }
}
