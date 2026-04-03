/**
 * SCH Team — Shift Data Factory
 *
 * Creates ShiftInput objects with sensible defaults for P2P schedule tests.
 * Use when a step needs shift parameters that aren't important to the scenario's
 * intent — supply only the fields that matter, let the factory fill the rest.
 *
 * NOTE: These are UI input parameters, not pre-provisioned DB records.
 *       The work role, location, and day index must already exist in the
 *       Legion test environment for the test to pass.
 *
 * Usage:
 *   import { createShift, createOpenShift } from '../test-data/factories';
 *
 *   // Basic — all defaults (Team Member, Monday 9AM–5PM)
 *   const shift = createShift();
 *
 *   // Override only the fields relevant to your scenario
 *   const supervisorShift = createShift({ workRole: 'Supervisor', dayIndex: 3 });
 *   const earlyShift = createShift({ startTime: '06:00am', endTime: '02:00pm' });
 */

import { withDefaults } from '@core/data/factories/types';
import type { FactoryOverride, LegionTime, DayIndex } from '@core/data/factories/types';

export interface ShiftInput {
  /** Work role name as it appears in the React Select dropdown */
  workRole: string;
  /** Shift start time in Legion format: "HH:MMam" / "HH:MMpm" */
  startTime: LegionTime;
  /** Shift end time in Legion format */
  endTime: LegionTime;
  /** Day column index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat */
  dayIndex: DayIndex;
  /** Number of employees to assign (for open shifts) */
  headcount?: number;
  /** Whether this is an open (unassigned) shift */
  isOpenShift?: boolean;
}

const SHIFT_DEFAULTS: ShiftInput = {
  workRole: 'Team Member',
  startTime: '09:00am',
  endTime: '05:00pm',
  dayIndex: 1,          // Monday
  headcount: 1,
  isOpenShift: false,
};

/**
 * Create a regular assigned shift with optional overrides.
 */
export function createShift(overrides?: FactoryOverride<ShiftInput>): ShiftInput {
  return withDefaults(SHIFT_DEFAULTS, overrides);
}

/**
 * Create an open (unassigned) shift.
 * Open shifts appear in the unassigned row and require headcount.
 */
export function createOpenShift(overrides?: FactoryOverride<ShiftInput>): ShiftInput {
  return withDefaults({ ...SHIFT_DEFAULTS, isOpenShift: true, headcount: 2 }, overrides);
}

/**
 * Create a supervisor shift (common override for permission/compliance tests).
 */
export function createSupervisorShift(overrides?: FactoryOverride<ShiftInput>): ShiftInput {
  return withDefaults({ ...SHIFT_DEFAULTS, workRole: 'Supervisor' }, overrides);
}

/**
 * Create a set of shifts covering Mon–Fri (useful for coverage/staffing smart card tests).
 */
export function createWeekShifts(baseOverride?: FactoryOverride<ShiftInput>): ShiftInput[] {
  return ([1, 2, 3, 4, 5] as DayIndex[]).map(dayIndex =>
    createShift({ ...baseOverride, dayIndex }),
  );
}
