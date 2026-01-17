import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Settings, X, Award, Circle, Download, Upload } from 'lucide-react';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels, getRoleLabel } from '../utils/translations';
import { ROLE_COLORS } from '../utils/constants';
import { soldiersToCSV, parseSoldiersCSV, downloadFile, readFileAsText } from '../utils/csvUtils';
import type { Soldier, SoldierRole, Platoon, Squad, Certificate, SoldierStatusDef } from '../types/entities';
import { PageLoader } from '../components/ui/LoadingSpinner';
import clsx from 'clsx';

export function SoldiersPage() {
  const { soldiers, loadSoldiers, addSoldier, updateSoldier, deleteSoldier, isLoading: soldiersLoading } = useSoldierStore();
  const {
    squads,
    loadSquads,
    currentPlatoonId,
    loadPlatoons,
    platoons,
    certificates,
    loadCertificates,
    statuses,
    loadStatuses,
    addPlatoon,
    updatePlatoon,
    deletePlatoon,
    addSquad,
    updateSquad,
    deleteSquad,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    addStatus,
    updateStatus,
    deleteStatus,
    isLoading: platoonsLoading,
  } = usePlatoonStore();

  const isLoading = soldiersLoading || platoonsLoading;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platoonFilter, setPlatoonFilter] = useState<string>('all');
  const [certificateFilter, setCertificateFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingPlatoon, setEditingPlatoon] = useState<Platoon | null>(null);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [editingStatus, setEditingStatus] = useState<SoldierStatusDef | null>(null);
  const [newPlatoonName, setNewPlatoonName] = useState('');
  const [newSquadName, setNewSquadName] = useState('');
  const [newCertificateName, setNewCertificateName] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#10B981');
  const [newStatusAvailable, setNewStatusAvailable] = useState(true);
  const [selectedPlatoonForSquad, setSelectedPlatoonForSquad] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPlatoons();
    loadSquads();
    loadCertificates();
    loadStatuses();
    loadSoldiers();
  }, [loadPlatoons, loadSquads, loadCertificates, loadStatuses, loadSoldiers]);

  const filteredSoldiers = soldiers.filter((soldier) => {
    // Search by name, personal number, or phone
    const matchesSearch =
      soldier.name.includes(searchTerm) ||
      soldier.personalNumber.includes(searchTerm) ||
      soldier.phoneNumber?.includes(searchTerm);

    // Status filter
    const matchesStatus =
      statusFilter === 'all' || soldier.statusId === statusFilter;

    // Platoon filter - explicit filter only, ignore global currentPlatoonId
    const soldierPlatoonExists = platoons.some(p => p.id === soldier.platoonId);
    const matchesPlatoon =
      platoonFilter === 'all' ||
      (platoonFilter === 'none' && !soldierPlatoonExists) ||
      soldier.platoonId === platoonFilter;

    // Certificate filter
    const matchesCertificate =
      certificateFilter === 'all' ||
      (certificateFilter === 'none' && (!soldier.certificateIds || soldier.certificateIds.length === 0)) ||
      (soldier.certificateIds && soldier.certificateIds.includes(certificateFilter));

    return matchesSearch && matchesStatus && matchesPlatoon && matchesCertificate;
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

  const getStatusName = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.name || 'לא ידוע';
  };

  const getStatusColor = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.color || '#6B7280';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const soldierData = {
      name: formData.get('name') as string,
      personalNumber: formData.get('personalNumber') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      role: formData.get('role') as SoldierRole,
      statusId: formData.get('statusId') as string,
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

  const handleExportSoldiers = () => {
    const csv = soldiersToCSV(soldiers, platoons, squads, certificates, statuses);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `soldiers_${date}.csv`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const { soldiers: parsedSoldiers, errors } = parseSoldiersCSV(
        content,
        platoons,
        squads,
        certificates,
        statuses
      );

      if (errors.length > 0) {
        setImportErrors(errors);
        setIsImportModalOpen(true);
      }

      if (parsedSoldiers.length > 0) {
        for (const soldier of parsedSoldiers) {
          await addSoldier(soldier);
        }
        alert(`יובאו ${parsedSoldiers.length} חיילים בהצלחה`);
      }
    } catch (error) {
      alert('שגיאה בקריאת הקובץ');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return <PageLoader message="טוען חיילים..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">{labels.soldiers}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportSoldiers}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
            title="ייצוא לקובץ CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">ייצוא</span>
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
            title="ייבוא מקובץ CSV"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">ייבוא</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם, מ.א או טלפון..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">סטטוס - הכל</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          <select
            value={platoonFilter}
            onChange={(e) => setPlatoonFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">מחלקה - הכל</option>
            <option value="none">ללא מחלקה</option>
            {platoons.map((platoon) => (
              <option key={platoon.id} value={platoon.id}>
                {platoon.name}
              </option>
            ))}
          </select>

          <select
            value={certificateFilter}
            onChange={(e) => setCertificateFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">הסמכה - הכל</option>
            <option value="none">ללא הסמכות</option>
            {certificates.map((cert) => (
              <option key={cert.id} value={cert.id}>
                {cert.name}
              </option>
            ))}
          </select>
        </div>

        {/* Active filters summary */}
        {(statusFilter !== 'all' || platoonFilter !== 'all' || certificateFilter !== 'all' || searchTerm) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">מציג {filteredSoldiers.length} מתוך {soldiers.length} חיילים</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPlatoonFilter('all');
                setCertificateFilter('all');
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              נקה סינון
            </button>
          </div>
        )}
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
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${getStatusColor(soldier.statusId)}20`,
                        color: getStatusColor(soldier.statusId),
                      }}
                    >
                      {getStatusName(soldier.statusId)}
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
                  name="statusId"
                  required
                  defaultValue={editingSoldier?.statusId || statuses[0]?.id}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
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
                  {labels.form.squad} <span className="text-slate-400 font-normal">(אופציונלי)</span>
                </label>
                <select
                  name="squadId"
                  defaultValue={editingSoldier?.squadId || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">ללא כיתה</option>
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
              <h3 className="text-lg font-semibold text-slate-900">ניהול מחלקות, כיתות, הסמכות וסטטוסים</h3>
              <button
                onClick={() => {
                  setIsManageModalOpen(false);
                  setEditingPlatoon(null);
                  setEditingSquad(null);
                  setEditingCertificate(null);
                  setEditingStatus(null);
                  setNewPlatoonName('');
                  setNewSquadName('');
                  setNewCertificateName('');
                  setNewStatusName('');
                  setNewStatusColor('#10B981');
                  setNewStatusAvailable(true);
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

              {/* Statuses Section */}
              <div>
                <h4 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Circle className="w-4 h-4" />
                  סטטוסים
                </h4>

                {/* Add Status Form */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  <input
                    type="text"
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    placeholder="שם סטטוס חדש"
                    className="flex-1 min-w-[150px] px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="color"
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="w-12 h-10 border border-slate-200 rounded-lg cursor-pointer"
                    title="בחר צבע"
                  />
                  <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={newStatusAvailable}
                      onChange={(e) => setNewStatusAvailable(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">זמין לשיבוץ</span>
                  </label>
                  <button
                    onClick={async () => {
                      if (newStatusName.trim()) {
                        await addStatus(newStatusName.trim(), newStatusColor, newStatusAvailable);
                        setNewStatusName('');
                        setNewStatusColor('#10B981');
                        setNewStatusAvailable(true);
                      }
                    }}
                    disabled={!newStatusName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Statuses List */}
                <div className="space-y-2">
                  {statuses.map((status) => (
                    <div
                      key={status.id}
                      className="flex items-center gap-2 p-2 rounded-lg border"
                      style={{
                        backgroundColor: `${status.color}15`,
                        borderColor: `${status.color}40`,
                      }}
                    >
                      {editingStatus?.id === status.id ? (
                        <input
                          type="text"
                          defaultValue={status.name}
                          onBlur={(e) => {
                            if (e.target.value.trim() && e.target.value !== status.name) {
                              updateStatus(status.id, { name: e.target.value.trim() });
                            }
                            setEditingStatus(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setEditingStatus(null);
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <>
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="flex-1 text-sm font-medium" style={{ color: status.color }}>
                            {status.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {status.isAvailable ? '(זמין לשיבוץ)' : '(לא זמין)'}
                          </span>
                          <button
                            onClick={() => setEditingStatus(status)}
                            className="p-1.5 hover:bg-white/50 rounded"
                            title="ערוך"
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`האם למחוק את הסטטוס "${status.name}"?`)) {
                                deleteStatus(status.id);
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
                  {statuses.length === 0 && (
                    <p className="text-sm text-slate-500 py-2">אין סטטוסים מוגדרים</p>
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
                  setEditingStatus(null);
                  setNewPlatoonName('');
                  setNewSquadName('');
                  setNewCertificateName('');
                  setNewStatusName('');
                  setNewStatusColor('#10B981');
                  setNewStatusAvailable(true);
                }}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Errors Modal */}
      {isImportModalOpen && importErrors.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">שגיאות בייבוא</h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportErrors([]);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              <ul className="space-y-2">
                {importErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportErrors([]);
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
