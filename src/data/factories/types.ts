/**
 * Shared Data Factory Types
 *
 * Base interfaces and utility types used by all team-specific factories.
 *
 * IMPORTANT — Scope of Data Factories:
 *   Factories create BUSINESS ENTITY DATA (shift params, schedule configs,
 *   filter values, expected results). They do NOT replace DataService.
 *
 *   DataService owns:  Login credentials (pre-provisioned Legion accounts)
 *   Factories own:     Input data for test actions (what the test does, not who does it)
 *
 * Usage:
 *   import { createShift } from '@teams/sch/test-data/factories';
 *   const shift = createShift({ workRole: 'Supervisor', dayIndex: 3 });
 */

/**
 * Generic factory override type.
 * Allows callers to override any subset of the factory's default values.
 */
export type FactoryOverride<T> = Partial<T>;

/**
 * Utility: deep-merge defaults with caller overrides.
 * Used internally by all factory functions.
 */
export function withDefaults<T>(defaults: T, overrides?: FactoryOverride<T>): T {
  return { ...defaults, ...overrides };
}

/**
 * Common time format used across Legion schedule tests.
 * Pattern: "HH:MMam" or "HH:MMpm" (e.g., "09:00am", "05:00pm")
 */
export type LegionTime = string;

/**
 * Day index: 0=Sunday, 1=Monday, ... 6=Saturday
 * Matches Legion's `data-day-index` attribute.
 */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
