import { create } from 'zustand';
import { db, generateId } from '../db/database';
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

export const useSoldierStore = create<SoldierState>((set, get) => ({
  soldiers: [],
  isLoading: false,
  error: null,

  loadSoldiers: async () => {
    set({ isLoading: true, error: null });
    try {
      const soldiers = await db.soldiers.toArray();
      set({ soldiers, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addSoldier: async (input: CreateSoldierInput) => {
    const now = new Date();
    const soldier: Soldier = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    await db.soldiers.add(soldier);
    set((state) => ({ soldiers: [...state.soldiers, soldier] }));
    return soldier;
  },

  updateSoldier: async (id: string, input: UpdateSoldierInput) => {
    const updates = { ...input, updatedAt: new Date() };
    await db.soldiers.update(id, updates);
    set((state) => ({
      soldiers: state.soldiers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },

  deleteSoldier: async (id: string) => {
    await db.soldiers.delete(id);
    set((state) => ({
      soldiers: state.soldiers.filter((s) => s.id !== id),
    }));
  },

  updateSoldierStatusId: async (id: string, statusId: string) => {
    await db.soldiers.update(id, { statusId, updatedAt: new Date() });
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
