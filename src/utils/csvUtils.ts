import type { Soldier, Mission, Platoon, Squad, Certificate, SoldierStatusDef } from '../types/entities';

// CSV Export utilities

/**
 * Convert soldiers to CSV format
 */
export function soldiersToCSV(
  soldiers: Soldier[],
  platoons: Platoon[],
  squads: Squad[],
  certificates: Certificate[],
  statuses: SoldierStatusDef[]
): string {
  const headers = ['שם', 'מספר אישי', 'טלפון', 'תפקיד', 'סטטוס', 'מחלקה', 'כיתה', 'הסמכות'];

  const roleLabels: Record<string, string> = {
    officer: 'קצין',
    nco: 'מפקד',
    soldier: 'חייל',
  };

  const rows = soldiers.map(soldier => {
    const platoon = platoons.find(p => p.id === soldier.platoonId);
    const squad = squads.find(s => s.id === soldier.squadId);
    const status = statuses.find(s => s.id === soldier.statusId);
    const certs = soldier.certificateIds
      .map(certId => certificates.find(c => c.id === certId)?.name)
      .filter(Boolean)
      .join(', ');

    return [
      soldier.name,
      soldier.personalNumber,
      soldier.phoneNumber,
      roleLabels[soldier.role] || soldier.role,
      status?.name || '',
      platoon?.name || '',
      squad?.name || '',
      certs,
    ];
  });

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

/**
 * Convert missions to CSV format
 */
export function missionsToCSV(
  missions: Mission[],
  platoons: Platoon[],
  certificates: Certificate[]
): string {
  const headers = ['שם משימה', 'מספר חיילים נדרש', 'מחלקה', 'הסמכות נדרשות'];

  const rows = missions.map(mission => {
    const platoon = platoons.find(p => p.id === mission.platoonId);
    const certs = mission.requiredCertificateIds
      .map(certId => certificates.find(c => c.id === certId)?.name)
      .filter(Boolean)
      .join(', ');

    return [
      mission.name,
      mission.requiredSoldiers,
      platoon?.name || '',
      certs,
    ];
  });

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

// CSV Import utilities

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/**
 * Parse CSV string to headers and rows
 */
export function parseCSV(csvString: string): ParsedCSV {
  const lines = csvString.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

interface ImportSoldierRow {
  name: string;
  personalNumber: string;
  phoneNumber: string;
  role: string;
  status: string;
  platoon: string;
  squad: string;
  certificates: string;
}

interface ImportMissionRow {
  name: string;
  requiredSoldiers: number;
  platoon: string;
  certificates: string;
}

/**
 * Parse soldiers from CSV
 */
export function parseSoldiersCSV(
  csvString: string,
  platoons: Platoon[],
  squads: Squad[],
  certificates: Certificate[],
  statuses: SoldierStatusDef[]
): { soldiers: Omit<Soldier, 'id' | 'createdAt' | 'updatedAt'>[]; errors: string[] } {
  const { headers, rows } = parseCSV(csvString);
  const errors: string[] = [];
  const soldiers: Omit<Soldier, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  // Map Hebrew headers to fields
  const headerMap: Record<string, keyof ImportSoldierRow> = {
    'שם': 'name',
    'מספר אישי': 'personalNumber',
    'טלפון': 'phoneNumber',
    'תפקיד': 'role',
    'סטטוס': 'status',
    'מחלקה': 'platoon',
    'כיתה': 'squad',
    'הסמכות': 'certificates',
  };

  const roleMap: Record<string, string> = {
    'קצין': 'officer',
    'מפקד': 'nco',
    'חייל': 'soldier',
    'officer': 'officer',
    'nco': 'nco',
    'soldier': 'soldier',
  };

  const columnIndexes: Partial<Record<keyof ImportSoldierRow, number>> = {};
  headers.forEach((header, index) => {
    const field = headerMap[header];
    if (field) {
      columnIndexes[field] = index;
    }
  });

  // Validate required columns
  if (columnIndexes.name === undefined) {
    errors.push('חסרה עמודת "שם"');
    return { soldiers: [], errors };
  }

  rows.forEach((row, rowIndex) => {
    try {
      const getValue = (field: keyof ImportSoldierRow): string => {
        const index = columnIndexes[field];
        return index !== undefined ? (row[index] || '') : '';
      };

      const name = getValue('name');
      if (!name) {
        errors.push(`שורה ${rowIndex + 2}: שם חסר`);
        return;
      }

      // Find platoon
      const platoonName = getValue('platoon');
      const platoon = platoons.find(p => p.name === platoonName);
      if (platoonName && !platoon) {
        errors.push(`שורה ${rowIndex + 2}: מחלקה "${platoonName}" לא נמצאה`);
        return;
      }

      // Find squad
      const squadName = getValue('squad');
      const squad = squads.find(s => s.name === squadName && (!platoon || s.platoonId === platoon.id));
      if (squadName && !squad) {
        errors.push(`שורה ${rowIndex + 2}: כיתה "${squadName}" לא נמצאה`);
        return;
      }

      // Find status
      const statusName = getValue('status');
      let status = statuses.find(s => s.name === statusName);
      if (!status) {
        // Default to first available status
        status = statuses.find(s => s.isAvailable) || statuses[0];
      }

      // Parse role
      const roleValue = getValue('role');
      const role = roleMap[roleValue] || 'soldier';

      // Parse certificates
      const certsStr = getValue('certificates');
      const certNames = certsStr ? certsStr.split(',').map(c => c.trim()).filter(Boolean) : [];
      const certificateIds = certNames
        .map(certName => certificates.find(c => c.name === certName)?.id)
        .filter((id): id is string => id !== undefined);

      soldiers.push({
        name,
        personalNumber: getValue('personalNumber'),
        phoneNumber: getValue('phoneNumber'),
        role: role as 'officer' | 'nco' | 'soldier',
        statusId: status?.id || '',
        platoonId: platoon?.id || '',
        squadId: squad?.id || '',
        certificateIds,
        leaveStart: null,
        leaveEnd: null,
      });
    } catch (e) {
      errors.push(`שורה ${rowIndex + 2}: שגיאה בקריאה`);
    }
  });

  return { soldiers, errors };
}

/**
 * Parse missions from CSV
 */
export function parseMissionsCSV(
  csvString: string,
  platoons: Platoon[],
  certificates: Certificate[]
): { missions: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>[]; errors: string[] } {
  const { headers, rows } = parseCSV(csvString);
  const errors: string[] = [];
  const missions: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  // Map Hebrew headers to fields
  const headerMap: Record<string, keyof ImportMissionRow> = {
    'שם משימה': 'name',
    'שם': 'name',
    'מספר חיילים נדרש': 'requiredSoldiers',
    'מספר חיילים': 'requiredSoldiers',
    'חיילים': 'requiredSoldiers',
    'מחלקה': 'platoon',
    'הסמכות נדרשות': 'certificates',
    'הסמכות': 'certificates',
  };

  const columnIndexes: Partial<Record<keyof ImportMissionRow, number>> = {};
  headers.forEach((header, index) => {
    const field = headerMap[header];
    if (field) {
      columnIndexes[field] = index;
    }
  });

  // Validate required columns
  if (columnIndexes.name === undefined) {
    errors.push('חסרה עמודת "שם משימה"');
    return { missions: [], errors };
  }

  rows.forEach((row, rowIndex) => {
    try {
      const getValue = (field: keyof ImportMissionRow): string => {
        const index = columnIndexes[field];
        return index !== undefined ? (row[index] || '') : '';
      };

      const name = getValue('name');
      if (!name) {
        errors.push(`שורה ${rowIndex + 2}: שם משימה חסר`);
        return;
      }

      // Find platoon
      const platoonName = getValue('platoon');
      const platoon = platoons.find(p => p.name === platoonName);
      if (platoonName && !platoon) {
        errors.push(`שורה ${rowIndex + 2}: מחלקה "${platoonName}" לא נמצאה`);
        return;
      }

      // Parse required soldiers
      const reqSoldiersStr = getValue('requiredSoldiers');
      const requiredSoldiers = parseInt(reqSoldiersStr, 10) || 1;

      // Parse certificates
      const certsStr = getValue('certificates');
      const certNames = certsStr ? certsStr.split(',').map(c => c.trim()).filter(Boolean) : [];
      const requiredCertificateIds = certNames
        .map(certName => certificates.find(c => c.name === certName)?.id)
        .filter((id): id is string => id !== undefined);

      missions.push({
        name,
        requiredSoldiers,
        platoonId: platoon?.id || '',
        requiredCertificateIds,
      });
    } catch (e) {
      errors.push(`שורה ${rowIndex + 2}: שגיאה בקריאה`);
    }
  });

  return { missions, errors };
}

/**
 * Download string as file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  // Add BOM for Excel Hebrew support
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'UTF-8');
  });
}
