import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Platoon, Squad, Certificate, SoldierStatusDef } from '../types/entities';

// Predefined colors for platoons
const PLATOON_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function generatePlatoonColor(): string {
  return PLATOON_COLORS[Math.floor(Math.random() * PLATOON_COLORS.length)];
}

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
      const { data, error } = await supabase.from('platoons').select('*');
      if (error) throw error;

      const platoons: Platoon[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        companyId: row.company_id,
        color: row.color,
        createdAt: new Date(row.created_at),
      }));

      const currentPlatoonId = platoons.length > 0 ? platoons[0].id : null;
      set({ platoons, currentPlatoonId, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadSquads: async () => {
    try {
      const { data, error } = await supabase.from('squads').select('*');
      if (error) throw error;

      const squads: Squad[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        platoonId: row.platoon_id || '',
        createdAt: new Date(row.created_at),
      }));

      set({ squads });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadCertificates: async () => {
    try {
      const { data, error } = await supabase.from('certificates').select('*');
      if (error) throw error;

      const certificates: Certificate[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: new Date(row.created_at),
      }));

      set({ certificates });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadStatuses: async () => {
    try {
      const { data, error } = await supabase.from('soldier_statuses').select('*');
      if (error) throw error;

      const statuses: SoldierStatusDef[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        isAvailable: row.is_available,
        createdAt: new Date(row.created_at),
      }));

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
    const color = generatePlatoonColor();

    const { data: row, error } = await supabase
      .from('platoons')
      .insert({ name, color, company_id: 'company-1' })
      .select()
      .single();

    if (error) throw error;

    const platoon: Platoon = {
      id: row.id,
      name: row.name,
      companyId: row.company_id,
      color: row.color,
      createdAt: new Date(row.created_at),
    };

    set((state) => ({ platoons: [...state.platoons, platoon] }));
    return platoon;
  },

  updatePlatoon: async (id: string, name: string) => {
    const { error } = await supabase
      .from('platoons')
      .update({ name })
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      platoons: state.platoons.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  },

  deletePlatoon: async (id: string) => {
    // Squads are deleted via CASCADE in the database
    const { error } = await supabase.from('platoons').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      platoons: state.platoons.filter((p) => p.id !== id),
      squads: state.squads.filter((s) => s.platoonId !== id),
      currentPlatoonId: state.currentPlatoonId === id ? null : state.currentPlatoonId,
    }));
  },

  // Squad CRUD
  addSquad: async (name: string, platoonId: string) => {
    const { data: row, error } = await supabase
      .from('squads')
      .insert({ name, platoon_id: platoonId })
      .select()
      .single();

    if (error) throw error;

    const squad: Squad = {
      id: row.id,
      name: row.name,
      platoonId: row.platoon_id || '',
      createdAt: new Date(row.created_at),
    };

    set((state) => ({ squads: [...state.squads, squad] }));
    return squad;
  },

  updateSquad: async (id: string, name: string) => {
    const { error } = await supabase
      .from('squads')
      .update({ name })
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      squads: state.squads.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
  },

  deleteSquad: async (id: string) => {
    const { error } = await supabase.from('squads').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      squads: state.squads.filter((s) => s.id !== id),
    }));
  },

  // Certificate CRUD
  addCertificate: async (name: string) => {
    const { data: row, error } = await supabase
      .from('certificates')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;

    const certificate: Certificate = {
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at),
    };

    set((state) => ({ certificates: [...state.certificates, certificate] }));
    return certificate;
  },

  updateCertificate: async (id: string, name: string) => {
    const { error } = await supabase
      .from('certificates')
      .update({ name })
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      certificates: state.certificates.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },

  deleteCertificate: async (id: string) => {
    const { error } = await supabase.from('certificates').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      certificates: state.certificates.filter((c) => c.id !== id),
    }));
  },

  // Status CRUD
  addStatus: async (name: string, color: string, isAvailable: boolean) => {
    const { data: row, error } = await supabase
      .from('soldier_statuses')
      .insert({ name, color, is_available: isAvailable })
      .select()
      .single();

    if (error) throw error;

    const status: SoldierStatusDef = {
      id: row.id,
      name: row.name,
      color: row.color,
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
    };

    set((state) => ({ statuses: [...state.statuses, status] }));
    return status;
  },

  updateStatus: async (id: string, updates: Partial<Omit<SoldierStatusDef, 'id' | 'createdAt'>>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;

    const { error } = await supabase
      .from('soldier_statuses')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      statuses: state.statuses.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  },

  deleteStatus: async (id: string) => {
    const { error } = await supabase.from('soldier_statuses').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      statuses: state.statuses.filter((s) => s.id !== id),
    }));
  },

  getStatusById: (id: string) => {
    return get().statuses.find((s) => s.id === id);
  },
}));
