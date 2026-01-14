// Application constants

// Fairness calculation constants
export const FAIRNESS_CONFIG = {
  nightMultiplier: 1.3,      // 1.3x for night shifts
  weekendMultiplier: 1.5,    // 1.5x for weekend shifts
  nightStartHour: 22,        // Night starts at 22:00
  nightEndHour: 6,           // Night ends at 06:00
  weekendStartDay: 5,        // Friday
  weekendStartHour: 14,      // Friday 14:00
  weekendEndDay: 6,          // Saturday
  weekendEndHour: 22,        // Saturday 22:00
} as const;

// Rest rule constants
export const REST_RULES = {
  minimumRestHours: 8,       // Minimum rest between shifts
  shiftDurationHours: 8,     // Standard shift duration
} as const;

// Mission intensity values
export const MISSION_INTENSITY = {
  active: 1.0,               // Active mission
  standby: 0.4,              // Standby/cordon mission
} as const;

// Time slot options for the schedule grid
export const TIME_SLOT_OPTIONS = [
  { value: 1, label: '1 שעה' },
  { value: 2, label: '2 שעות' },
  { value: 4, label: '4 שעות' },
  { value: 8, label: '8 שעות' },
] as const;

// Default time slot duration in hours
export const DEFAULT_TIME_SLOT = 2;

// Status colors for UI
export const STATUS_COLORS = {
  available: 'bg-green-100 text-green-800',
  home: 'bg-gray-100 text-gray-800',
  task_locked: 'bg-blue-100 text-blue-800',
  sick: 'bg-red-100 text-red-800',
} as const;

// Alert colors for validation
export const ALERT_COLORS = {
  error: 'bg-red-50 border-red-300 text-red-800',
  warning: 'bg-orange-50 border-orange-300 text-orange-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
} as const;

// Role colors
export const ROLE_COLORS = {
  officer: 'bg-purple-100 text-purple-800',
  nco: 'bg-indigo-100 text-indigo-800',
  soldier: 'bg-slate-100 text-slate-800',
} as const;
