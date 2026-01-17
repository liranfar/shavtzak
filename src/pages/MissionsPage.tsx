import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Award, Download, Upload, X } from 'lucide-react';
import { useMissionStore } from '../stores/missionStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels } from '../utils/translations';
import { missionsToCSV, parseMissionsCSV, downloadFile, readFileAsText } from '../utils/csvUtils';
import type { Mission } from '../types/entities';
import { PageLoader } from '../components/ui/LoadingSpinner';
import clsx from 'clsx';

export function MissionsPage() {
  const { missions, loadMissions, addMission, updateMission, deleteMission, isLoading: missionsLoading } = useMissionStore();
  const { currentPlatoonId, loadPlatoons, platoons, certificates, loadCertificates, isLoading: platoonsLoading } = usePlatoonStore();

  const isLoading = missionsLoading || platoonsLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPlatoons();
    loadCertificates();
    loadMissions();
  }, [loadPlatoons, loadCertificates, loadMissions]);

  const getCertificateName = (certId: string) => {
    return certificates.find(c => c.id === certId)?.name || '';
  };

  const toggleCertificate = (certId: string) => {
    setSelectedCertificateIds(prev =>
      prev.includes(certId)
        ? prev.filter(id => id !== certId)
        : [...prev, certId]
    );
  };

  // Show all missions - don't filter by currentPlatoonId
  const filteredMissions = missions;

  const handleAddMission = () => {
    setEditingMission(null);
    setSelectedCertificateIds([]);
    setIsModalOpen(true);
  };

  const handleEditMission = (mission: Mission) => {
    setEditingMission(mission);
    setSelectedCertificateIds(mission.requiredCertificateIds || []);
    setIsModalOpen(true);
  };

  const handleDeleteMission = async (id: string) => {
    if (confirm(labels.messages.confirmDelete)) {
      await deleteMission(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const missionData = {
      name: formData.get('name') as string,
      requiredSoldiers: parseInt(formData.get('requiredSoldiers') as string, 10),
      requiredCertificateIds: selectedCertificateIds,
      platoonId: currentPlatoonId || '',
    };

    if (editingMission) {
      await updateMission(editingMission.id, missionData);
    } else {
      await addMission(missionData);
    }

    setIsModalOpen(false);
  };

  const handleExportMissions = () => {
    const csv = missionsToCSV(missions, platoons, certificates);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `missions_${date}.csv`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const { missions: parsedMissions, errors } = parseMissionsCSV(
        content,
        platoons,
        certificates
      );

      if (errors.length > 0) {
        setImportErrors(errors);
        setIsImportModalOpen(true);
      }

      if (parsedMissions.length > 0) {
        for (const mission of parsedMissions) {
          await addMission(mission);
        }
        alert(`יובאו ${parsedMissions.length} משימות בהצלחה`);
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
    return <PageLoader message="טוען משימות..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">{labels.missions}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportMissions}
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
            onClick={handleAddMission}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {labels.actions.add}
          </button>
        </div>
      </div>

      {/* Missions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.missionName}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.requiredSoldiers}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  הסמכות נדרשות
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMissions.map((mission) => (
                <tr key={mission.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {mission.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {mission.requiredSoldiers}
                  </td>
                  <td className="px-4 py-3">
                    {mission.requiredCertificateIds && mission.requiredCertificateIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {mission.requiredCertificateIds.map((certId) => (
                          <span
                            key={certId}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200"
                          >
                            <Award className="w-3 h-3" />
                            {getCertificateName(certId)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditMission(mission)}
                        className="p-1.5 hover:bg-slate-100 rounded"
                        title={labels.actions.edit}
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteMission(mission.id)}
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

        {filteredMissions.length === 0 && (
          <div className="text-center py-12 text-slate-500">{labels.messages.noData}</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingMission ? labels.actions.edit : labels.actions.add} {labels.missions}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.missionName}
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingMission?.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.requiredSoldiers}
                </label>
                <input
                  name="requiredSoldiers"
                  type="number"
                  min="1"
                  required
                  defaultValue={editingMission?.requiredSoldiers || 2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Required Certificates */}
              {certificates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    הסמכות נדרשות
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
                  <p className="text-xs text-slate-500 mt-1">
                    בחר הסמכות שנדרשות למשימה זו (אופציונלי)
                  </p>
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
