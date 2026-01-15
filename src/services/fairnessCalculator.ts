import { differenceInHours, getDay, getHours } from 'date-fns';
import type { Shift, Mission, Soldier } from '../types/entities';
import { FAIRNESS_CONFIG } from '../utils/constants';

/**
 * Calculate fairness points for a single shift
 */
export function calculateShiftScore(
  shift: Shift,
  mission: Mission
): number {
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);

  const baseScore = mission.intensity;
  const hours = Math.max(differenceInHours(endTime, startTime), 1);

  let multiplier = 1.0;

  // Night shift multiplier (22:00 - 06:00)
  if (isNightShift(startTime, endTime)) {
    multiplier *= FAIRNESS_CONFIG.nightMultiplier;
  }

  // Weekend multiplier (Friday 14:00 to Saturday 22:00)
  if (isWeekendShift(startTime)) {
    multiplier *= FAIRNESS_CONFIG.weekendMultiplier;
  }

  return baseScore * hours * multiplier;
}

/**
 * Check if shift falls during night hours
 */
function isNightShift(startTime: Date, endTime: Date): boolean {
  const startHour = getHours(startTime);
  const endHour = getHours(endTime);

  // Check if any part of the shift is during night hours (22:00-06:00)
  return (
    startHour >= FAIRNESS_CONFIG.nightStartHour ||
    startHour < FAIRNESS_CONFIG.nightEndHour ||
    endHour >= FAIRNESS_CONFIG.nightStartHour ||
    endHour < FAIRNESS_CONFIG.nightEndHour
  );
}

/**
 * Check if shift falls during weekend (Friday 14:00 to Saturday 22:00)
 */
function isWeekendShift(startTime: Date): boolean {
  const day = getDay(startTime); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const hour = getHours(startTime);

  // Friday after 14:00
  if (day === FAIRNESS_CONFIG.weekendStartDay && hour >= FAIRNESS_CONFIG.weekendStartHour) {
    return true;
  }

  // Saturday before 22:00
  if (day === FAIRNESS_CONFIG.weekendEndDay && hour < FAIRNESS_CONFIG.weekendEndHour) {
    return true;
  }

  return false;
}

/**
 * Get soldiers sorted by fairness score (lowest first = should be assigned)
 */
export function getSoldiersSortedByFairness(
  soldiers: Soldier[],
  platoonId: string,
  availableOnly: boolean = true
): Soldier[] {
  return soldiers
    .filter((s) => {
      const matchesPlatoon = s.platoonId === platoonId;
      const isAvailable = !availableOnly || s.status === 'available';
      return matchesPlatoon && isAvailable;
    })
    .sort((a, b) => a.fairnessScore - b.fairnessScore);
}

/**
 * Calculate the average fairness score for a platoon
 */
export function getPlatoonAverageFairness(
  soldiers: Soldier[],
  platoonId: string
): number {
  const platoonSoldiers = soldiers.filter((s) => s.platoonId === platoonId);
  if (platoonSoldiers.length === 0) return 0;

  const totalScore = platoonSoldiers.reduce((sum, s) => sum + s.fairnessScore, 0);
  return totalScore / platoonSoldiers.length;
}

/**
 * Get fairness score distribution stats for a platoon
 */
export function getPlatoonFairnessStats(
  soldiers: Soldier[],
  platoonId: string
): {
  min: number;
  max: number;
  average: number;
  range: number;
} {
  const platoonSoldiers = soldiers.filter((s) => s.platoonId === platoonId);
  if (platoonSoldiers.length === 0) {
    return { min: 0, max: 0, average: 0, range: 0 };
  }

  const scores = platoonSoldiers.map((s) => s.fairnessScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  return {
    min,
    max,
    average,
    range: max - min,
  };
}

/**
 * Suggest soldiers for a shift based on fairness and availability
 * If platoonId is provided, filters to that platoon; otherwise shows all soldiers
 */
export function suggestSoldiersForShift(
  soldiers: Soldier[],
  platoonId: string | null,
  existingShifts: Shift[],
  startTime: Date,
  endTime: Date,
  limit: number = 5
): Array<{
  soldier: Soldier;
  score: number;
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
        score: soldier.fairnessScore,
        hasConflict,
        hasRestViolation,
        restViolationType,
      };
    })
    .sort((a, b) => {
      // Available soldiers first
      if (a.soldier.status === 'available' && b.soldier.status !== 'available') return -1;
      if (a.soldier.status !== 'available' && b.soldier.status === 'available') return 1;

      // No conflicts first
      if (!a.hasConflict && b.hasConflict) return -1;
      if (a.hasConflict && !b.hasConflict) return 1;

      // No rest violations first
      if (!a.hasRestViolation && b.hasRestViolation) return -1;
      if (a.hasRestViolation && !b.hasRestViolation) return 1;

      // Then by fairness score (lowest first)
      return a.score - b.score;
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
