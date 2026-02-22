/**
 * SCH Team — Schedule Data Factory
 *
 * Creates ScheduleParams and related config objects for P2P schedule tests.
 * Covers schedule generation params, filter config, copy-schedule params, etc.
 *
 * Usage:
 *   import { createScheduleParams, createFilterConfig } from '../test-data/factories';
 *
 *   const params = createScheduleParams({ weekOffset: 2 });
 *   const filter = createFilterConfig({ locationFilter: 'Peer001' });
 */

import { withDefaults } from '@core/data/factories/types';
import type { FactoryOverride } from '@core/data/factories/types';

// ─── Schedule Generation Params ────────────────────────────────────────────

export interface ScheduleParams {
  /** Operating hours start time ("06:00am", "07:00am", etc.) */
  startTime: string;
  /** Operating hours end time */
  endTime: string;
  /** How many weeks forward from current week (0 = this week, 1 = next week) */
  weekOffset: number;
  /** Whether to ungenerate existing schedule before generating (default: true) */
  clearExisting: boolean;
}

const SCHEDULE_DEFAULTS: ScheduleParams = {
  startTime: '06:00am',
  endTime: '06:00am',
  weekOffset: 1,
  clearExisting: true,
};

export function createScheduleParams(overrides?: FactoryOverride<ScheduleParams>): ScheduleParams {
  return withDefaults(SCHEDULE_DEFAULTS, overrides);
}

// ─── Schedule Filter Config ─────────────────────────────────────────────────

export interface FilterConfig {
  /** Location name to filter by (e.g., "Peer001") */
  locationFilter?: string;
  /** Work role filter (e.g., "Team Member") */
  workRoleFilter?: string;
  /** Employee name filter */
  employeeFilter?: string;
  /** Show only open shifts */
  openShiftsOnly: boolean;
}

const FILTER_DEFAULTS: FilterConfig = {
  locationFilter: undefined,
  workRoleFilter: undefined,
  employeeFilter: undefined,
  openShiftsOnly: false,
};

export function createFilterConfig(overrides?: FactoryOverride<FilterConfig>): FilterConfig {
  return withDefaults(FILTER_DEFAULTS, overrides);
}

// ─── Copy Schedule Params ───────────────────────────────────────────────────

export interface CopyScheduleParams {
  /** Source week offset (0 = current week) */
  sourceWeekOffset: number;
  /** Target week offset */
  targetWeekOffset: number;
  /** Whether to include open shifts in the copy */
  includeOpenShifts: boolean;
}

const COPY_DEFAULTS: CopyScheduleParams = {
  sourceWeekOffset: 1,
  targetWeekOffset: 2,
  includeOpenShifts: true,
};

export function createCopyScheduleParams(overrides?: FactoryOverride<CopyScheduleParams>): CopyScheduleParams {
  return withDefaults(COPY_DEFAULTS, overrides);
}
