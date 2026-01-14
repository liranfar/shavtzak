import Dexie, { type EntityTable } from 'dexie';
import type { Soldier, Mission, Shift, Platoon, Squad } from '../types/entities';

// Database class extending Dexie
class ShavtzakDatabase extends Dexie {
  soldiers!: EntityTable<Soldier, 'id'>;
  missions!: EntityTable<Mission, 'id'>;
  shifts!: EntityTable<Shift, 'id'>;
  platoons!: EntityTable<Platoon, 'id'>;
  squads!: EntityTable<Squad, 'id'>;

  constructor() {
    super('shavtzak');

    this.version(1).stores({
      soldiers: 'id, platoonId, squadId, status, name',
      missions: 'id, platoonId, type, name',
      shifts: 'id, missionId, soldierId, startTime, endTime, status',
      platoons: 'id, companyId, name',
      squads: 'id, platoonId, name',
    });
  }
}

// Create singleton instance
export const db = new ShavtzakDatabase();

// Helper to generate unique IDs
export function generateId(): string {
  return crypto.randomUUID();
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
    createdAt: now,
  });

  // Create squads
  const squadIds = [generateId(), generateId(), generateId()];
  await db.squads.bulkAdd([
    { id: squadIds[0], name: 'כיתה 1', platoonId, createdAt: now },
    { id: squadIds[1], name: 'כיתה 2', platoonId, createdAt: now },
    { id: squadIds[2], name: 'כיתה 3', platoonId, createdAt: now },
  ]);

  // Create sample soldiers
  const sampleSoldiers: Soldier[] = [
    { id: generateId(), name: 'ישראל ישראלי', personalNumber: '1234567', role: 'nco', status: 'available', platoonId, squadId: squadIds[0], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'משה כהן', personalNumber: '2345678', role: 'soldier', status: 'available', platoonId, squadId: squadIds[0], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'דוד לוי', personalNumber: '3456789', role: 'soldier', status: 'available', platoonId, squadId: squadIds[0], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'יעקב אברהם', personalNumber: '4567890', role: 'nco', status: 'available', platoonId, squadId: squadIds[1], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'אבי רוזן', personalNumber: '5678901', role: 'soldier', status: 'available', platoonId, squadId: squadIds[1], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'רון שמעון', personalNumber: '6789012', role: 'soldier', status: 'home', platoonId, squadId: squadIds[1], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'עמית גולן', personalNumber: '7890123', role: 'nco', status: 'available', platoonId, squadId: squadIds[2], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'תומר נחום', personalNumber: '8901234', role: 'soldier', status: 'available', platoonId, squadId: squadIds[2], fairnessScore: 0, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'גיל בראון', personalNumber: '9012345', role: 'soldier', status: 'sick', platoonId, squadId: squadIds[2], fairnessScore: 0, createdAt: now, updatedAt: now },
  ];

  await db.soldiers.bulkAdd(sampleSoldiers);

  // Create sample missions
  const sampleMissions: Mission[] = [
    { id: generateId(), name: 'שמירה - שער ראשי', type: 'A_continuous', intensity: 1.0, requiredSoldiers: 2, platoonId, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'כוננות', type: 'A_continuous', intensity: 0.4, requiredSoldiers: 4, platoonId, createdAt: now, updatedAt: now },
    { id: generateId(), name: 'סיור היקפי', type: 'C_adhoc', intensity: 0.8, requiredSoldiers: 2, platoonId, createdAt: now, updatedAt: now },
  ];

  await db.missions.bulkAdd(sampleMissions);

  console.log('Database seeded successfully');
}

// Clear all data (for testing/reset)
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', [db.soldiers, db.missions, db.shifts, db.platoons, db.squads], async () => {
    await db.soldiers.clear();
    await db.missions.clear();
    await db.shifts.clear();
    await db.platoons.clear();
    await db.squads.clear();
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
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Import database from backup
export async function importDatabase(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);

  await clearDatabase();

  await db.transaction('rw', [db.soldiers, db.missions, db.shifts, db.platoons, db.squads], async () => {
    if (data.platoons) await db.platoons.bulkAdd(data.platoons);
    if (data.squads) await db.squads.bulkAdd(data.squads);
    if (data.soldiers) await db.soldiers.bulkAdd(data.soldiers);
    if (data.missions) await db.missions.bulkAdd(data.missions);
    if (data.shifts) await db.shifts.bulkAdd(data.shifts);
  });

  console.log('Database imported successfully');
}
