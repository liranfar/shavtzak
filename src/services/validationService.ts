import { differenceInHours, areIntervalsOverlapping } from 'date-fns';
import type { Shift, Soldier, ValidationResult, ValidationAlert } from '../types/entities';
import { REST_RULES } from '../utils/constants';
import { labels } from '../utils/translations';

/**
 * Validates a proposed shift assignment
 */
export function validateShiftAssignment(
  soldierId: string,
  startTime: Date,
  endTime: Date,
  existingShifts: Shift[],
  _soldier: Soldier,
  excludeShiftId?: string
): ValidationResult {
  const alerts: ValidationAlert[] = [];

  // 1. Check for duplicate/overlapping assignments
  const overlappingShifts = existingShifts.filter(
    (s) =>
      s.soldierId === soldierId &&
      s.id !== excludeShiftId &&
      areIntervalsOverlapping(
        { start: new Date(s.startTime), end: new Date(s.endTime) },
        { start: startTime, end: endTime }
      )
  );

  if (overlappingShifts.length > 0) {
    alerts.push({
      type: 'error',
      code: 'DUPLICATE',
      message: labels.validation.duplicate,
      soldierIds: [soldierId],
    });
  }

  // 2. Check rest rule based on previous shift duration
  const previousShift = findPreviousShift(soldierId, startTime, existingShifts, excludeShiftId);
  if (previousShift) {
    const restHours = differenceInHours(startTime, new Date(previousShift.endTime));
    const previousShiftDuration = differenceInHours(
      new Date(previousShift.endTime),
      new Date(previousShift.startTime)
    );
    const minimumRequired = Math.max(previousShiftDuration, 1); // At least 1 hour

    if (restHours < minimumRequired) {
      // Critical: rest is less than the previous shift duration (warning only, doesn't block)
      alerts.push({
        type: 'warning',
        code: 'REST_VIOLATION_CRITICAL',
        message: `מנוחה קריטית! (${restHours} שעות, נדרש לפחות ${minimumRequired})`,
        soldierIds: [soldierId],
      });
    } else if (restHours < REST_RULES.minimumRestHours) {
      // Warning: rest is between shift duration and 8 hours
      alerts.push({
        type: 'warning',
        code: 'REST_VIOLATION',
        message: `${labels.validation.restViolation} (${restHours} שעות מתוך ${REST_RULES.minimumRestHours} מומלצות)`,
        soldierIds: [soldierId],
      });
    }
  }

  // 3. Check next shift for rest violation (current shift duration determines required rest)
  const nextShift = findNextShift(soldierId, endTime, existingShifts, excludeShiftId);
  if (nextShift) {
    const restHours = differenceInHours(new Date(nextShift.startTime), endTime);
    const currentShiftDuration = differenceInHours(endTime, startTime);
    const minimumRequired = Math.max(currentShiftDuration, 1); // At least 1 hour

    if (restHours < minimumRequired) {
      // Critical: rest until next shift is less than current shift duration (warning only, doesn't block)
      alerts.push({
        type: 'warning',
        code: 'REST_VIOLATION_CRITICAL',
        message: `מנוחה קריטית עד משמרת הבאה! (${restHours} שעות, נדרש לפחות ${minimumRequired})`,
        soldierIds: [soldierId],
      });
    } else if (restHours < REST_RULES.minimumRestHours) {
      // Warning: rest is between shift duration and 8 hours
      alerts.push({
        type: 'warning',
        code: 'REST_VIOLATION',
        message: `${labels.validation.restViolation} (${restHours} שעות עד משמרת הבאה מתוך ${REST_RULES.minimumRestHours} מומלצות)`,
        soldierIds: [soldierId],
      });
    }
  }

  // 4. Check soldier availability (handled externally via statusId now)
  // Note: Status availability check is done at the component level using statuses from store

  return {
    isValid: !alerts.some((a) => a.type === 'error'),
    alerts,
  };
}

/**
 * Find the most recent shift before a given time for a soldier
 */
function findPreviousShift(
  soldierId: string,
  beforeTime: Date,
  shifts: Shift[],
  excludeShiftId?: string
): Shift | undefined {
  return shifts
    .filter(
      (s) =>
        s.soldierId === soldierId &&
        s.id !== excludeShiftId &&
        new Date(s.endTime) <= beforeTime
    )
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];
}

/**
 * Find the next shift after a given time for a soldier
 */
function findNextShift(
  soldierId: string,
  afterTime: Date,
  shifts: Shift[],
  excludeShiftId?: string
): Shift | undefined {
  return shifts
    .filter(
      (s) =>
        s.soldierId === soldierId &&
        s.id !== excludeShiftId &&
        new Date(s.startTime) >= afterTime
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
}

/**
 * Validate all shifts for a given day and return any conflicts
 */
export function validateDaySchedule(
  shifts: Shift[],
  soldiers: Soldier[]
): Map<string, ValidationAlert[]> {
  const alertsByShift = new Map<string, ValidationAlert[]>();

  for (const shift of shifts) {
    const soldier = soldiers.find((s) => s.id === shift.soldierId);
    if (!soldier) continue;

    const result = validateShiftAssignment(
      shift.soldierId,
      new Date(shift.startTime),
      new Date(shift.endTime),
      shifts,
      soldier,
      shift.id
    );

    if (result.alerts.length > 0) {
      alertsByShift.set(shift.id, result.alerts);
    }
  }

  return alertsByShift;
}

/**
 * Get the highest severity alert type from a list of alerts
 */
export function getHighestAlertType(alerts: ValidationAlert[]): 'error' | 'warning' | 'info' | null {
  if (alerts.some((a) => a.type === 'error')) return 'error';
  if (alerts.some((a) => a.type === 'warning')) return 'warning';
  if (alerts.some((a) => a.type === 'info')) return 'info';
  return null;
}
