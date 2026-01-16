// Application constants

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
