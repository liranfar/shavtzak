import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Mission, CreateMissionInput, UpdateMissionInput } from '../types/entities';

interface MissionState {
  missions: Mission[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMissions: () => Promise<void>;
  addMission: (input: CreateMissionInput) => Promise<Mission>;
  updateMission: (id: string, input: UpdateMissionInput) => Promise<void>;
  deleteMission: (id: string) => Promise<void>;
  getMissionsByPlatoon: (platoonId: string) => Mission[];
  getMissionById: (id: string) => Mission | undefined;
}

// Helper to convert DB row to Mission entity
function toMission(row: {
  id: string;
  name: string;
  required_soldiers: number;
  platoon_id: string | null;
  created_at: string;
  updated_at: string;
}, certificateIds: string[]): Mission {
  return {
    id: row.id,
    name: row.name,
    requiredSoldiers: row.required_soldiers,
    platoonId: row.platoon_id || '',
    requiredCertificateIds: certificateIds,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  isLoading: false,
  error: null,

  loadMissions: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch missions
      const { data: missionRows, error: missionsError } = await supabase
        .from('missions')
        .select('*');

      if (missionsError) throw missionsError;

      // Fetch mission certificates
      const { data: certRows, error: certsError } = await supabase
        .from('mission_certificates')
        .select('*');

      if (certsError) throw certsError;

      // Group certificates by mission
      const certsByMission = (certRows || []).reduce((acc, row) => {
        if (!acc[row.mission_id]) acc[row.mission_id] = [];
        acc[row.mission_id].push(row.certificate_id);
        return acc;
      }, {} as Record<string, string[]>);

      // Map to Mission entities
      const missions = (missionRows || []).map(row =>
        toMission(row, certsByMission[row.id] || [])
      );

      set({ missions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addMission: async (input: CreateMissionInput) => {
    // Insert mission
    const { data: row, error: insertError } = await supabase
      .from('missions')
      .insert({
        name: input.name,
        required_soldiers: input.requiredSoldiers,
        platoon_id: input.platoonId || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Insert certificates if any
    if (input.requiredCertificateIds.length > 0) {
      const { error: certError } = await supabase
        .from('mission_certificates')
        .insert(
          input.requiredCertificateIds.map(certId => ({
            mission_id: row.id,
            certificate_id: certId,
          }))
        );
      if (certError) throw certError;
    }

    const mission = toMission(row, input.requiredCertificateIds);
    set((state) => ({ missions: [...state.missions, mission] }));
    return mission;
  },

  updateMission: async (id: string, input: UpdateMissionInput) => {
    // Update mission fields
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.requiredSoldiers !== undefined) updateData.required_soldiers = input.requiredSoldiers;
    if (input.platoonId !== undefined) updateData.platoon_id = input.platoonId || null;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('missions')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    }

    // Update certificates if provided
    if (input.requiredCertificateIds !== undefined) {
      // Delete existing
      await supabase.from('mission_certificates').delete().eq('mission_id', id);

      // Insert new
      if (input.requiredCertificateIds.length > 0) {
        const { error } = await supabase
          .from('mission_certificates')
          .insert(
            input.requiredCertificateIds.map(certId => ({
              mission_id: id,
              certificate_id: certId,
            }))
          );
        if (error) throw error;
      }
    }

    // Update local state
    set((state) => ({
      missions: state.missions.map((m) =>
        m.id === id ? { ...m, ...input, updatedAt: new Date() } : m
      ),
    }));
  },

  deleteMission: async (id: string) => {
    // Certificates are deleted via CASCADE
    const { error } = await supabase.from('missions').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      missions: state.missions.filter((m) => m.id !== id),
    }));
  },

  getMissionsByPlatoon: (platoonId: string) => {
    return get().missions.filter((m) => m.platoonId === platoonId);
  },

  getMissionById: (id: string) => {
    return get().missions.find((m) => m.id === id);
  },
}));
