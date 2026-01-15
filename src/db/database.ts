import Dexie, { type EntityTable } from 'dexie';
import type { Soldier, Mission, Shift, Platoon, Squad, Certificate } from '../types/entities';

// Database class extending Dexie
class ShavtzakDatabase extends Dexie {
  soldiers!: EntityTable<Soldier, 'id'>;
  missions!: EntityTable<Mission, 'id'>;
  shifts!: EntityTable<Shift, 'id'>;
  platoons!: EntityTable<Platoon, 'id'>;
  squads!: EntityTable<Squad, 'id'>;
  certificates!: EntityTable<Certificate, 'id'>;

  constructor() {
    super('shavtzak');

    this.version(1).stores({
      soldiers: 'id, platoonId, squadId, status, name',
      missions: 'id, platoonId, type, name',
      shifts: 'id, missionId, soldierId, startTime, endTime, status',
      platoons: 'id, companyId, name',
      squads: 'id, platoonId, name',
    });

    // Version 2: Add phoneNumber to soldiers
    this.version(2).stores({
      soldiers: 'id, platoonId, squadId, status, name',
      missions: 'id, platoonId, type, name',
      shifts: 'id, missionId, soldierId, startTime, endTime, status',
      platoons: 'id, companyId, name',
      squads: 'id, platoonId, name',
    }).upgrade(tx => {
      // Add phoneNumber field to existing soldiers
      return tx.table('soldiers').toCollection().modify(soldier => {
        if (!soldier.phoneNumber) {
          soldier.phoneNumber = '';
        }
      });
    });

    // Version 3: Add certificates table and certificateIds to soldiers
    this.version(3).stores({
      soldiers: 'id, platoonId, squadId, status, name',
      missions: 'id, platoonId, type, name',
      shifts: 'id, missionId, soldierId, startTime, endTime, status',
      platoons: 'id, companyId, name',
      squads: 'id, platoonId, name',
      certificates: 'id, name',
    }).upgrade(tx => {
      // Add certificateIds field to existing soldiers
      return tx.table('soldiers').toCollection().modify(soldier => {
        if (!soldier.certificateIds) {
          soldier.certificateIds = [];
        }
      });
    });

    // Version 4: Add color to platoons
    this.version(4).stores({
      soldiers: 'id, platoonId, squadId, status, name',
      missions: 'id, platoonId, type, name',
      shifts: 'id, missionId, soldierId, startTime, endTime, status',
      platoons: 'id, companyId, name',
      squads: 'id, platoonId, name',
      certificates: 'id, name',
    }).upgrade(tx => {
      // Add color field to existing platoons with distinguishable colors
      const platoonColors = [
        '#3B82F6', // blue
        '#10B981', // emerald
        '#F59E0B', // amber
        '#EF4444', // red
        '#8B5CF6', // violet
        '#EC4899', // pink
        '#06B6D4', // cyan
        '#84CC16', // lime
      ];
      let colorIndex = 0;
      return tx.table('platoons').toCollection().modify(platoon => {
        if (!platoon.color) {
          platoon.color = platoonColors[colorIndex % platoonColors.length];
          colorIndex++;
        }
      });
    });

    // Version 5: Add requiredCertificateIds to missions
    this.version(5).stores({
      soldiers: 'id, platoonId, squadId, status, name',
      missions: 'id, platoonId, type, name',
      shifts: 'id, missionId, soldierId, startTime, endTime, status',
      platoons: 'id, companyId, name',
      squads: 'id, platoonId, name',
      certificates: 'id, name',
    }).upgrade(tx => {
      return tx.table('missions').toCollection().modify(mission => {
        if (!mission.requiredCertificateIds) {
          mission.requiredCertificateIds = [];
        }
      });
    });
  }
}

// Create singleton instance
export const db = new ShavtzakDatabase();

// Helper to generate unique IDs
export function generateId(): string {
  return crypto.randomUUID();
}

// Distinguishable colors for platoons
const PLATOON_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#14B8A6', // teal
];

// Generate a random platoon color
export function generatePlatoonColor(): string {
  return PLATOON_COLORS[Math.floor(Math.random() * PLATOON_COLORS.length)];
}

