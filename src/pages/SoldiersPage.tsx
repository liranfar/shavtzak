import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels, getStatusLabel, getRoleLabel } from '../utils/translations';
import { STATUS_COLORS, ROLE_COLORS } from '../utils/constants';
import type { Soldier, SoldierStatus, SoldierRole } from '../types/entities';
import clsx from 'clsx';

export function SoldiersPage() {
  const { soldiers, loadSoldiers, addSoldier, updateSoldier, deleteSoldier } = useSoldierStore();
  const { squads, loadSquads, currentPlatoonId, loadPlatoons } = usePlatoonStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SoldierStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);

  useEffect(() => {
    loadPlatoons();
    loadSquads();
    loadSoldiers();
  }, [loadPlatoons, loadSquads, loadSoldiers]);

  const filteredSoldiers = soldiers.filter((soldier) => {
    const matchesSearch =
      soldier.name.includes(searchTerm) ||
      soldier.personalNumber.includes(searchTerm);
    const matchesStatus =
      statusFilter === 'all' || soldier.status === statusFilter;
    const matchesPlatoon =
      !currentPlatoonId || soldier.platoonId === currentPlatoonId;
    return matchesSearch && matchesStatus && matchesPlatoon;
  });

  const handleAddSoldier = () => {
    setEditingSoldier(null);
    setIsModalOpen(true);
  };

  const handleEditSoldier = (soldier: Soldier) => {
    setEditingSoldier(soldier);
    setIsModalOpen(true);
  };

  const handleDeleteSoldier = async (id: string) => {
    if (confirm(labels.messages.confirmDelete)) {
      await deleteSoldier(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const soldierData = {
      name: formData.get('name') as string,
      personalNumber: formData.get('personalNumber') as string,
      role: formData.get('role') as SoldierRole,
      status: formData.get('status') as SoldierStatus,
      platoonId: currentPlatoonId || '',
      squadId: formData.get('squadId') as string,
    };

    if (editingSoldier) {
      await updateSoldier(editingSoldier.id, soldierData);
    } else {
      await addSoldier(soldierData);
    }

    setIsModalOpen(false);
  };

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad?.name || '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">{labels.soldiers}</h2>
        <button
          onClick={handleAddSoldier}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {labels.actions.add}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={labels.actions.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SoldierStatus | 'all')}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{labels.actions.filter} - הכל</option>
          <option value="available">{labels.status.available}</option>
          <option value="home">{labels.status.home}</option>
          <option value="task_locked">{labels.status.task_locked}</option>
          <option value="sick">{labels.status.sick}</option>
        </select>
      </div>

      {/* Soldiers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.name}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.personalNumber}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.role}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.status}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.squad}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.dashboard_labels.fairnessScore}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSoldiers.map((soldier) => (
                <tr key={soldier.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {soldier.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {soldier.personalNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-1 rounded text-xs font-medium', ROLE_COLORS[soldier.role])}>
                      {getRoleLabel(soldier.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-1 rounded text-xs font-medium', STATUS_COLORS[soldier.status])}>
                      {getStatusLabel(soldier.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {getSquadName(soldier.squadId)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {soldier.fairnessScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditSoldier(soldier)}
                        className="p-1.5 hover:bg-slate-100 rounded"
                        title={labels.actions.edit}
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteSoldier(soldier.id)}
                        className="p-1.5 hover:bg-red-50 rounded"
                        title={labels.actions.delete}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSoldiers.length === 0 && (
          <div className="text-center py-12 text-slate-500">{labels.messages.noData}</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingSoldier ? labels.actions.edit : labels.actions.add} {labels.soldiers}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.name}
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingSoldier?.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.personalNumber}
                </label>
                <input
                  name="personalNumber"
                  type="text"
                  required
                  defaultValue={editingSoldier?.personalNumber}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.role}
                </label>
                <select
                  name="role"
                  required
                  defaultValue={editingSoldier?.role || 'soldier'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="officer">{labels.roles.officer}</option>
                  <option value="nco">{labels.roles.nco}</option>
                  <option value="soldier">{labels.roles.soldier}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.status}
                </label>
                <select
                  name="status"
                  required
                  defaultValue={editingSoldier?.status || 'available'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">{labels.status.available}</option>
                  <option value="home">{labels.status.home}</option>
                  <option value="task_locked">{labels.status.task_locked}</option>
                  <option value="sick">{labels.status.sick}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.squad}
                </label>
                <select
                  name="squadId"
                  required
                  defaultValue={editingSoldier?.squadId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {squads.map((squad) => (
                    <option key={squad.id} value={squad.id}>
                      {squad.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {labels.actions.save}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  {labels.actions.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
