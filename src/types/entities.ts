// Core entity types for the Shavtzak system

export type SoldierRole = 'officer' | 'nco' | 'soldier';
export type SoldierStatus = 'available' | 'home' | 'task_locked' | 'sick';
export type MissionType = 'A_continuous' | 'C_adhoc';
export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Soldier {
  id: string;
  name: string;
  personalNumber: string; // מספר אישי
  phoneNumber: string; // מספר טלפון
  role: SoldierRole;
  status: SoldierStatus;
  platoonId: string;
  squadId: string;
  certificateIds: string[]; // הסמכות
  fairnessScore: number; // cumulative weekly score
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  name: string; // e.g., "קלע", "חובש", "נהג"
  createdAt: Date;
}

export interface Mission {
  id: string;
  name: string;
  type: MissionType;
  intensity: number; // 1.0 = active, 0.4 = standby
  requiredSoldiers: number;
  requiredCertificateIds: string[]; // Required certificates for this mission
  platoonId: string; // assigned platoon
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  missionId: string;
  soldierId: string;
  startTime: Date;
  endTime: Date;
  status: ShiftStatus;
  fairnessPoints: number; // calculated score for this shift
  createdAt: Date;
}

export interface Platoon {
  id: string;
  name: string;
  companyId: string;
  color: string; // Hex color for visual distinction
  createdAt: Date;
}

export interface Squad {
  id: string;
  name: string;
  platoonId: string;
  createdAt: Date;
}

// Validation types
export type AlertType = 'error' | 'warning' | 'info';
export type AlertCode = 'DUPLICATE' | 'REST_VIOLATION' | 'UNAVAILABLE';

export interface ValidationAlert {
  type: AlertType;
  code: AlertCode;
  message: string;
  soldierIds: string[];
}

export interface ValidationResult {
  isValid: boolean;
  alerts: ValidationAlert[];
}

// Form types for creating/updating entities
export type CreateSoldierInput = Omit<Soldier, 'id' | 'fairnessScore' | 'createdAt' | 'updatedAt'>;
export type UpdateSoldierInput = Partial<CreateSoldierInput>;

export type CreateMissionInput = Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMissionInput = Partial<CreateMissionInput>;

export type CreateShiftInput = Omit<Shift, 'id' | 'fairnessPoints' | 'createdAt'>;
export type UpdateShiftInput = Partial<CreateShiftInput>;
