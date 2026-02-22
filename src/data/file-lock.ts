/**
 * Cross-Process File Lock — ensures data integrity across Playwright workers.
 *
 * Problem:
 *   Playwright workers are separate processes. Each has its own DataService instance.
 *   When two workers call `getUILoginUserBy('Admin')` simultaneously, they may both
 *   read the same user as `isUsed: false`, mark it used, and cause a collision.
 *
 * Solution:
 *   File-based locking using `fs.openSync` with O_EXCL flag (atomic create-or-fail).
 *   Before modifying shared state (user/location selection), acquire a lock file.
 *   Release it after the operation completes.
 *
 * Usage:
 *   const result = await withFileLock('data-selection', () => {
 *     return dataService.getUILoginUserBy('Admin');
 *   });
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCK_DIR = path.resolve(process.cwd(), '.locks');
const DEFAULT_TIMEOUT_MS = 10000;
const POLL_INTERVAL_MS = 50;
const LOCK_STALE_MS = 30000; // Stale lock cleanup after 30 seconds

/**
 * Acquire a file lock. Blocks until the lock is available or timeout.
 *
 * @param lockName - Unique name for this lock (e.g., 'data-selection')
 * @param timeoutMs - Maximum time to wait for lock acquisition
 * @returns A release function to call when done
 */
export async function acquireLock(lockName: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<() => void> {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }

  const lockFile = path.join(LOCK_DIR, `${lockName}.lock`);
  const startTime = Date.now();

  while (true) {
    try {
      // O_CREAT | O_EXCL = atomic create-or-fail
      const fd = fs.openSync(lockFile, 'wx');
      // Write PID + timestamp for debugging stale locks
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
      fs.closeSync(fd);

      return () => {
        try {
          fs.unlinkSync(lockFile);
        } catch {
          // Lock file already cleaned up
        }
      };
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error; // Unexpected error
      }

      // Lock exists — check if stale
      cleanStaleLock(lockFile);

      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `[FileLock] Timeout acquiring lock '${lockName}' after ${timeoutMs}ms. ` +
          `Lock file: ${lockFile}. Another worker may be stuck.`,
        );
      }

      // Poll
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

/**
 * Execute a function while holding a file lock.
 *
 * @param lockName - Unique name for this lock
 * @param fn - Function to execute while lock is held
 * @param timeoutMs - Maximum time to wait for lock
 * @returns Result of fn()
 */
export async function withFileLock<T>(
  lockName: string,
  fn: () => T | Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const release = await acquireLock(lockName, timeoutMs);
  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * Clean up a stale lock file (if the owning process has exited).
 */
function cleanStaleLock(lockFile: string): void {
  try {
    const content = fs.readFileSync(lockFile, 'utf-8');
    const lockInfo = JSON.parse(content);

    // Check if lock is stale by age
    if (Date.now() - lockInfo.timestamp > LOCK_STALE_MS) {
      console.warn(`[FileLock] Removing stale lock (age: ${Date.now() - lockInfo.timestamp}ms, pid: ${lockInfo.pid})`);
      fs.unlinkSync(lockFile);
      return;
    }

    // Check if owning process is still alive
    try {
      process.kill(lockInfo.pid, 0); // Signal 0 = check if process exists
    } catch {
      // Process doesn't exist — lock is stale
      console.warn(`[FileLock] Removing orphaned lock (pid: ${lockInfo.pid} no longer running)`);
      fs.unlinkSync(lockFile);
    }
  } catch {
    // Can't read lock file — try to remove it
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // Ignore
    }
  }
}

/**
 * Clean up all lock files. Call in globalTeardown.
 */
export function cleanAllLocks(): void {
  try {
    if (fs.existsSync(LOCK_DIR)) {
      fs.rmSync(LOCK_DIR, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
