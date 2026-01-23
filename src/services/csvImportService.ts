import type { Soldier, Mission, Shift, CreateShiftInput } from '../types/entities';

interface ParsedShift {
  soldierName: string;
  missionName: string;
  startTime: Date;
  endTime: Date;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  notFoundSoldiers: string[];
  notFoundMissions: string[];
}

// Time slot definitions (4-hour blocks)
const TIME_SLOTS = [
  { label: '6-10', start: 6, end: 10 },
  { label: '10-14', start: 10, end: 14 },
  { label: '14-18', start: 14, end: 18 },
  { label: '18-22', start: 18, end: 22 },
  { label: '22-02', start: 22, end: 2, overnight: true },
  { label: '02-06', start: 2, end: 6 },
];

// Values to skip (not actual assignments)
const SKIP_VALUES = ['', '--', 'ב', 'ע'];

// Parse date from DD/MM/YYYY format
function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Extract soldier name from "name מח'platoon" format
function extractSoldierName(fullName: string): string {
  // Remove platoon suffix like "מח'1", "מח'5", "מח'חמל", etc.
  const name = fullName.replace(/\s*מח'[^\s,]*$/, '').trim();
  return name;
}

// Normalize name for matching (remove extra spaces, trim)
function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

// Find soldier by name (fuzzy matching)
function findSoldier(name: string, soldiers: Soldier[]): Soldier | undefined {
  const normalizedInput = normalizeName(name);
  
  // Try exact match first
  let soldier = soldiers.find(s => normalizeName(s.name) === normalizedInput);
  if (soldier) return soldier;
  
  // Try partial match (input contains soldier name or vice versa)
  soldier = soldiers.find(s => {
    const normalizedSoldier = normalizeName(s.name);
    return normalizedSoldier.includes(normalizedInput) || normalizedInput.includes(normalizedSoldier);
  });
  if (soldier) return soldier;
  
  // Try matching first and last name separately
  const inputParts = normalizedInput.split(' ');
  if (inputParts.length >= 2) {
    soldier = soldiers.find(s => {
      const soldierParts = normalizeName(s.name).split(' ');
      // Match if first name and last name are present
      return soldierParts.some(sp => inputParts.includes(sp)) && 
             inputParts.some(ip => soldierParts.includes(ip));
    });
  }
  
  return soldier;
}

// Find mission by name (fuzzy matching)
function findMission(name: string, missions: Mission[]): Mission | undefined {
  const normalizedInput = normalizeName(name);
  
  // Handle compound assignments like "כרמל.קצין מוצב."
  const primaryMission = name.split('.')[0].trim();
  const normalizedPrimary = normalizeName(primaryMission);
  
  // Try exact match first
  let mission = missions.find(m => normalizeName(m.name) === normalizedInput);
  if (mission) return mission;
  
  // Try primary mission (before dot)
  mission = missions.find(m => normalizeName(m.name) === normalizedPrimary);
  if (mission) return mission;
  
  // Try partial match
  mission = missions.find(m => {
    const normalizedMission = normalizeName(m.name);
    return normalizedMission.includes(normalizedInput) || normalizedInput.includes(normalizedMission);
  });
  if (mission) return mission;
  
  // Try matching with primary
  mission = missions.find(m => {
    const normalizedMission = normalizeName(m.name);
    return normalizedMission.includes(normalizedPrimary) || normalizedPrimary.includes(normalizedMission);
  });
  
  return mission;
}

// Check if a shift overlaps with any existing shift for the same soldier and mission
function shiftOverlaps(
  soldierId: string,
  missionId: string,
  startTime: Date,
  endTime: Date,
  existingShifts: Shift[]
): boolean {
  return existingShifts.some(s => 
    s.soldierId === soldierId &&
    s.missionId === missionId &&
    // Check for any overlap: new shift starts before existing ends AND new shift ends after existing starts
    startTime.getTime() < new Date(s.endTime).getTime() &&
    endTime.getTime() > new Date(s.startTime).getTime()
  );
}

export function parseCSV(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // Skip the next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
  }
  
  // Don't forget the last cell and row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }
  
  return rows;
}

