import { create } from 'zustand';
import { db, generateId } from '../db/database';
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

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  isLoading: false,
  error: null,

  loadMissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const missions = await db.missions.toArray();
      set({ missions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addMission: async (input: CreateMissionInput) => {
    const now = new Date();
    const mission: Mission = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    await db.missions.add(mission);
    set((state) => ({ missions: [...state.missions, mission] }));
    return mission;
  },

  updateMission: async (id: string, input: UpdateMissionInput) => {
    const updates = { ...input, updatedAt: new Date() };
    await db.missions.update(id, updates);
    set((state) => ({
      missions: state.missions.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  deleteMission: async (id: string) => {
    await db.missions.delete(id);
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
