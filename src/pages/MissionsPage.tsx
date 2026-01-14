import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useMissionStore } from '../stores/missionStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels, getMissionTypeLabel } from '../utils/translations';
import { MISSION_INTENSITY } from '../utils/constants';
import type { Mission, MissionType } from '../types/entities';
import clsx from 'clsx';

const MISSION_TYPE_COLORS: Record<MissionType, string> = {
  A_continuous: 'bg-red-100 text-red-800',
  C_adhoc: 'bg-yellow-100 text-yellow-800',
};

export function MissionsPage() {
  const { missions, loadMissions, addMission, updateMission, deleteMission } = useMissionStore();
  const { currentPlatoonId, loadPlatoons } = usePlatoonStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  useEffect(() => {
    loadPlatoons();
    loadMissions();
  }, [loadPlatoons, loadMissions]);

  const filteredMissions = currentPlatoonId
    ? missions.filter((m) => m.platoonId === currentPlatoonId)
    : missions;

  const handleAddMission = () => {
    setEditingMission(null);
    setIsModalOpen(true);
  };

  const handleEditMission = (mission: Mission) => {
    setEditingMission(mission);
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
      type: formData.get('type') as MissionType,
      intensity: parseFloat(formData.get('intensity') as string),
      requiredSoldiers: parseInt(formData.get('requiredSoldiers') as string, 10),
      platoonId: currentPlatoonId || '',
    };

    if (editingMission) {
      await updateMission(editingMission.id, missionData);
    } else {
      await addMission(missionData);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">{labels.missions}</h2>
        <button
          onClick={handleAddMission}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {labels.actions.add}
        </button>
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
                  {labels.form.missionType}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.intensity}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {labels.form.requiredSoldiers}
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
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded text-xs font-medium',
                        MISSION_TYPE_COLORS[mission.type]
                      )}
                    >
                      {getMissionTypeLabel(mission.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {mission.intensity}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {mission.requiredSoldiers}
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
                  {labels.form.missionType}
                </label>
                <select
                  name="type"
                  required
                  defaultValue={editingMission?.type || 'A_continuous'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A_continuous">{labels.missionTypes.A_continuous}</option>
                  <option value="C_adhoc">{labels.missionTypes.C_adhoc}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {labels.form.intensity}
                </label>
                <select
                  name="intensity"
                  required
                  defaultValue={editingMission?.intensity || MISSION_INTENSITY.active}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={MISSION_INTENSITY.active}>פעיל (1.0)</option>
                  <option value={MISSION_INTENSITY.standby}>כוננות (0.4)</option>
                  <option value={0.6}>בינוני (0.6)</option>
                  <option value={0.8}>גבוה (0.8)</option>
                </select>
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
