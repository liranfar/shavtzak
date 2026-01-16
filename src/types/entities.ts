// Core entity types for the Shavtzak system

export type SoldierRole = 'officer' | 'nco' | 'soldier';
export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Soldier {
  id: string;
  name: string;
  personalNumber: string; // מספר אישי
  phoneNumber: string; // מספר טלפון
  role: SoldierRole;
  statusId: string; // Reference to SoldierStatusDef
  platoonId: string;
  squadId: string;
  certificateIds: string[]; // הסמכות
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  name: string; // e.g., "קלע", "חובש", "נהג"
  createdAt: Date;
}

export interface SoldierStatusDef {
  id: string;
  name: string; // e.g., "זמין", "בבית", "חולה"
  color: string; // Hex color for display
  isAvailable: boolean; // Whether soldier can be assigned to shifts
  createdAt: Date;
}

export interface Mission {
  id: string;
  name: string;
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
export type AlertCode = 'DUPLICATE' | 'REST_VIOLATION' | 'REST_VIOLATION_CRITICAL' | 'UNAVAILABLE';

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
export type CreateSoldierInput = Omit<Soldier, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSoldierInput = Partial<CreateSoldierInput>;

export type CreateMissionInput = Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMissionInput = Partial<CreateMissionInput>;

export type CreateShiftInput = Omit<Shift, 'id' | 'createdAt'>;
export type UpdateShiftInput = Partial<CreateShiftInput>;
