import * as fs from 'fs';
import * as path from 'path';

/**
 * Convert time string to minutes from midnight
 * Supports formats: "9:00 AM", "1:00 PM", "09:00", "13:00"
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) {
    throw new Error('Time string cannot be empty');
  }

  const normalized = timeStr.trim().toUpperCase();

  const amPmMatch = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3];

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  const hour24Match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (hour24Match) {
    const hours = parseInt(hour24Match[1], 10);
    const minutes = parseInt(hour24Match[2], 10);
    return hours * 60 + minutes;
  }

  throw new Error(`Invalid time format: ${timeStr}. Expected formats: "9:00 AM", "1:00 PM", "09:00", "13:00"`);
}

/**
 * Format date to YYYY-MM-DD format for API
 */
export function formatDateForAPI(date: Date | string): string {
  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get date from week day name
 */
export function getDateFromWeekDay(dayName: string, weekStartDate: Date): Date {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIndex = dayNames.findIndex(day => day.toLowerCase() === dayName.toLowerCase());

  if (targetDayIndex === -1) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  const currentDayIndex = weekStartDate.getDay();
  const daysToAdd = targetDayIndex - currentDayIndex;

  const targetDate = new Date(weekStartDate);
  targetDate.setDate(weekStartDate.getDate() + daysToAdd);

  return targetDate;
}

/**
 * Get current timestamp as string
 */
export function getCurrentTimestamp(): string {
  return formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss');
}

/**
 * Format date to string
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Read JSON file
 */
export function readJsonFile<T = any>(filePath: string): T {
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Error reading JSON file: ${filePath} - ${(error as Error).message}`);
  }
}

/**
 * Wait for specified milliseconds
 */
export async function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = delayMs * Math.pow(2, i);
        await wait(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Ensure directory exists
 */
export function ensureDirectoryExists(dirPath: string): void {
  const absolutePath = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }
}
