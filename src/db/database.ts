import Dexie, { type EntityTable } from 'dexie';
import type { Soldier, Mission, Shift, Platoon, Squad, Certificate, SoldierStatusDef } from '../types/entities';

// Database class extending Dexie
class ShavtzakDatabase extends Dexie {
  soldiers!: EntityTable<Soldier, 'id'>;
  missions!: EntityTable<Mission, 'id'>;
  shifts!: EntityTable<Shift, 'id'>;
  platoons!: EntityTable<Platoon, 'id'>;
  squads!: EntityTable<Squad, 'id'>;
  certificates!: EntityTable<Certificate, 'id'>;
  statuses!: EntityTable<SoldierStatusDef, 'id'>;

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

    // Version 6: Add statuses table and migrate soldiers from status to statusId
    this.version(6).stores({
      soldiers: 'id, platoonId, squadId, statusId, name',
      missions: 'id, platoonId, name',
      shifts: 'id, missionId, soldierId, startTime, endTime, status',
      platoons: 'id, companyId, name',
      squads: 'id, platoonId, name',
      certificates: 'id, name',
      statuses: 'id, name',
    }).upgrade(async tx => {
      // Create default statuses
      const now = new Date();
      const defaultStatuses = [
        { id: 'status-available', name: 'זמין', color: '#10B981', isAvailable: true, createdAt: now },
        { id: 'status-home', name: 'בבית', color: '#6B7280', isAvailable: false, createdAt: now },
        { id: 'status-sick', name: 'חולה', color: '#EF4444', isAvailable: false, createdAt: now },
        { id: 'status-task_locked', name: 'תפוס במשימה', color: '#F59E0B', isAvailable: false, createdAt: now },
      ];

      await tx.table('statuses').bulkAdd(defaultStatuses);

      // Migrate soldiers from old status string to statusId
      const statusMap: Record<string, string> = {
        'available': 'status-available',
        'home': 'status-home',
        'sick': 'status-sick',
        'task_locked': 'status-task_locked',
      };

      return tx.table('soldiers').toCollection().modify(soldier => {
        if (soldier.status && !soldier.statusId) {
          soldier.statusId = statusMap[soldier.status] || 'status-available';
          delete soldier.status;
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
let seedingInProgress = false;

export async function seedDatabase(): Promise<void> {
  // Prevent race condition from React StrictMode double-invocation
  if (seedingInProgress) {
    console.log('Seeding already in progress');
    return;
  }
  seedingInProgress = true;

  try {
    const platoonCount = await db.platoons.count();
    if (platoonCount > 0) {
      console.log('Database already seeded');
      return;
    }

    const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Create platoons
  const platoonIds = {
    aleph: generateId(),
    bet: generateId(),
    gimel: generateId(),
  };

  await db.platoons.bulkAdd([
    { id: platoonIds.aleph, name: 'מחלקה א׳', companyId: 'company-1', color: '#3B82F6', createdAt: now }, // blue
    { id: platoonIds.bet, name: 'מחלקה ב׳', companyId: 'company-1', color: '#10B981', createdAt: now }, // emerald
    { id: platoonIds.gimel, name: 'מחלקה ג׳', companyId: 'company-1', color: '#F59E0B', createdAt: now }, // amber
  ]);

  // Create squads for each platoon
  const squadIds = {
    aleph1: generateId(), aleph2: generateId(), aleph3: generateId(),
    bet1: generateId(), bet2: generateId(), bet3: generateId(),
    gimel1: generateId(), gimel2: generateId(), gimel3: generateId(),
  };

  await db.squads.bulkAdd([
    // מחלקה א׳
    { id: squadIds.aleph1, name: 'כיתה א׳1', platoonId: platoonIds.aleph, createdAt: now },
    { id: squadIds.aleph2, name: 'כיתה א׳2', platoonId: platoonIds.aleph, createdAt: now },
    { id: squadIds.aleph3, name: 'כיתה א׳3', platoonId: platoonIds.aleph, createdAt: now },
    // מחלקה ב׳
    { id: squadIds.bet1, name: 'כיתה ב׳1', platoonId: platoonIds.bet, createdAt: now },
    { id: squadIds.bet2, name: 'כיתה ב׳2', platoonId: platoonIds.bet, createdAt: now },
    { id: squadIds.bet3, name: 'כיתה ב׳3', platoonId: platoonIds.bet, createdAt: now },
    // מחלקה ג׳
    { id: squadIds.gimel1, name: 'כיתה ג׳1', platoonId: platoonIds.gimel, createdAt: now },
    { id: squadIds.gimel2, name: 'כיתה ג׳2', platoonId: platoonIds.gimel, createdAt: now },
    { id: squadIds.gimel3, name: 'כיתה ג׳3', platoonId: platoonIds.gimel, createdAt: now },
  ]);

  // Create certificates
  const certIds = {
    marksman: generateId(),
    medic: generateId(),
    driver: generateId(),
    negev: generateId(),
    mag: generateId(),
    commander: generateId(),
  };
  await db.certificates.bulkAdd([
    { id: certIds.marksman, name: 'קלע', createdAt: now },
    { id: certIds.medic, name: 'חובש', createdAt: now },
    { id: certIds.driver, name: 'נהג', createdAt: now },
    { id: certIds.negev, name: 'נגב', createdAt: now },
    { id: certIds.mag, name: 'מג', createdAt: now },
    { id: certIds.commander, name: 'מפקד כיתה', createdAt: now },
  ]);

  // Create default statuses
  const statusIds = {
    available: generateId(),
    home: generateId(),
    sick: generateId(),
    taskLocked: generateId(),
  };
  await db.statuses.bulkAdd([
    { id: statusIds.available, name: 'זמין', color: '#10B981', isAvailable: true, createdAt: now },
    { id: statusIds.home, name: 'בבית', color: '#6B7280', isAvailable: false, createdAt: now },
    { id: statusIds.sick, name: 'חולה', color: '#EF4444', isAvailable: false, createdAt: now },
    { id: statusIds.taskLocked, name: 'תפוס במשימה', color: '#F59E0B', isAvailable: false, createdAt: now },
  ]);

  // Create soldiers - store IDs for shift creation
  const soldierIds: string[] = [];

  const sampleSoldiers: Soldier[] = [
    // מחלקה א׳ - כיתה 1
    { id: generateId(), name: 'ישראל ישראלי', personalNumber: '1234567', phoneNumber: '050-1234567', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph1, certificateIds: [certIds.driver, certIds.medic, certIds.commander], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'משה כהן', personalNumber: '2345678', phoneNumber: '052-2345678', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph1, certificateIds: [certIds.marksman], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'דוד לוי', personalNumber: '3456789', phoneNumber: '054-3456789', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph1, certificateIds: [certIds.negev], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'יוסי אלון', personalNumber: '3456001', phoneNumber: '050-3456001', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph1, certificateIds: [], createdAt: now, updatedAt: now },
    // מחלקה א׳ - כיתה 2
    { id: generateId(), name: 'יעקב אברהם', personalNumber: '4567890', phoneNumber: '050-4567890', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph2, certificateIds: [certIds.driver, certIds.marksman, certIds.commander], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'אבי רוזן', personalNumber: '5678901', phoneNumber: '052-5678901', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph2, certificateIds: [certIds.mag], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'רון שמעון', personalNumber: '6789012', phoneNumber: '054-6789012', role: 'soldier', statusId: statusIds.home, platoonId: platoonIds.aleph, squadId: squadIds.aleph2, certificateIds: [], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'נתן ברק', personalNumber: '6789013', phoneNumber: '052-6789013', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph2, certificateIds: [certIds.driver], createdAt: now, updatedAt: now },
    // מחלקה א׳ - כיתה 3
    { id: generateId(), name: 'עמית גולן', personalNumber: '7890123', phoneNumber: '050-7890123', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph3, certificateIds: [certIds.medic, certIds.commander], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'תומר נחום', personalNumber: '8901234', phoneNumber: '052-8901234', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.aleph, squadId: squadIds.aleph3, certificateIds: [certIds.driver], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'גיל בראון', personalNumber: '9012345', phoneNumber: '054-9012345', role: 'soldier', statusId: statusIds.sick, platoonId: platoonIds.aleph, squadId: squadIds.aleph3, certificateIds: [], createdAt: now, updatedAt: now },

    // מחלקה ב׳ - כיתה 1
    { id: generateId(), name: 'אריאל שרון', personalNumber: '1111111', phoneNumber: '050-1111111', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet1, certificateIds: [certIds.commander, certIds.marksman], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'בני גנץ', personalNumber: '1111112', phoneNumber: '052-1111112', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet1, certificateIds: [certIds.driver], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'גדי איזנקוט', personalNumber: '1111113', phoneNumber: '054-1111113', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet1, certificateIds: [certIds.negev, certIds.marksman], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'דני חלוץ', personalNumber: '1111114', phoneNumber: '050-1111114', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet1, certificateIds: [], createdAt: now, updatedAt: now },
    // מחלקה ב׳ - כיתה 2
    { id: generateId(), name: 'הראל לוי', personalNumber: '2222221', phoneNumber: '052-2222221', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet2, certificateIds: [certIds.commander, certIds.medic], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'ורד כהן', personalNumber: '2222222', phoneNumber: '054-2222222', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet2, certificateIds: [certIds.mag], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'זיו אדם', personalNumber: '2222223', phoneNumber: '050-2222223', role: 'soldier', statusId: statusIds.home, platoonId: platoonIds.bet, squadId: squadIds.bet2, certificateIds: [certIds.driver], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'חן נאור', personalNumber: '2222224', phoneNumber: '052-2222224', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet2, certificateIds: [], createdAt: now, updatedAt: now },
    // מחלקה ב׳ - כיתה 3
    { id: generateId(), name: 'טל רמון', personalNumber: '3333331', phoneNumber: '054-3333331', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet3, certificateIds: [certIds.commander, certIds.driver], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'יובל דיין', personalNumber: '3333332', phoneNumber: '050-3333332', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet3, certificateIds: [certIds.marksman], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'כפיר לביא', personalNumber: '3333333', phoneNumber: '052-3333333', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.bet, squadId: squadIds.bet3, certificateIds: [certIds.negev], createdAt: now, updatedAt: now },

    // מחלקה ג׳ - כיתה 1
    { id: generateId(), name: 'ליאור אשכנזי', personalNumber: '4444441', phoneNumber: '050-4444441', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel1, certificateIds: [certIds.commander, certIds.medic, certIds.driver], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'מיכאל זוהר', personalNumber: '4444442', phoneNumber: '052-4444442', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel1, certificateIds: [certIds.marksman], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'נועם קמחי', personalNumber: '4444443', phoneNumber: '054-4444443', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel1, certificateIds: [certIds.mag], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'סהר טוב', personalNumber: '4444444', phoneNumber: '050-4444444', role: 'soldier', statusId: statusIds.sick, platoonId: platoonIds.gimel, squadId: squadIds.gimel1, certificateIds: [], createdAt: now, updatedAt: now },
    // מחלקה ג׳ - כיתה 2
    { id: generateId(), name: 'עידן רייכל', personalNumber: '5555551', phoneNumber: '052-5555551', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel2, certificateIds: [certIds.commander], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'פז שמש', personalNumber: '5555552', phoneNumber: '054-5555552', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel2, certificateIds: [certIds.driver, certIds.negev], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'צחי הלוי', personalNumber: '5555553', phoneNumber: '050-5555553', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel2, certificateIds: [certIds.marksman], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'קובי פרץ', personalNumber: '5555554', phoneNumber: '052-5555554', role: 'soldier', statusId: statusIds.home, platoonId: platoonIds.gimel, squadId: squadIds.gimel2, certificateIds: [], createdAt: now, updatedAt: now },
    // מחלקה ג׳ - כיתה 3
    { id: generateId(), name: 'רועי גל', personalNumber: '6666661', phoneNumber: '054-6666661', role: 'nco', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel3, certificateIds: [certIds.commander, certIds.medic], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'שי אגסי', personalNumber: '6666662', phoneNumber: '050-6666662', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel3, certificateIds: [certIds.driver], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'תמיר לוין', personalNumber: '6666663', phoneNumber: '052-6666663', role: 'soldier', statusId: statusIds.available, platoonId: platoonIds.gimel, squadId: squadIds.gimel3, certificateIds: [certIds.mag, certIds.negev], createdAt: now, updatedAt: now },
  ];

  // Collect soldier IDs for shift assignment
  sampleSoldiers.forEach(s => soldierIds.push(s.id));
  await db.soldiers.bulkAdd(sampleSoldiers);

  // Create missions
  const missionIds = {
    gate: generateId(),
    patrol: generateId(),
    standby: generateId(),
    observation: generateId(),
    escort: generateId(),
    command: generateId(),
  };

  const sampleMissions: Mission[] = [
    { id: missionIds.gate, name: 'שמירה - שער ראשי', intensity: 1.0, requiredSoldiers: 2, requiredCertificateIds: [certIds.marksman], platoonId: platoonIds.aleph, createdAt: now, updatedAt: now },
    { id: missionIds.patrol, name: 'סיור היקפי', intensity: 0.8, requiredSoldiers: 2, requiredCertificateIds: [certIds.driver], platoonId: platoonIds.aleph, createdAt: now, updatedAt: now },
    { id: missionIds.standby, name: 'כוננות', intensity: 0.4, requiredSoldiers: 4, requiredCertificateIds: [], platoonId: platoonIds.aleph, createdAt: now, updatedAt: now },
    { id: missionIds.observation, name: 'תצפית', intensity: 0.6, requiredSoldiers: 1, requiredCertificateIds: [], platoonId: platoonIds.bet, createdAt: now, updatedAt: now },
    { id: missionIds.escort, name: 'ליווי', intensity: 0.8, requiredSoldiers: 3, requiredCertificateIds: [certIds.driver], platoonId: platoonIds.bet, createdAt: now, updatedAt: now },
    { id: missionIds.command, name: 'פיקוד', intensity: 0.6, requiredSoldiers: 1, requiredCertificateIds: [certIds.commander], platoonId: platoonIds.gimel, createdAt: now, updatedAt: now },
  ];

  await db.missions.bulkAdd(sampleMissions);

  // Create sample shifts for today
  const shifts: Shift[] = [
    // שמירה - שער ראשי - morning
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[1], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[2], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    // שמירה - שער ראשי - afternoon
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[4], startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[5], startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    // שמירה - שער ראשי - evening
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[8], startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[9], startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    // שמירה - שער ראשי - night
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[11], startTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 22 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.gate, soldierId: soldierIds[12], startTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 22 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },

    // סיור היקפי
    { id: generateId(), missionId: missionIds.patrol, soldierId: soldierIds[0], startTime: new Date(today.getTime() + 8 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.patrol, soldierId: soldierIds[7], startTime: new Date(today.getTime() + 8 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.patrol, soldierId: soldierIds[13], startTime: new Date(today.getTime() + 16 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 20 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.patrol, soldierId: soldierIds[19], startTime: new Date(today.getTime() + 16 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 20 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },

    // כוננות
    { id: generateId(), missionId: missionIds.standby, soldierId: soldierIds[3], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.standby, soldierId: soldierIds[14], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.standby, soldierId: soldierIds[23], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.standby, soldierId: soldierIds[27], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },

    // תצפית
    { id: generateId(), missionId: missionIds.observation, soldierId: soldierIds[15], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.observation, soldierId: soldierIds[20], startTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.observation, soldierId: soldierIds[21], startTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },

    // ליווי
    { id: generateId(), missionId: missionIds.escort, soldierId: soldierIds[16], startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 13 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.escort, soldierId: soldierIds[24], startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 13 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.escort, soldierId: soldierIds[28], startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 13 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },

    // פיקוד
    { id: generateId(), missionId: missionIds.command, soldierId: soldierIds[22], startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
    { id: generateId(), missionId: missionIds.command, soldierId: soldierIds[31], startTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), endTime: new Date(today.getTime() + 30 * 60 * 60 * 1000), status: 'scheduled', createdAt: now },
  ];

  await db.shifts.bulkAdd(shifts);

  console.log('Database seeded successfully with extended data');
  } finally {
    seedingInProgress = false;
  }
}

// Clear all data (for testing/reset)
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', [db.soldiers, db.missions, db.shifts, db.platoons, db.squads, db.certificates, db.statuses], async () => {
    await db.soldiers.clear();
    await db.missions.clear();
    await db.shifts.clear();
    await db.platoons.clear();
    await db.squads.clear();
    await db.certificates.clear();
    await db.statuses.clear();
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
    statuses: await db.statuses.toArray(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Import database from backup
export async function importDatabase(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);

  await clearDatabase();

  await db.transaction('rw', [db.soldiers, db.missions, db.shifts, db.platoons, db.squads, db.certificates, db.statuses], async () => {
    if (data.platoons) await db.platoons.bulkAdd(data.platoons);
    if (data.squads) await db.squads.bulkAdd(data.squads);
    if (data.certificates) await db.certificates.bulkAdd(data.certificates);
    if (data.statuses) await db.statuses.bulkAdd(data.statuses);
    if (data.soldiers) await db.soldiers.bulkAdd(data.soldiers);
    if (data.missions) await db.missions.bulkAdd(data.missions);
    if (data.shifts) await db.shifts.bulkAdd(data.shifts);
  });

  console.log('Database imported successfully');
}