export function parseShiftsFromCSV(
  csvContent: string,
  soldiers: Soldier[],
  missions: Mission[]
): { parsedShifts: ParsedShift[]; notFoundSoldiers: Set<string>; notFoundMissions: Set<string> } {
  const rows = parseCSV(csvContent);
  const parsedShifts: ParsedShift[] = [];
  const notFoundSoldiers = new Set<string>();
  const notFoundMissions = new Set<string>();
  
  if (rows.length < 4) {
    return { parsedShifts, notFoundSoldiers, notFoundMissions };
  }
  
  // Parse dates from row 1 (format: ",,רביעי,21/01/2026,...")
  // Dates appear at columns 3, 9, 15, 21, 27... (pattern: 3 + 6*n)
  // Each date applies to the 6 preceding time slot columns (columns 2-7, 8-13, 14-19, etc.)
  const dateRow = rows[0];
  const columnToDate: Map<number, Date> = new Map();
  
  for (let i = 0; i < dateRow.length; i++) {
    const cell = dateRow[i];
    const date = parseDate(cell);
    if (date) {
      // This date at column i applies to columns i-1 through i+4 (6 slots total, day name at i-1, date at i)
      // Actually, looking at the structure: day name is at i-1, date at i
      // The time slots for this day are at columns i-1, i, i+1, i+2, i+3, i+4... but that doesn't match
      // Looking at row 3: time slots start at column 2: 6-10, 10-14, 14-18, 18-22, 22-02, 02-06
      // And date 21/01/2026 is at column 3
      // So time slots for this date are at columns 2, 3, 4, 5, 6, 7 (indices 2-7)
      // Next date at column 9 applies to columns 8-13
      // Pattern: date at column X means slots at columns X-1 through X+4
      for (let j = 0; j < 6; j++) {
        columnToDate.set(i - 1 + j, date);
      }
    }
  }
  
  // Parse time slots from row 3
  const timeSlotRow = rows[2];
  const timeSlots: { start: number; end: number; overnight: boolean; date: Date | null; colIndex: number }[] = [];
  
  for (let i = 2; i < timeSlotRow.length; i++) {
    const cell = timeSlotRow[i];
    const slot = TIME_SLOTS.find(s => s.label === cell);
    if (slot) {
      timeSlots.push({
        start: slot.start,
        end: slot.end,
        overnight: slot.overnight || false,
        date: columnToDate.get(i) || null,
        colIndex: i
      });
    }
  }
  
  // Create a map from column index to time slot for easier lookup
  const colToTimeSlot = new Map<number, typeof timeSlots[0]>();
  for (const slot of timeSlots) {
    colToTimeSlot.set(slot.colIndex, slot);
  }

  // Parse soldier rows (starting from row 4)
  for (let rowIndex = 3; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const cellValue = row[0]?.trim() || '';
    
    // Skip invalid/placeholder rows
    if (!cellValue || 
        cellValue === '--' || 
        cellValue.startsWith('__') || 
        cellValue.startsWith('.') ||
        /^[,"\s]+$/.test(cellValue) ||  // Only commas, quotes, or spaces
        cellValue.length < 2) {  // Too short to be a real name
      continue;
    }
    
    const soldierFullName = cellValue;
    const soldierName = extractSoldierName(soldierFullName);
    
    // Skip if extracted name is empty or too short
    if (!soldierName || soldierName.length < 2) continue;
    
    // Parse assignments for each column
    for (let colIndex = 2; colIndex < row.length; colIndex++) {
      const assignment = row[colIndex]?.trim();
      
      if (!assignment || SKIP_VALUES.includes(assignment)) {
        continue;
      }
      
      const slotInfo = colToTimeSlot.get(colIndex);
      if (!slotInfo || !slotInfo.date) continue;
      
      // Create start and end times
      const startTime = new Date(slotInfo.date);
      startTime.setHours(slotInfo.start, 0, 0, 0);
      
      const endTime = new Date(slotInfo.date);
      if (slotInfo.overnight) {
        // End time is next day
        endTime.setDate(endTime.getDate() + 1);
      }
      endTime.setHours(slotInfo.end, 0, 0, 0);
      
      parsedShifts.push({
        soldierName,
        missionName: assignment,
        startTime,
        endTime
      });
    }
  }
  
  // Merge consecutive shifts (same soldier + mission + end time equals next start time)
  const mergedShifts: ParsedShift[] = [];
  
  // Sort by soldier, mission, then start time
  parsedShifts.sort((a, b) => {
    if (a.soldierName !== b.soldierName) return a.soldierName.localeCompare(b.soldierName);
    if (a.missionName !== b.missionName) return a.missionName.localeCompare(b.missionName);
    return a.startTime.getTime() - b.startTime.getTime();
  });
  
  for (const shift of parsedShifts) {
    const lastShift = mergedShifts[mergedShifts.length - 1];
    
    // Check if this shift can be merged with the previous one
    if (lastShift &&
        lastShift.soldierName === shift.soldierName &&
        lastShift.missionName === shift.missionName &&
        lastShift.endTime.getTime() === shift.startTime.getTime()) {
      // Extend the previous shift's end time
      lastShift.endTime = shift.endTime;
    } else {
      // Start a new shift
      mergedShifts.push({ ...shift });
    }
  }
  
  return { parsedShifts: mergedShifts, notFoundSoldiers, notFoundMissions };
}

export interface ImportProgress {
  current: number;
  total: number;
  phase: 'parsing' | 'importing';
}

export async function importShiftsFromCSV(
  csvContent: string,
  soldiers: Soldier[],
  missions: Mission[],
  existingShifts: Shift[],
  addShift: (input: CreateShiftInput) => Promise<Shift>,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    skipped: 0,
    errors: [],
    notFoundSoldiers: [],
    notFoundMissions: []
  };
  
  onProgress?.({ current: 0, total: 1, phase: 'parsing' });
  
  const { parsedShifts } = parseShiftsFromCSV(csvContent, soldiers, missions);
  
  const notFoundSoldiersSet = new Set<string>();
  const notFoundMissionsSet = new Set<string>();
  
  // Track all shifts (existing + newly created) for overlap detection
  const allShifts: Shift[] = [...existingShifts];
  
  const total = parsedShifts.length;
  
  for (let i = 0; i < parsedShifts.length; i++) {
    const parsed = parsedShifts[i];
    
    // Update progress
    onProgress?.({ current: i + 1, total, phase: 'importing' });
    
    try {
      const soldier = findSoldier(parsed.soldierName, soldiers);
      if (!soldier) {
        // Only add valid-looking names to the not found list
        if (parsed.soldierName && parsed.soldierName.length >= 2 && !/^[,"\s]+$/.test(parsed.soldierName)) {
          notFoundSoldiersSet.add(parsed.soldierName);
        }
        continue;
      }
      
      const mission = findMission(parsed.missionName, missions);
      if (!mission) {
        notFoundMissionsSet.add(parsed.missionName);
        continue;
      }
      
      // Check for overlapping shift (in existing shifts and newly created ones)
      if (shiftOverlaps(soldier.id, mission.id, parsed.startTime, parsed.endTime, allShifts)) {
        result.skipped++;
        continue;
      }
      
      // Create the shift
      const newShift = await addShift({
        soldierId: soldier.id,
        missionId: mission.id,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        status: 'scheduled'
      });
      
      // Add to tracking array to prevent duplicates within the CSV
      allShifts.push(newShift);
      
      result.created++;
    } catch (error) {
      result.errors.push(`Error processing ${parsed.soldierName} - ${parsed.missionName}: ${error}`);
    }
  }
  
  result.notFoundSoldiers = Array.from(notFoundSoldiersSet);
  result.notFoundMissions = Array.from(notFoundMissionsSet);
  
  return result;
}
