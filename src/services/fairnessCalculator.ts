import { differenceInHours } from 'date-fns';
import type { Shift, Soldier } from '../types/entities';

/**
 * Suggest soldiers for a shift based on availability and conflicts
 * If platoonId is provided, filters to that platoon; otherwise shows all soldiers
 * availableStatusIds: array of status IDs that are considered "available" for sorting
 */
export function suggestSoldiersForShift(
  soldiers: Soldier[],
  platoonId: string | null,
  existingShifts: Shift[],
  startTime: Date,
  endTime: Date,
  limit: number = 5,
  availableStatusIds: string[] = []
): Array<{
  soldier: Soldier;
  hasConflict: boolean;
  hasRestViolation: boolean;
  restViolationType: 'error' | 'warning' | null;
}> {
  // If platoonId is null, show all soldiers; otherwise filter by platoon
  const filteredSoldiers = platoonId
    ? soldiers.filter((s) => s.platoonId === platoonId)
    : soldiers;

  return filteredSoldiers
    .map((soldier) => {
      // Check for conflicts
      const hasConflict = existingShifts.some(
        (s) =>
          s.soldierId === soldier.id &&
          areTimesOverlapping(
            new Date(s.startTime),
            new Date(s.endTime),
            startTime,
            endTime
          )
      );

      // Check for rest violations based on previous shift duration
      const previousShift = findPreviousShiftForSoldier(soldier.id, startTime, existingShifts);
      let hasRestViolation = false;
      let restViolationType: 'error' | 'warning' | null = null;

      if (previousShift) {
        const restHours = differenceInHours(startTime, new Date(previousShift.endTime));
        const previousShiftDuration = differenceInHours(
          new Date(previousShift.endTime),
          new Date(previousShift.startTime)
        );
        const minimumRequired = Math.max(previousShiftDuration, 1);

        if (restHours < minimumRequired) {
          // Critical: rest is less than previous shift duration
          hasRestViolation = true;
          restViolationType = 'error';
        } else if (restHours < 8) {
          // Warning: rest is between shift duration and 8 hours
          hasRestViolation = true;
          restViolationType = 'warning';
        }
      }

      return {
        soldier,
        hasConflict,
        hasRestViolation,
        restViolationType,
      };
    })
    .sort((a, b) => {
      // Available soldiers first (based on statusId being in availableStatusIds)
      const aAvailable = availableStatusIds.includes(a.soldier.statusId);
      const bAvailable = availableStatusIds.includes(b.soldier.statusId);
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;

      // No conflicts first
      if (!a.hasConflict && b.hasConflict) return -1;
      if (a.hasConflict && !b.hasConflict) return 1;

      // No rest violations first
      if (!a.hasRestViolation && b.hasRestViolation) return -1;
      if (a.hasRestViolation && !b.hasRestViolation) return 1;

      // Sort by name for consistent ordering
      return a.soldier.name.localeCompare(b.soldier.name, 'he');
    })
    .slice(0, limit);
}

function areTimesOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

function findPreviousShiftForSoldier(
  soldierId: string,
  beforeTime: Date,
  shifts: Shift[]
): Shift | undefined {
  return shifts
    .filter((s) => s.soldierId === soldierId && new Date(s.endTime) <= beforeTime)
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];
}
