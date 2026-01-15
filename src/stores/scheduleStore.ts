import { create } from 'zustand';
import { db, generateId } from '../db/database';
import type { Shift, CreateShiftInput, UpdateShiftInput, ShiftStatus } from '../types/entities';
import { startOfDay, endOfDay, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

interface ScheduleState {
  shifts: Shift[];
  selectedDate: Date;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadShifts: () => Promise<void>;
  loadShiftsForDate: (date: Date) => Promise<void>;
  addShift: (input: CreateShiftInput) => Promise<Shift>;
  updateShift: (id: string, input: UpdateShiftInput) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  updateShiftStatus: (id: string, status: ShiftStatus) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  cleanupOrphanedShifts: () => Promise<number>;

  // Queries
  getShiftsForMission: (missionId: string, date: Date) => Shift[];
  getShiftsForSoldier: (soldierId: string, date?: Date) => Shift[];
  getSoldierPreviousShift: (soldierId: string, beforeTime: Date) => Shift | undefined;
  hasOverlappingShift: (soldierId: string, startTime: Date, endTime: Date, excludeShiftId?: string) => boolean;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  shifts: [],
  selectedDate: new Date(),
  isLoading: false,
  error: null,

  loadShifts: async () => {
    set({ isLoading: true, error: null });
    try {
      // First, cleanup orphaned shifts (from deleted missions/soldiers/platoons)
      const missions = await db.missions.toArray();
      const validMissionIds = new Set(missions.map((m) => m.id));
      const soldiers = await db.soldiers.toArray();
      const validSoldierIds = new Set(soldiers.map((s) => s.id));
      const platoons = await db.platoons.toArray();
      const validPlatoonIds = new Set(platoons.map((p) => p.id));

      // Also track missions that belong to non-existent platoons
      const missionsWithValidPlatoons = new Set(
        missions.filter((m) => validPlatoonIds.has(m.platoonId)).map((m) => m.id)
      );

      const allShifts = await db.shifts.toArray();
      const orphanedShiftIds = allShifts
        .filter((s) =>
          !validMissionIds.has(s.missionId) ||
          !validSoldierIds.has(s.soldierId) ||
          !missionsWithValidPlatoons.has(s.missionId)
        )
        .map((s) => s.id);

      if (orphanedShiftIds.length > 0) {
        console.log(`Cleaning up ${orphanedShiftIds.length} orphaned shifts`);
        await db.shifts.bulkDelete(orphanedShiftIds);
      }

      // Load remaining valid shifts
      const shifts = await db.shifts.toArray();
      // Convert date strings back to Date objects
      const parsedShifts = shifts.map((s) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        createdAt: new Date(s.createdAt),
      }));
      set({ shifts: parsedShifts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadShiftsForDate: async (date: Date) => {
    set({ isLoading: true, error: null });
    try {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const shifts = await db.shifts
        .where('startTime')
        .between(dayStart, dayEnd, true, true)
        .toArray();

      const parsedShifts = shifts.map((s) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        createdAt: new Date(s.createdAt),
      }));

      set({ shifts: parsedShifts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addShift: async (input: CreateShiftInput) => {
    const now = new Date();
    const shift: Shift = {
      ...input,
      id: generateId(),
      fairnessPoints: 0, // Will be calculated by fairness service
      createdAt: now,
    };

    await db.shifts.add(shift);
    set((state) => ({ shifts: [...state.shifts, shift] }));
    return shift;
  },

  updateShift: async (id: string, input: UpdateShiftInput) => {
    await db.shifts.update(id, input);
    set((state) => ({
      shifts: state.shifts.map((s) =>
        s.id === id ? { ...s, ...input } : s
      ),
    }));
  },

  deleteShift: async (id: string) => {
    await db.shifts.delete(id);
    set((state) => ({
      shifts: state.shifts.filter((s) => s.id !== id),
    }));
  },

  updateShiftStatus: async (id: string, status: ShiftStatus) => {
    await db.shifts.update(id, { status });
    set((state) => ({
      shifts: state.shifts.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    }));
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  getShiftsForMission: (missionId: string, date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return get().shifts.filter(
      (s) =>
        s.missionId === missionId &&
        isWithinInterval(s.startTime, { start: dayStart, end: dayEnd })
    );
  },

  getShiftsForSoldier: (soldierId: string, date?: Date) => {
    const shifts = get().shifts.filter((s) => s.soldierId === soldierId);

    if (date) {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      return shifts.filter((s) =>
        isWithinInterval(s.startTime, { start: dayStart, end: dayEnd })
      );
    }

    return shifts;
  },

  getSoldierPreviousShift: (soldierId: string, beforeTime: Date) => {
    const soldierShifts = get()
      .shifts.filter(
        (s) => s.soldierId === soldierId && s.endTime < beforeTime
      )
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

    return soldierShifts[0];
  },

  hasOverlappingShift: (
    soldierId: string,
    startTime: Date,
    endTime: Date,
    excludeShiftId?: string
  ) => {
    const soldierShifts = get().shifts.filter(
      (s) => s.soldierId === soldierId && s.id !== excludeShiftId
    );

    return soldierShifts.some((s) =>
      areIntervalsOverlapping(
        { start: s.startTime, end: s.endTime },
        { start: startTime, end: endTime }
      )
    );
  },

  cleanupOrphanedShifts: async () => {
    try {
      // Get all valid entities
      const missions = await db.missions.toArray();
      const validMissionIds = new Set(missions.map((m) => m.id));
      const soldiers = await db.soldiers.toArray();
      const validSoldierIds = new Set(soldiers.map((s) => s.id));
      const platoons = await db.platoons.toArray();
      const validPlatoonIds = new Set(platoons.map((p) => p.id));

      // Missions with valid platoons
      const missionsWithValidPlatoons = new Set(
        missions.filter((m) => validPlatoonIds.has(m.platoonId)).map((m) => m.id)
      );

      // Find orphaned shifts
      const allShifts = await db.shifts.toArray();
      const orphanedShiftIds = allShifts
        .filter((s) =>
          !validMissionIds.has(s.missionId) ||
          !validSoldierIds.has(s.soldierId) ||
          !missionsWithValidPlatoons.has(s.missionId)
        )
        .map((s) => s.id);

      // Delete orphaned shifts
      if (orphanedShiftIds.length > 0) {
        console.log(`Cleaning up ${orphanedShiftIds.length} orphaned shifts`);
        await db.shifts.bulkDelete(orphanedShiftIds);
        // Update local state
        set((state) => ({
          shifts: state.shifts.filter((s) => !orphanedShiftIds.includes(s.id)),
        }));
      }

      return orphanedShiftIds.length;
    } catch (error) {
      console.error('Failed to cleanup orphaned shifts:', error);
      return 0;
    }
  },
}));
