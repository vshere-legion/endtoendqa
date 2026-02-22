/**
 * Static Logger - compatible with the source POM framework's Logger interface.
 * Wraps console.log for simplicity (no winston dependency needed in BDD framework).
 */
export class Logger {
  private static testName: string = 'Schedule';

  static setTestName(name: string): void {
    Logger.testName = name;
  }

  static info(message: string, _meta?: any): void {
    console.log(`[${Logger.testName}] INFO: ${message}`);
  }

  static debug(message: string, _meta?: any): void {
    if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'DEBUG') {
      console.log(`[${Logger.testName}] DEBUG: ${message}`);
    }
  }

  static warn(message: string, _meta?: any): void {
    console.warn(`[${Logger.testName}] WARN: ${message}`);
  }

  static error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      console.error(`[${Logger.testName}] ERROR: ${message} - ${error.message}`);
    } else {
      console.error(`[${Logger.testName}] ERROR: ${message}`);
    }
  }

  static step(message: string): void {
    Logger.info(`STEP: ${message}`);
  }

  static pass(message: string): void {
    Logger.info(`PASS: ${message}`);
  }

  static fail(message: string, error?: Error): void {
    if (error) {
      Logger.error(`FAIL: ${message}`, error);
    } else {
      Logger.error(`FAIL: ${message}`);
    }
  }

  static apiRequest(method: string, url: string, _data?: any): void {
    Logger.debug(`API Request: ${method} ${url}`);
  }

  static apiResponse(method: string, url: string, status: number, _data?: any): void {
    Logger.debug(`API Response: ${method} ${url} - Status: ${status}`);
  }
}
