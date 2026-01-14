import { create } from 'zustand';
import { db, generateId } from '../db/database';
import type { Soldier, CreateSoldierInput, UpdateSoldierInput, SoldierStatus } from '../types/entities';

interface SoldierState {
  soldiers: Soldier[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSoldiers: () => Promise<void>;
  addSoldier: (input: CreateSoldierInput) => Promise<Soldier>;
  updateSoldier: (id: string, input: UpdateSoldierInput) => Promise<void>;
  deleteSoldier: (id: string) => Promise<void>;
  updateSoldierStatus: (id: string, status: SoldierStatus) => Promise<void>;
  updateFairnessScore: (id: string, points: number) => Promise<void>;
  getSoldiersByPlatoon: (platoonId: string) => Soldier[];
  getSoldiersBySquad: (squadId: string) => Soldier[];
  getAvailableSoldiers: (platoonId: string) => Soldier[];
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
      fairnessScore: 0,
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

  updateSoldierStatus: async (id: string, status: SoldierStatus) => {
    await db.soldiers.update(id, { status, updatedAt: new Date() });
    set((state) => ({
      soldiers: state.soldiers.map((s) =>
        s.id === id ? { ...s, status, updatedAt: new Date() } : s
      ),
    }));
  },

  updateFairnessScore: async (id: string, points: number) => {
    const soldier = get().soldiers.find((s) => s.id === id);
    if (!soldier) return;

    const newScore = soldier.fairnessScore + points;
    await db.soldiers.update(id, { fairnessScore: newScore, updatedAt: new Date() });
    set((state) => ({
      soldiers: state.soldiers.map((s) =>
        s.id === id ? { ...s, fairnessScore: newScore, updatedAt: new Date() } : s
      ),
    }));
  },

  getSoldiersByPlatoon: (platoonId: string) => {
    return get().soldiers.filter((s) => s.platoonId === platoonId);
  },

  getSoldiersBySquad: (squadId: string) => {
    return get().soldiers.filter((s) => s.squadId === squadId);
  },

  getAvailableSoldiers: (platoonId: string) => {
    return get()
      .soldiers.filter((s) => s.platoonId === platoonId && s.status === 'available')
      .sort((a, b) => a.fairnessScore - b.fairnessScore);
  },
}));