// Seed data for initial setup
export async function seedDatabase(): Promise<void> {
  const platoonCount = await db.platoons.count();

  if (platoonCount > 0) {
    console.log('Database already seeded');
    return;
  }

  const now = new Date();

  // Create default platoon
  const platoonId = generateId();
  await db.platoons.add({
    id: platoonId,
    name: 'מחלקה א׳',
    companyId: 'company-1',
    color: '#3B82F6', // blue
    createdAt: now,
  });

  // Create squads
  const squadIds = [generateId(), generateId(), generateId()];
  await db.squads.bulkAdd([
    { id: squadIds[0], name: 'כיתה 1', platoonId, createdAt: now },
    { id: squadIds[1], name: 'כיתה 2', platoonId, createdAt: now },
    { id: squadIds[2], name: 'כיתה 3', platoonId, createdAt: now },
  ]);

  // Create default certificates
  const certIds = {
    marksman: generateId(),
    medic: generateId(),
    driver: generateId(),
    negev: generateId(),
    mag: generateId(),
  };
  await db.certificates.bulkAdd([
    { id: certIds.marksman, name: 'קלע', createdAt: now },
    { id: certIds.medic, name: 'חובש', createdAt: now },
    { id: certIds.driver, name: 'נהג', createdAt: now },
    { id: certIds.negev, name: 'נגב', createdAt: now },
    { id: certIds.mag, name: 'מג', createdAt: now },
  ]);

  // Create sample soldiers
  const sampleSoldiers: Soldier[] = [
    { id: generateId(), name: 'ישראל ישראלי', personalNumber: '1234567', phoneNumber: '050-1234567', role: 'nco', status: 'available', platoonId, squadId: squadIds[0], certificateIds: [certIds.driver, certIds.medic], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'משה כהן', personalNumber: '2345678', phoneNumber: '052-2345678', role: 'soldier', status: 'available', platoonId, squadId: squadIds[0], certificateIds: [certIds.marksman], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'דוד לוי', personalNumber: '3456789', phoneNumber: '054-3456789', role: 'soldier', status: 'available', platoonId, squadId: squadIds[0], certificateIds: [certIds.negev], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'יעקב אברהם', personalNumber: '4567890', phoneNumber: '050-4567890', role: 'nco', status: 'available', platoonId, squadId: squadIds[1], certificateIds: [certIds.driver, certIds.marksman], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'אבי רוזן', personalNumber: '5678901', phoneNumber: '052-5678901', role: 'soldier', status: 'available', platoonId, squadId: squadIds[1], certificateIds: [certIds.mag], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'רון שמעון', personalNumber: '6789012', phoneNumber: '054-6789012', role: 'soldier', status: 'home', platoonId, squadId: squadIds[1], certificateIds: [], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'עמית גולן', personalNumber: '7890123', phoneNumber: '050-7890123', role: 'nco', status: 'available', platoonId, squadId: squadIds[2], certificateIds: [certIds.medic], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'תומר נחום', personalNumber: '8901234', phoneNumber: '052-8901234', role: 'soldier', status: 'available', platoonId, squadId: squadIds[2], certificateIds: [certIds.driver], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'גיל בראון', personalNumber: '9012345', phoneNumber: '054-9012345', role: 'soldier', status: 'sick', platoonId, squadId: squadIds[2], certificateIds: [], fairnessScore: 0, createdAt: now, updatedAt: now },
  ];

  await db.soldiers.bulkAdd(sampleSoldiers);

  // Create sample missions
  const sampleMissions: Mission[] = [
    { id: generateId(), name: 'שמירה - שער ראשי', type: 'A_continuous', intensity: 1.0, requiredSoldiers: 2, requiredCertificateIds: [certIds.marksman], platoonId, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'כוננות', type: 'A_continuous', intensity: 0.4, requiredSoldiers: 4, requiredCertificateIds: [], platoonId, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'סיור היקפי', type: 'C_adhoc', intensity: 0.8, requiredSoldiers: 2, requiredCertificateIds: [certIds.driver], platoonId, createdAt: now, updatedAt: now },
  ];

  await db.missions.bulkAdd(sampleMissions);

  console.log('Database seeded successfully');
}

// Clear all data (for testing/reset)
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', [db.soldiers, db.missions, db.shifts, db.platoons, db.squads, db.certificates], async () => {
    await db.soldiers.clear();
    await db.missions.clear();
    await db.shifts.clear();
    await db.platoons.clear();
    await db.squads.clear();
    await db.certificates.clear();
  });
  console.log('Database cleared');
}

// Export database for backup
export async function exportDatabase(): Promise<string> {
  const data = {
    soldiers: await db.soldiers.toArray(),
    missions: await db.missions.toArray(),
    shifts: await db.shifts.toArray(),
    platoons: await db.platoons.toArray(),
    squads: await db.squads.toArray(),
    certificates: await db.certificates.toArray(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Import database from backup
export async function importDatabase(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);

  await clearDatabase();

  await db.transaction('rw', [db.soldiers, db.missions, db.shifts, db.platoons, db.squads, db.certificates], async () => {
    if (data.platoons) await db.platoons.bulkAdd(data.platoons);
    if (data.squads) await db.squads.bulkAdd(data.squads);
    if (data.certificates) await db.certificates.bulkAdd(data.certificates);
    if (data.soldiers) await db.soldiers.bulkAdd(data.soldiers);
    if (data.missions) await db.missions.bulkAdd(data.missions);
    if (data.shifts) await db.shifts.bulkAdd(data.shifts);
  });

  console.log('Database imported successfully');
}
