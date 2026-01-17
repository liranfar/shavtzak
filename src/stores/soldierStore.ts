import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Soldier, CreateSoldierInput, UpdateSoldierInput } from '../types/entities';

interface SoldierState {
  soldiers: Soldier[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSoldiers: () => Promise<void>;
  addSoldier: (input: CreateSoldierInput) => Promise<Soldier>;
  updateSoldier: (id: string, input: UpdateSoldierInput) => Promise<void>;
  deleteSoldier: (id: string) => Promise<void>;
  updateSoldierStatusId: (id: string, statusId: string) => Promise<void>;
  getSoldiersByPlatoon: (platoonId: string) => Soldier[];
  getSoldiersBySquad: (squadId: string) => Soldier[];
  getSoldiersByStatusIds: (platoonId: string, availableStatusIds: string[]) => Soldier[];
}

// Helper to convert DB row to Soldier entity
function toSoldier(row: {
  id: string;
  name: string;
  personal_number: string | null;
  phone_number: string | null;
  role: string;
  status_id: string | null;
  platoon_id: string | null;
  squad_id: string | null;
  leave_start: string | null;
  leave_end: string | null;
  created_at: string;
  updated_at: string;
}, certificateIds: string[]): Soldier {
  return {
    id: row.id,
    name: row.name,
    personalNumber: row.personal_number || '',
    phoneNumber: row.phone_number || '',
    role: row.role as 'officer' | 'nco' | 'soldier',
    statusId: row.status_id || '',
    platoonId: row.platoon_id || '',
    squadId: row.squad_id || '',
    certificateIds,
    leaveStart: row.leave_start ? new Date(row.leave_start) : null,
    leaveEnd: row.leave_end ? new Date(row.leave_end) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const useSoldierStore = create<SoldierState>((set, get) => ({
  soldiers: [],
  isLoading: false,
  error: null,

  loadSoldiers: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch soldiers
      const { data: soldierRows, error: soldiersError } = await supabase
        .from('soldiers')
        .select('*');

      if (soldiersError) throw soldiersError;

      // Fetch soldier certificates
      const { data: certRows, error: certsError } = await supabase
        .from('soldier_certificates')
        .select('*');

      if (certsError) throw certsError;

      // Group certificates by soldier
      const certsBySoldier = (certRows || []).reduce((acc, row) => {
        if (!acc[row.soldier_id]) acc[row.soldier_id] = [];
        acc[row.soldier_id].push(row.certificate_id);
        return acc;
      }, {} as Record<string, string[]>);

      // Map to Soldier entities
      const soldiers = (soldierRows || []).map(row =>
        toSoldier(row, certsBySoldier[row.id] || [])
      );

      set({ soldiers, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addSoldier: async (input: CreateSoldierInput) => {
    // Insert soldier
    const { data: row, error: insertError } = await supabase
      .from('soldiers')
      .insert({
        name: input.name,
        personal_number: input.personalNumber || null,
        phone_number: input.phoneNumber || null,
        role: input.role,
        status_id: input.statusId || null,
        platoon_id: input.platoonId || null,
        squad_id: input.squadId || null,
        leave_start: input.leaveStart?.toISOString() || null,
        leave_end: input.leaveEnd?.toISOString() || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Insert certificates if any
    if (input.certificateIds.length > 0) {
      const { error: certError } = await supabase
        .from('soldier_certificates')
        .insert(
          input.certificateIds.map(certId => ({
            soldier_id: row.id,
            certificate_id: certId,
          }))
        );
      if (certError) throw certError;
    }

    const soldier = toSoldier(row, input.certificateIds);
    set((state) => ({ soldiers: [...state.soldiers, soldier] }));
    return soldier;
  },

  updateSoldier: async (id: string, input: UpdateSoldierInput) => {
    // Update soldier fields
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.personalNumber !== undefined) updateData.personal_number = input.personalNumber || null;
    if (input.phoneNumber !== undefined) updateData.phone_number = input.phoneNumber || null;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.statusId !== undefined) updateData.status_id = input.statusId || null;
    if (input.platoonId !== undefined) updateData.platoon_id = input.platoonId || null;
    if (input.squadId !== undefined) updateData.squad_id = input.squadId || null;
    if (input.leaveStart !== undefined) updateData.leave_start = input.leaveStart?.toISOString() || null;
    if (input.leaveEnd !== undefined) updateData.leave_end = input.leaveEnd?.toISOString() || null;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('soldiers')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    }

    // Update certificates if provided
    if (input.certificateIds !== undefined) {
      // Delete existing
      await supabase.from('soldier_certificates').delete().eq('soldier_id', id);

      // Insert new
      if (input.certificateIds.length > 0) {
        const { error } = await supabase
          .from('soldier_certificates')
          .insert(
            input.certificateIds.map(certId => ({
              soldier_id: id,
              certificate_id: certId,
            }))
          );
        if (error) throw error;
      }
    }

    // Update local state
    set((state) => ({
      soldiers: state.soldiers.map((s) =>
        s.id === id ? { ...s, ...input, updatedAt: new Date() } : s
      ),
    }));
  },

  deleteSoldier: async (id: string) => {
    // Certificates are deleted via CASCADE
    const { error } = await supabase.from('soldiers').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      soldiers: state.soldiers.filter((s) => s.id !== id),
    }));
  },

  updateSoldierStatusId: async (id: string, statusId: string) => {
    const { error } = await supabase
      .from('soldiers')
      .update({ status_id: statusId || null })
      .eq('id', id);
    if (error) throw error;

    set((state) => ({
      soldiers: state.soldiers.map((s) =>
        s.id === id ? { ...s, statusId, updatedAt: new Date() } : s
      ),
    }));
  },

  getSoldiersByPlatoon: (platoonId: string) => {
    return get().soldiers.filter((s) => s.platoonId === platoonId);
  },

  getSoldiersBySquad: (squadId: string) => {
    return get().soldiers.filter((s) => s.squadId === squadId);
  },

  getSoldiersByStatusIds: (platoonId: string, availableStatusIds: string[]) => {
    return get()
      .soldiers.filter((s) => s.platoonId === platoonId && availableStatusIds.includes(s.statusId));
  },
}));
