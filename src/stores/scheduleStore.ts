import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Shift, CreateShiftInput, UpdateShiftInput, ShiftStatus } from '../types/entities';
import { startOfDay, endOfDay, isWithinInterval, areIntervalsOverlapping, subDays, addDays } from 'date-fns';

interface ScheduleState {
  shifts: Shift[];
  selectedDate: Date;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadShifts: () => Promise<void>;
  loadShiftsForDate: (date: Date) => Promise<void>;
  loadShiftsForDateRange: (centerDate: Date) => Promise<void>;
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

// Helper to convert DB row to Shift entity
function toShift(row: {
  id: string;
  mission_id: string | null;
  soldier_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}): Shift {
  return {
    id: row.id,
    missionId: row.mission_id || '',
    soldierId: row.soldier_id || '',
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    status: row.status as ShiftStatus,
    createdAt: new Date(row.created_at),
  };
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  shifts: [],
  selectedDate: new Date(),
  isLoading: false,
  error: null,

  loadShifts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load all shifts - orphan cleanup is handled by database CASCADE
      const { data, error } = await supabase.from('shifts').select('*');
      if (error) throw error;

      const shifts = (data || []).map(toShift);
      set({ shifts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadShiftsForDate: async (date: Date) => {
    set({ isLoading: true, error: null });
    try {
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd);

      if (error) throw error;

      const shifts = (data || []).map(toShift);
      set({ shifts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadShiftsForDateRange: async (centerDate: Date) => {
    set({ isLoading: true, error: null });
    try {
      // Load shifts for 3 days: previous, current, and next day
      // Also include shifts that might have started before but extend into this range
      const rangeStart = startOfDay(subDays(centerDate, 1));
      const rangeEnd = endOfDay(addDays(centerDate, 1));
      
      // We need shifts where:
      // 1. start_time is within the range, OR
      // 2. end_time is within the range (overnight shifts from before)
      // This is equivalent to: start_time < rangeEnd AND end_time > rangeStart
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .lt('start_time', rangeEnd.toISOString())
        .gt('end_time', rangeStart.toISOString());

      if (error) throw error;

      const shifts = (data || []).map(toShift);
      set({ shifts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addShift: async (input: CreateShiftInput) => {
    const { data: row, error } = await supabase
      .from('shifts')
      .insert({
        mission_id: input.missionId,
        soldier_id: input.soldierId,
        start_time: input.startTime.toISOString(),
        end_time: input.endTime.toISOString(),
        status: input.status,
      })
      .select()
      .single();

    if (error) throw error;

    const shift = toShift(row);
    set((state) => ({ shifts: [...state.shifts, shift] }));
    return shift;
  },

  updateShift: async (id: string, input: UpdateShiftInput) => {
    const updateData: Record<string, unknown> = {};
    if (input.missionId !== undefined) updateData.mission_id = input.missionId;
    if (input.soldierId !== undefined) updateData.soldier_id = input.soldierId;
    if (input.startTime !== undefined) updateData.start_time = input.startTime.toISOString();
    if (input.endTime !== undefined) updateData.end_time = input.endTime.toISOString();
    if (input.status !== undefined) updateData.status = input.status;

    const { error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      shifts: state.shifts.map((s) =>
        s.id === id ? { ...s, ...input } : s
      ),
    }));
  },

  deleteShift: async (id: string) => {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      shifts: state.shifts.filter((s) => s.id !== id),
    }));
  },

  updateShiftStatus: async (id: string, status: ShiftStatus) => {
    const { error } = await supabase
      .from('shifts')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

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

  // With Supabase CASCADE deletes, orphan cleanup is automatic
  // This function is kept for API compatibility but does nothing
  cleanupOrphanedShifts: async () => {
    return 0;
  },
}));
