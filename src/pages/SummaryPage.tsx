import { useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, addDays, subDays, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart3, Clock, Users, Target } from 'lucide-react';
import { useScheduleStore } from '../stores/scheduleStore';
import { useMissionStore } from '../stores/missionStore';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels } from '../utils/translations';
import clsx from 'clsx';

interface DaySummary {
  date: Date;
  label: string;
  totalHours: number;
  byMission: Map<string, { missionName: string; hours: number; soldierCount: number }>;
  byPlatoon: Map<string, { platoonName: string; hours: number; soldierCount: number }>;
}

export function SummaryPage() {
  const { shifts, loadShifts } = useScheduleStore();
  const { missions, loadMissions } = useMissionStore();
  const { soldiers, loadSoldiers } = useSoldierStore();
  const { platoons, loadPlatoons } = usePlatoonStore();

  useEffect(() => {
    loadShifts();
    loadMissions();
    loadSoldiers();
    loadPlatoons();
  }, [loadShifts, loadMissions, loadSoldiers, loadPlatoons]);

  const today = new Date();
  const yesterday = subDays(today, 1);
  const tomorrow = addDays(today, 1);

  const getMissionName = (missionId: string) => {
    return missions.find((m) => m.id === missionId)?.name || 'משימה לא ידועה';
  };

  const getPlatoonName = (platoonId: string) => {
    return platoons.find((p) => p.id === platoonId)?.name || 'ללא מחלקה';
  };

  const getPlatoonColor = (platoonId: string) => {
    return platoons.find((p) => p.id === platoonId)?.color || '#64748B';
  };

  const getSoldierPlatoonId = (soldierId: string) => {
    return soldiers.find((s) => s.id === soldierId)?.platoonId || '';
  };

  const calculateDaySummary = (date: Date, label: string): DaySummary => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Get shifts that overlap with this day
    const dayShifts = shifts.filter((shift) => {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      return shiftStart < dayEnd && shiftEnd > dayStart;
    });

    const byMission = new Map<string, { missionName: string; hours: number; soldierCount: number }>();
    const byPlatoon = new Map<string, { platoonName: string; hours: number; soldierCount: number }>();
    let totalHours = 0;

    for (const shift of dayShifts) {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);

      // Calculate hours within this day only
      const effectiveStart = shiftStart < dayStart ? dayStart : shiftStart;
      const effectiveEnd = shiftEnd > dayEnd ? dayEnd : shiftEnd;
      const hours = Math.max(0, differenceInHours(effectiveEnd, effectiveStart));

      totalHours += hours;

      // By mission
      const missionId = shift.missionId;
      const missionName = getMissionName(missionId);
      if (!byMission.has(missionId)) {
        byMission.set(missionId, { missionName, hours: 0, soldierCount: 0 });
      }
      const missionData = byMission.get(missionId)!;
      missionData.hours += hours;
      missionData.soldierCount += 1;

      // By platoon
      const platoonId = getSoldierPlatoonId(shift.soldierId);
      const platoonName = getPlatoonName(platoonId);
      if (!byPlatoon.has(platoonId)) {
        byPlatoon.set(platoonId, { platoonName, hours: 0, soldierCount: 0 });
      }
      const platoonData = byPlatoon.get(platoonId)!;
      platoonData.hours += hours;
      platoonData.soldierCount += 1;
    }

    return { date, label, totalHours, byMission, byPlatoon };
  };

  const summaries = useMemo(() => {
    return [
      calculateDaySummary(yesterday, labels.time.yesterday),
      calculateDaySummary(today, labels.time.today),
      calculateDaySummary(tomorrow, labels.time.tomorrow),
    ];
  }, [shifts, missions, soldiers, platoons]);

  const maxHours = Math.max(...summaries.map((s) => s.totalHours), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-900">סיכום משמרות</h2>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaries.map((summary) => (
          <div
            key={summary.label}
            className={clsx(
              'bg-white rounded-xl border p-4',
              summary.label === labels.time.today
                ? 'border-blue-300 ring-2 ring-blue-100'
                : 'border-slate-200'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900">{summary.label}</h3>
                <p className="text-sm text-slate-500">
                  {format(summary.date, 'EEEE, d בMMMM', { locale: he })}
                </p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-blue-600">{summary.totalHours}</p>
                <p className="text-xs text-slate-500">שעות</p>
              </div>
            </div>

            {/* Hours bar */}
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(summary.totalHours / maxHours) * 100}%` }}
              />
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                {summary.byMission.size} משימות
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {Array.from(summary.byMission.values()).reduce((sum, m) => sum + m.soldierCount, 0)} שיבוצים
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Mission */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-slate-600" />
            לפי משימה
          </h3>

          <div className="space-y-4">
            {summaries.map((summary) => (
              <div key={summary.label}>
                <h4 className="text-sm font-medium text-slate-700 mb-2">{summary.label}</h4>
                {summary.byMission.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(summary.byMission.entries())
                      .sort((a, b) => b[1].hours - a[1].hours)
                      .map(([missionId, data]) => (
                        <div key={missionId} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-900 truncate">
                                {data.missionName}
                              </span>
                              <span className="text-slate-600 shrink-0 mr-2">
                                {data.hours} שעות ({data.soldierCount} חיילים)
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full mt-1">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{
                                  width: `${(data.hours / Math.max(summary.totalHours, 1)) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">אין משמרות</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* By Platoon */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            לפי מחלקה
          </h3>

          <div className="space-y-4">
            {summaries.map((summary) => (
              <div key={summary.label}>
                <h4 className="text-sm font-medium text-slate-700 mb-2">{summary.label}</h4>
                {summary.byPlatoon.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(summary.byPlatoon.entries())
                      .sort((a, b) => b[1].hours - a[1].hours)
                      .map(([platoonId, data]) => {
                        const color = getPlatoonColor(platoonId);
                        return (
                          <div key={platoonId} className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-900 truncate">
                                  {data.platoonName}
                                </span>
                                <span className="text-slate-600 shrink-0 mr-2">
                                  {data.hours} שעות ({data.soldierCount} חיילים)
                                </span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full mt-1">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(data.hours / Math.max(summary.totalHours, 1)) * 100}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">אין משמרות</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline view */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          ציר זמן - שעות לפי יום
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-right text-sm font-medium text-slate-700">יום</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-slate-700">תאריך</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-slate-700">שעות</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-slate-700">משימות</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-slate-700">שיבוצים</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-slate-700 w-1/3">
                  התפלגות
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => {
                const assignmentCount = Array.from(summary.byMission.values()).reduce(
                  (sum, m) => sum + m.soldierCount,
                  0
                );
                return (
                  <tr
                    key={summary.label}
                    className={clsx(
                      'border-b border-slate-100',
                      summary.label === labels.time.today && 'bg-blue-50'
                    )}
                  >
                    <td className="px-3 py-3 text-sm font-medium text-slate-900">
                      {summary.label}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {format(summary.date, 'd/M/yyyy')}
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-blue-600">
                      {summary.totalHours}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">{summary.byMission.size}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{assignmentCount}</td>
                    <td className="px-3 py-3">
                      <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                        {Array.from(summary.byPlatoon.entries()).map(([platoonId, data]) => {
                          const color = getPlatoonColor(platoonId);
                          const width = (data.hours / Math.max(summary.totalHours, 1)) * 100;
                          return (
                            <div
                              key={platoonId}
                              className="h-full"
                              style={{ width: `${width}%`, backgroundColor: color }}
                              title={`${data.platoonName}: ${data.hours} שעות`}
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
