import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Settings, X, Award } from 'lucide-react';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels, getStatusLabel, getRoleLabel } from '../utils/translations';
import { STATUS_COLORS, ROLE_COLORS } from '../utils/constants';
import type { Soldier, SoldierStatus, SoldierRole, Platoon, Squad, Certificate } from '../types/entities';
import clsx from 'clsx';

export function SoldiersPage() {
  const { soldiers, loadSoldiers, addSoldier, updateSoldier, deleteSoldier } = useSoldierStore();
  const {
    squads,
    loadSquads,
    currentPlatoonId,
    loadPlatoons,
    platoons,
    certificates,
    loadCertificates,
    addPlatoon,
    updatePlatoon,
    deletePlatoon,
    addSquad,
    updateSquad,
    deleteSquad,
    addCertificate,
    updateCertificate,
    deleteCertificate,
  } = usePlatoonStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SoldierStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingPlatoon, setEditingPlatoon] = useState<Platoon | null>(null);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [newPlatoonName, setNewPlatoonName] = useState('');
  const [newSquadName, setNewSquadName] = useState('');
  const [newCertificateName, setNewCertificateName] = useState('');
  const [selectedPlatoonForSquad, setSelectedPlatoonForSquad] = useState<string>('');

  useEffect(() => {
    loadPlatoons();
    loadSquads();
    loadCertificates();
    loadSoldiers();
  }, [loadPlatoons, loadSquads, loadCertificates, loadSoldiers]);

  const filteredSoldiers = soldiers.filter((soldier) => {
    const matchesSearch =
      soldier.name.includes(searchTerm) ||
      soldier.personalNumber.includes(searchTerm);
    const matchesStatus =
      statusFilter === 'all' || soldier.status === statusFilter;
    // Show soldier if: no platoon filter, matches current platoon, or soldier has no valid platoon (orphaned)
    const soldierPlatoonExists = platoons.some(p => p.id === soldier.platoonId);
    const matchesPlatoon =
      !currentPlatoonId || soldier.platoonId === currentPlatoonId || !soldierPlatoonExists;
    return matchesSearch && matchesStatus && matchesPlatoon;
  });

  const handleAddSoldier = () => {
    setEditingSoldier(null);
    setSelectedCertificateIds([]);
    setIsModalOpen(true);
  };

  const handleEditSoldier = (soldier: Soldier) => {
    setEditingSoldier(soldier);
    setSelectedCertificateIds(soldier.certificateIds || []);
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
      phoneNumber: formData.get('phoneNumber') as string,
      role: formData.get('role') as SoldierRole,
      status: formData.get('status') as SoldierStatus,
      platoonId: formData.get('platoonId') as string,
      squadId: formData.get('squadId') as string,
      certificateIds: selectedCertificateIds,
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
    return squad?.name || 'ללא כיתה';
  };

  const getPlatoonName = (platoonId: string) => {
    const platoon = platoons.find((p) => p.id === platoonId);
    return platoon?.name || 'ללא מחלקה';
  };

  const toggleCertificate = (certId: string) => {
    setSelectedCertificateIds((prev) =>
      prev.includes(certId)
        ? prev.filter((id) => id !== certId)
        : [...prev, certId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">{labels.soldiers}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            <Settings className="w-4 h-4" />
            מחלקות וכיתות
          </button>
          <button
            onClick={handleAddSoldier}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {labels.actions.add}
          </button>
        </div>
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
                  {labels.form.phoneNumber}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.role}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.status}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.platoon}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.squad}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  הסמכות
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
                  <td className="px-4 py-3 text-sm text-slate-600 dir-ltr">
                    {soldier.phoneNumber || '-'}
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
                    {getPlatoonName(soldier.platoonId)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {getSquadName(soldier.squadId)}
                  </td>
                  <td className="px-4 py-3">
                    {soldier.certificateIds && soldier.certificateIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {soldier.certificateIds.map((certId) => {
                          const cert = certificates.find((c) => c.id === certId);
                          if (!cert) return null;
                          return (
                            <span
                              key={certId}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200"
                            >
                              <Award className="w-3 h-3" />
                              {cert.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
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
                  {labels.form.phoneNumber}
                </label>
                <input
                  name="phoneNumber"
                  type="tel"
                  defaultValue={editingSoldier?.phoneNumber}
                  placeholder="050-1234567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
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
                  {labels.form.platoon}
                </label>
                <select
                  name="platoonId"
                  required
                  defaultValue={editingSoldier?.platoonId || currentPlatoonId || undefined}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {platoons.map((platoon) => (
                    <option key={platoon.id} value={platoon.id}>
                      {platoon.name}
                    </option>
                  ))}
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

              {/* Certificates */}
              {certificates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    הסמכות
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {certificates.map((cert) => (
                      <button
                        key={cert.id}
                        type="button"
                        onClick={() => toggleCertificate(cert.id)}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors',
                          selectedCertificateIds.includes(cert.id)
                            ? 'bg-amber-100 border-amber-400 text-amber-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {cert.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

      {/* Manage Platoons & Squads Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">ניהול מחלקות, כיתות והסמכות</h3>
              <button
                onClick={() => {
                  setIsManageModalOpen(false);
                  setEditingPlatoon(null);
                  setEditingSquad(null);
                  setEditingCertificate(null);
                  setNewPlatoonName('');
                  setNewSquadName('');
                  setNewCertificateName('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Platoons Section */}
              <div>
                <h4 className="text-md font-semibold text-slate-800 mb-3">מחלקות</h4>

                {/* Add Platoon Form */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newPlatoonName}
                    onChange={(e) => setNewPlatoonName(e.target.value)}
                    placeholder="שם מחלקה חדשה"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={async () => {
                      if (newPlatoonName.trim()) {
                        await addPlatoon(newPlatoonName.trim());
                        setNewPlatoonName('');
                      }
                    }}
                    disabled={!newPlatoonName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Platoons List */}
                <div className="space-y-2">
                  {platoons.map((platoon) => (
                    <div
                      key={platoon.id}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                    >
                      {editingPlatoon?.id === platoon.id ? (
                        <>
                          <input
                            type="text"
                            defaultValue={platoon.name}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== platoon.name) {
                                updatePlatoon(platoon.id, e.target.value.trim());
                              }
                              setEditingPlatoon(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              } else if (e.key === 'Escape') {
                                setEditingPlatoon(null);
                              }
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium text-slate-900">
                            {platoon.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({squads.filter((s) => s.platoonId === platoon.id).length} כיתות)
                          </span>
                          <button
                            onClick={() => setEditingPlatoon(platoon)}
                            className="p-1.5 hover:bg-slate-200 rounded"
                            title="ערוך"
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`האם למחוק את המחלקה "${platoon.name}"? כל הכיתות המשויכות יימחקו גם.`)) {
                                deletePlatoon(platoon.id);
                              }
                            }}
                            className="p-1.5 hover:bg-red-50 rounded"
                            title="מחק"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {platoons.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-2">אין מחלקות</p>
                  )}
                </div>
              </div>

              {/* Squads Section */}
              <div>
                <h4 className="text-md font-semibold text-slate-800 mb-3">כיתות</h4>

                {/* Add Squad Form */}
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedPlatoonForSquad}
                    onChange={(e) => setSelectedPlatoonForSquad(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">בחר מחלקה</option>
                    {platoons.map((platoon) => (
                      <option key={platoon.id} value={platoon.id}>
                        {platoon.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder="שם כיתה חדשה"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={async () => {
                      if (newSquadName.trim() && selectedPlatoonForSquad) {
                        await addSquad(newSquadName.trim(), selectedPlatoonForSquad);
                        setNewSquadName('');
                      }
                    }}
                    disabled={!newSquadName.trim() || !selectedPlatoonForSquad}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Squads List grouped by platoon */}
                <div className="space-y-4">
                  {platoons.map((platoon) => {
                    const platoonSquads = squads.filter((s) => s.platoonId === platoon.id);
                    if (platoonSquads.length === 0) return null;

                    return (
                      <div key={platoon.id}>
                        <p className="text-xs font-medium text-slate-500 mb-2">{platoon.name}</p>
                        <div className="space-y-2">
                          {platoonSquads.map((squad) => (
                            <div
                              key={squad.id}
                              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg mr-4"
                            >
                              {editingSquad?.id === squad.id ? (
                                <input
                                  type="text"
                                  defaultValue={squad.name}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() && e.target.value !== squad.name) {
                                      updateSquad(squad.id, e.target.value.trim());
                                    }
                                    setEditingSquad(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    } else if (e.key === 'Escape') {
                                      setEditingSquad(null);
                                    }
                                  }}
                                  autoFocus
                                  className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <>
                                  <span className="flex-1 text-sm font-medium text-slate-900">
                                    {squad.name}
                                  </span>
                                  <button
                                    onClick={() => setEditingSquad(squad)}
                                    className="p-1.5 hover:bg-slate-200 rounded"
                                    title="ערוך"
                                  >
                                    <Edit2 className="w-4 h-4 text-slate-500" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`האם למחוק את הכיתה "${squad.name}"?`)) {
                                        deleteSquad(squad.id);
                                      }
                                    }}
                                    className="p-1.5 hover:bg-red-50 rounded"
                                    title="מחק"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {squads.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-2">אין כיתות</p>
                  )}
                </div>
              </div>

              {/* Certificates Section */}
              <div>
                <h4 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  הסמכות
                </h4>

                {/* Add Certificate Form */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newCertificateName}
                    onChange={(e) => setNewCertificateName(e.target.value)}
                    placeholder="שם הסמכה חדשה (למשל: קלע, חובש, נהג)"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={async () => {
                      if (newCertificateName.trim()) {
                        await addCertificate(newCertificateName.trim());
                        setNewCertificateName('');
                      }
                    }}
                    disabled={!newCertificateName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Certificates List */}
                <div className="flex flex-wrap gap-2">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      {editingCertificate?.id === cert.id ? (
                        <input
                          type="text"
                          defaultValue={cert.name}
                          onBlur={(e) => {
                            if (e.target.value.trim() && e.target.value !== cert.name) {
                              updateCertificate(cert.id, e.target.value.trim());
                            }
                            setEditingCertificate(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setEditingCertificate(null);
                            }
                          }}
                          autoFocus
                          className="px-2 py-1 border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 w-24"
                        />
                      ) : (
                        <>
                          <Award className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">{cert.name}</span>
                          <button
                            onClick={() => setEditingCertificate(cert)}
                            className="p-1 hover:bg-amber-100 rounded"
                            title="ערוך"
                          >
                            <Edit2 className="w-3 h-3 text-amber-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`האם למחוק את ההסמכה "${cert.name}"?`)) {
                                deleteCertificate(cert.id);
                              }
                            }}
                            className="p-1 hover:bg-red-50 rounded"
                            title="מחק"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {certificates.length === 0 && (
                    <p className="text-sm text-slate-500 py-2">אין הסמכות מוגדרות</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsManageModalOpen(false);
                  setEditingPlatoon(null);
                  setEditingSquad(null);
                  setEditingCertificate(null);
                  setNewPlatoonName('');
                  setNewSquadName('');
                  setNewCertificateName('');
                }}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
