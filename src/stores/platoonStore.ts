import { create } from 'zustand';
import { db } from '../db/database';
import type { Platoon, Squad } from '../types/entities';

interface PlatoonState {
  platoons: Platoon[];
  squads: Squad[];
  currentPlatoonId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPlatoons: () => Promise<void>;
  loadSquads: () => Promise<void>;
  setCurrentPlatoon: (platoonId: string) => void;

  // Queries
  getCurrentPlatoon: () => Platoon | undefined;
  getSquadsForPlatoon: (platoonId: string) => Squad[];
}

export const usePlatoonStore = create<PlatoonState>((set, get) => ({
  platoons: [],
  squads: [],
  currentPlatoonId: null,
  isLoading: false,
  error: null,

  loadPlatoons: async () => {
    set({ isLoading: true, error: null });
    try {
      const platoons = await db.platoons.toArray();
      const currentPlatoonId = platoons.length > 0 ? platoons[0].id : null;
      set({ platoons, currentPlatoonId, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadSquads: async () => {
    try {
      const squads = await db.squads.toArray();
      set({ squads });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setCurrentPlatoon: (platoonId: string) => {
    set({ currentPlatoonId: platoonId });
  },

  getCurrentPlatoon: () => {
    const { platoons, currentPlatoonId } = get();
    return platoons.find((p) => p.id === currentPlatoonId);
  },

  getSquadsForPlatoon: (platoonId: string) => {
    return get().squads.filter((s) => s.platoonId === platoonId);
  },
}));
