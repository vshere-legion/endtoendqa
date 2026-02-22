/**
 * Enterprise Logger — structured logging with JSON output, correlation IDs,
 * log levels, file output, and automatic sensitive data masking.
 *
 * Features:
 *   - Log levels: DEBUG, INFO, WARN, ERROR, FATAL
 *   - Correlation IDs for tracing requests across steps
 *   - JSON-structured output for log aggregation (ELK, Datadog, Splunk)
 *   - File output with rotation (writes to reports/logs/)
 *   - Automatic masking of passwords, tokens, SSNs
 *   - Worker-aware context (includes workerIndex in every entry)
 *   - Step timing for performance analysis
 */

import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  correlationId: string;
  workerIndex: number;
  message: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  error?: { message: string; stack?: string };
}

const SENSITIVE_PATTERNS = [
  { pattern: /(password|passwd|pwd)\s*[:=]\s*\S+/gi, replacement: '$1=***MASKED***' },
  { pattern: /(token|bearer|authorization)\s*[:=]\s*\S+/gi, replacement: '$1=***MASKED***' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' },
  { pattern: /(api[_-]?key)\s*[:=]\s*\S+/gi, replacement: '$1=***MASKED***' },
];

const LOG_DIR = path.resolve(process.cwd(), 'reports', 'logs');
const LOG_LEVEL_FROM_ENV = (process.env.LOG_LEVEL || 'INFO').toUpperCase();

function resolveLogLevel(level: string): LogLevel {
  const map: Record<string, LogLevel> = {
    DEBUG: LogLevel.DEBUG,
    INFO: LogLevel.INFO,
    WARN: LogLevel.WARN,
    ERROR: LogLevel.ERROR,
    FATAL: LogLevel.FATAL,
  };
  return map[level] ?? LogLevel.INFO;
}

export class Logger {
  private context: string;
  private correlationId: string;
  private workerIndex: number;
  private minLevel: LogLevel;
  private fileStream: fs.WriteStream | null = null;
  private timers: Map<string, number> = new Map();

  constructor(context: string, options?: { workerIndex?: number; correlationId?: string }) {
    this.context = context;
    this.workerIndex = options?.workerIndex ?? -1;
    this.correlationId = options?.correlationId ?? Logger.generateCorrelationId();
    this.minLevel = resolveLogLevel(LOG_LEVEL_FROM_ENV);

    if (process.env.LOG_TO_FILE !== 'false') {
      this.initFileStream();
    }
  }

  // ─── Public Logging Methods ──────────────────────────────

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  fatal(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  // ─── Step Timing ─────────────────────────────────────────

  startTimer(label: string): void {
    this.timers.set(label, Date.now());
    this.debug(`Timer started: ${label}`);
  }

  endTimer(label: string): number {
    const start = this.timers.get(label);
    if (!start) {
      this.warn(`Timer not found: ${label}`);
      return 0;
    }
    const durationMs = Date.now() - start;
    this.timers.delete(label);
    this.info(`Timer ended: ${label}`, { durationMs });
    return durationMs;
  }

  // ─── Step Logging (for Cucumber steps) ───────────────────

  step(stepText: string): void {
    this.info(`STEP: ${stepText}`);
    this.startTimer(`step:${stepText}`);
  }

  stepDone(stepText: string): void {
    const durationMs = this.endTimer(`step:${stepText}`);
    this.info(`STEP PASSED: ${stepText}`, { durationMs });
  }

  stepFailed(stepText: string, error: Error): void {
    const durationMs = this.endTimer(`step:${stepText}`);
    this.error(`STEP FAILED: ${stepText}`, error, { durationMs });
  }

  // ─── Correlation & Context ───────────────────────────────

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  child(childContext: string): Logger {
    const child = new Logger(`${this.context}.${childContext}`, {
      workerIndex: this.workerIndex,
      correlationId: this.correlationId,
    });
    return child;
  }

  // ─── Cleanup ─────────────────────────────────────────────

  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }

  // ─── Internal ────────────────────────────────────────────

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      context: this.context,
      correlationId: this.correlationId,
      workerIndex: this.workerIndex,
      message: this.maskSensitiveData(message),
    };

    if (data) entry.data = data;
    if (error) entry.error = { message: error.message, stack: error.stack };

    // Console output (human-readable)
    this.writeToConsole(entry, level);

    // File output (JSON for log aggregation)
    this.writeToFile(entry);
  }

  private writeToConsole(entry: LogEntry, level: LogLevel): void {
    const prefix = `[${entry.timestamp.slice(11, 23)}] [W${entry.workerIndex}] [${entry.context}]`;
    const levelTag = entry.level.padEnd(5);
    const msg = `${prefix} ${levelTag} ${entry.message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(msg);
        break;
      case LogLevel.INFO:
        console.log(msg);
        break;
      case LogLevel.WARN:
        console.warn(msg);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(msg);
        if (entry.error?.stack) console.error(entry.error.stack);
        break;
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.fileStream) return;
    try {
      this.fileStream.write(JSON.stringify(entry) + '\n');
    } catch {
      // Silently fail file writes to not break tests
    }
  }

  private initFileStream(): void {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }
      const logFile = path.join(LOG_DIR, `worker-${this.workerIndex}-${Date.now()}.jsonl`);
      this.fileStream = fs.createWriteStream(logFile, { flags: 'a' });
    } catch {
      // Silently fail — logging should never break tests
    }
  }

  private maskSensitiveData(text: string): string {
    let masked = text;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      masked = masked.replace(pattern, replacement);
    }
    return masked;
  }

  static generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}
