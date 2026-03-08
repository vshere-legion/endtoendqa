/**
 * SCH Team — Data Factory Barrel Export
 *
 * Import from here in SCH step definitions:
 *   import { createShift, createScheduleParams } from '../test-data/factories';
 *
 * Remember:
 *   - Factories = business entity inputs (what to do)
 *   - DataService = credentials (who does it)
 *   Never mix the two responsibilities.
 */
export { createShift, createOpenShift, createSupervisorShift, createWeekShifts } from './shift-factory';
export type { ShiftInput } from './shift-factory';

export { createScheduleParams, createFilterConfig, createCopyScheduleParams } from './schedule-factory';
export type { ScheduleParams, FilterConfig, CopyScheduleParams } from './schedule-factory';
