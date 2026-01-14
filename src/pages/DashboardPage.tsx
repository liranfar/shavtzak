import { useEffect } from 'react';
import { Users, Target, TrendingUp } from 'lucide-react';
import { useSoldierStore } from '../stores/soldierStore';
import { useMissionStore } from '../stores/missionStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels, getMissionTypeLabel } from '../utils/translations';
import { STATUS_COLORS } from '../utils/constants';
import clsx from 'clsx';

export function DashboardPage() {
  const { soldiers, loadSoldiers } = useSoldierStore();
  const { missions, loadMissions } = useMissionStore();
  const { shifts, loadShifts } = useScheduleStore();
  const { platoons, loadPlatoons } = usePlatoonStore();

  useEffect(() => {
    loadPlatoons();
    loadSoldiers();
    loadMissions();
    loadShifts();
  }, [loadPlatoons, loadSoldiers, loadMissions, loadShifts]);

  // Get today's active shifts
  const getTodayShiftsForMission = (missionId: string) => {
    const today = new Date();
    return shifts.filter((s) => {
      const shiftDate = new Date(s.startTime);
      return (
        s.missionId === missionId &&
        shiftDate.getDate() === today.getDate() &&
        shiftDate.getMonth() === today.getMonth() &&
        shiftDate.getFullYear() === today.getFullYear()
      );
    });
  };

  const getSoldierName = (soldierId: string) => {
    const soldier = soldiers.find((s) => s.id === soldierId);
    return soldier?.name || 'לא ידוע';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">{labels.dashboard}</h2>

      {platoons.length === 0 ? (
        <div className="text-center py-12 text-slate-500">{labels.messages.noData}</div>
      ) : (
        platoons.map((platoon) => {
          const platoonSoldiers = soldiers.filter((s) => s.platoonId === platoon.id);
          const platoonMissions = missions.filter((m) => m.platoonId === platoon.id);
          const availableSoldiers = platoonSoldiers.filter((s) => s.status === 'available');
          const maxScore = Math.max(...platoonSoldiers.map((s) => s.fairnessScore), 1);

          return (
            <div key={platoon.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Platoon Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">{platoon.name}</h3>
                <div className="flex gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {platoonSoldiers.length} {labels.soldiers}
                  </span>
                  <span className="text-green-600">
                    {availableSoldiers.length} {labels.status.available}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {platoonMissions.length} {labels.missions}
                  </span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assigned Missions */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-slate-900">{labels.missions}</h4>
                  </div>

                  {platoonMissions.length > 0 ? (
                    <div className="space-y-3">
                      {platoonMissions.map((mission) => {
                        const todayShifts = getTodayShiftsForMission(mission.id);
                        return (
                          <div
                            key={mission.id}
                            className="border border-slate-200 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-900">{mission.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {getMissionTypeLabel(mission.type)}
                              </span>
                            </div>
                            <div className="text-sm text-slate-500">
                              {todayShifts.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-slate-600">משובצים היום:</span>
                                  {todayShifts.map((shift) => (
                                    <span
                                      key={shift.id}
                                      className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                                    >
                                      {getSoldierName(shift.soldierId)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">אין שיבוצים להיום</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{labels.messages.noData}</p>
                  )}
                </div>

                {/* Soldiers Fairness Scores */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">
                      {labels.dashboard_labels.fairnessScore}
                    </h4>
                  </div>

                  {platoonSoldiers.length > 0 ? (
                    <div className="space-y-2">
                      {platoonSoldiers
                        .sort((a, b) => b.fairnessScore - a.fairnessScore)
                        .map((soldier) => (
                          <div key={soldier.id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {soldier.name}
                                </p>
                                <span
                                  className={clsx(
                                    'px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                                    STATUS_COLORS[soldier.status]
                                  )}
                                >
                                  {labels.status[soldier.status]}
                                </span>
                              </div>
                              <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min((soldier.fairnessScore / maxScore) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-medium text-slate-600 w-10 text-left">
                              {soldier.fairnessScore.toFixed(1)}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{labels.messages.noData}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
