import { create } from 'zustand';
import { db, generateId, generatePlatoonColor } from '../db/database';
import type { Platoon, Squad, Certificate, SoldierStatusDef } from '../types/entities';

interface PlatoonState {
  platoons: Platoon[];
  squads: Squad[];
  certificates: Certificate[];
  statuses: SoldierStatusDef[];
  currentPlatoonId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPlatoons: () => Promise<void>;
  loadSquads: () => Promise<void>;
  loadCertificates: () => Promise<void>;
  loadStatuses: () => Promise<void>;
  setCurrentPlatoon: (platoonId: string) => void;

  // Platoon CRUD
  addPlatoon: (name: string) => Promise<Platoon>;
  updatePlatoon: (id: string, name: string) => Promise<void>;
  deletePlatoon: (id: string) => Promise<void>;

  // Squad CRUD
  addSquad: (name: string, platoonId: string) => Promise<Squad>;
  updateSquad: (id: string, name: string) => Promise<void>;
  deleteSquad: (id: string) => Promise<void>;

  // Certificate CRUD
  addCertificate: (name: string) => Promise<Certificate>;
  updateCertificate: (id: string, name: string) => Promise<void>;
  deleteCertificate: (id: string) => Promise<void>;

  // Status CRUD
  addStatus: (name: string, color: string, isAvailable: boolean) => Promise<SoldierStatusDef>;
  updateStatus: (id: string, updates: Partial<Omit<SoldierStatusDef, 'id' | 'createdAt'>>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;

  // Queries
  getCurrentPlatoon: () => Platoon | undefined;
  getSquadsForPlatoon: (platoonId: string) => Squad[];
  getStatusById: (id: string) => SoldierStatusDef | undefined;
}

export const usePlatoonStore = create<PlatoonState>((set, get) => ({
  platoons: [],
  squads: [],
  certificates: [],
  statuses: [],
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

  loadCertificates: async () => {
    try {
      const certificates = await db.certificates.toArray();
      set({ certificates });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadStatuses: async () => {
    try {
      const statuses = await db.statuses.toArray();
      set({ statuses });
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

  // Platoon CRUD
  addPlatoon: async (name: string) => {
    const platoon: Platoon = {
      id: generateId(),
      name,
      companyId: 'company-1',
      color: generatePlatoonColor(),
      createdAt: new Date(),
    };
    await db.platoons.add(platoon);
    set((state) => ({ platoons: [...state.platoons, platoon] }));
    return platoon;
  },

  updatePlatoon: async (id: string, name: string) => {
    await db.platoons.update(id, { name });
    set((state) => ({
      platoons: state.platoons.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  },

  deletePlatoon: async (id: string) => {
    await db.platoons.delete(id);
    // Also delete associated squads
    const squadsToDelete = get().squads.filter((s) => s.platoonId === id);
    for (const squad of squadsToDelete) {
      await db.squads.delete(squad.id);
    }
    set((state) => ({
      platoons: state.platoons.filter((p) => p.id !== id),
      squads: state.squads.filter((s) => s.platoonId !== id),
      currentPlatoonId: state.currentPlatoonId === id ? null : state.currentPlatoonId,
    }));
  },

  // Squad CRUD
  addSquad: async (name: string, platoonId: string) => {
    const squad: Squad = {
      id: generateId(),
      name,
      platoonId,
      createdAt: new Date(),
    };
    await db.squads.add(squad);
    set((state) => ({ squads: [...state.squads, squad] }));
    return squad;
  },

  updateSquad: async (id: string, name: string) => {
    await db.squads.update(id, { name });
    set((state) => ({
      squads: state.squads.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
  },

  deleteSquad: async (id: string) => {
    await db.squads.delete(id);
    set((state) => ({
      squads: state.squads.filter((s) => s.id !== id),
    }));
  },

  // Certificate CRUD
  addCertificate: async (name: string) => {
    const certificate: Certificate = {
      id: generateId(),
      name,
      createdAt: new Date(),
    };
    await db.certificates.add(certificate);
    set((state) => ({ certificates: [...state.certificates, certificate] }));
    return certificate;
  },

  updateCertificate: async (id: string, name: string) => {
    await db.certificates.update(id, { name });
    set((state) => ({
      certificates: state.certificates.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },

  deleteCertificate: async (id: string) => {
    await db.certificates.delete(id);
    set((state) => ({
      certificates: state.certificates.filter((c) => c.id !== id),
    }));
  },

  // Status CRUD
  addStatus: async (name: string, color: string, isAvailable: boolean) => {
    const status: SoldierStatusDef = {
      id: generateId(),
      name,
      color,
      isAvailable,
      createdAt: new Date(),
    };
    await db.statuses.add(status);
    set((state) => ({ statuses: [...state.statuses, status] }));
    return status;
  },

  updateStatus: async (id: string, updates: Partial<Omit<SoldierStatusDef, 'id' | 'createdAt'>>) => {
    await db.statuses.update(id, updates);
    set((state) => ({
      statuses: state.statuses.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  },

  deleteStatus: async (id: string) => {
    await db.statuses.delete(id);
    set((state) => ({
      statuses: state.statuses.filter((s) => s.id !== id),
    }));
  },

  getStatusById: (id: string) => {
    return get().statuses.find((s) => s.id === id);
  },
}));
