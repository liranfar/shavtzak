import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Eye, Clock, User } from 'lucide-react';
import { format, addDays, subDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { useMissionStore } from '../stores/missionStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels } from '../utils/translations';

// Generate hourly time slots for cleaner view
const TIME_SLOTS: { hour: number; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  TIME_SLOTS.push({ hour: h, label: `${String(h).padStart(2, '0')}:00` });
}

export function ViewPage() {
  const { missions, loadMissions } = useMissionStore();
  const { shifts, loadShifts } = useScheduleStore();
  const { soldiers, loadSoldiers } = useSoldierStore();
  const { platoons, loadPlatoons, certificates, loadCertificates } = usePlatoonStore();

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadMissions();
    loadSoldiers();
    loadShifts();
    loadPlatoons();
    loadCertificates();
  }, [loadMissions, loadSoldiers, loadShifts, loadPlatoons, loadCertificates]);

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  const getSoldier = (soldierId: string) => {
    return soldiers.find((s) => s.id === soldierId);
  };

  const getSoldierName = (soldierId: string) => {
    return getSoldier(soldierId)?.name || 'לא ידוע';
  };

  const getPlatoonColor = (soldierId: string) => {
    const soldier = getSoldier(soldierId);
    if (!soldier) return undefined;
    return platoons.find((p) => p.id === soldier.platoonId)?.color;
  };

  const getSoldierCertificates = (soldierId: string): string[] => {
    const soldier = getSoldier(soldierId);
    if (!soldier?.certificateIds) return [];
    return soldier.certificateIds
      .map((certId) => certificates.find((c) => c.id === certId)?.name)
      .filter((name): name is string => !!name);
  };

  // Get shifts that cover a specific hour
  const getShiftsCoveringHour = (missionId: string, hour: number) => {
    const slotTime = setMinutes(setHours(startOfDay(selectedDate), hour), 0);
    const slotEnd = setMinutes(setHours(startOfDay(selectedDate), hour), 59);

    return shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftEnd = new Date(s.endTime);
      return (
        s.missionId === missionId &&
        shiftStart <= slotEnd &&
        shiftEnd > slotTime
      );
    });
  };

  // Check if this is the start hour of a shift
  const isShiftStartHour = (shift: { startTime: Date | string }, hour: number) => {
    const shiftStart = new Date(shift.startTime);
    const dayStart = startOfDay(selectedDate);

    // If shift started before today, show at hour 0
    if (shiftStart < dayStart) {
      return hour === 0;
    }

    return shiftStart.getHours() === hour &&
           shiftStart.getDate() === selectedDate.getDate() &&
           shiftStart.getMonth() === selectedDate.getMonth();
  };

  // Group shifts by soldier for a cleaner display
  const shiftsForDay = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);

    return shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftEnd = new Date(s.endTime);
      return shiftStart < dayEnd && shiftEnd > dayStart;
    });
  }, [shifts, selectedDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Eye className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-900">תצוגת משמרות</h2>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevDay}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he })}
            </h2>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
            >
              {labels.time.today}
            </button>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="max-h-[calc(100vh-280px)] overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky right-0 z-10 bg-slate-50 px-3 py-2 text-right text-sm font-semibold text-slate-900 border-l border-slate-200 min-w-[140px]">
                  משימה
                </th>
                {TIME_SLOTS.map((slot) => (
                  <th
                    key={slot.hour}
                    className="px-1 py-2 text-center text-xs font-medium text-slate-600 border-l border-slate-200 min-w-[60px]"
                  >
                    {slot.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {missions.length > 0 ? (
                missions.map((mission) => (
                    <tr key={mission.id} className="border-t border-slate-200">
                      <td className="sticky right-0 z-10 bg-white px-3 py-2 text-sm font-medium text-slate-900 border-l border-slate-200">
                        <div>
                          <p className="truncate">{mission.name}</p>
                          <p className="text-xs text-slate-500">
                            {mission.requiredSoldiers} חיילים
                          </p>
                        </div>
                      </td>
                      {TIME_SLOTS.map((slot) => {
                        const shiftsAtHour = getShiftsCoveringHour(mission.id, slot.hour);

                        return (
                          <td
                            key={slot.hour}
                            className="px-1 py-1 border-l border-slate-200 align-top"
                          >
                            <div className="min-h-[50px] space-y-1">
                              {shiftsAtHour.map((shift) => {
                                const isStart = isShiftStartHour(shift, slot.hour);
                                const platoonColor = getPlatoonColor(shift.soldierId);
                                const certs = getSoldierCertificates(shift.soldierId);
                                const shiftStart = new Date(shift.startTime);
                                const shiftEnd = new Date(shift.endTime);

                                // Only show full card at start, continuation marker otherwise
                                if (isStart) {
                                  return (
                                    <div
                                      key={shift.id}
                                      className="px-1.5 py-1 rounded text-xs border"
                                      style={platoonColor ? {
                                        backgroundColor: `${platoonColor}20`,
                                        borderColor: `${platoonColor}60`,
                                      } : {
                                        backgroundColor: '#EFF6FF',
                                        borderColor: '#BFDBFE',
                                      }}
                                    >
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3 shrink-0 text-slate-500" />
                                        <span className="font-medium truncate">
                                          {getSoldierName(shift.soldierId)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {format(shiftStart, 'HH:mm')} - {format(shiftEnd, 'HH:mm')}
                                      </div>
                                      {certs.length > 0 && (
                                        <div className="flex gap-0.5 mt-0.5 flex-wrap">
                                          {certs.slice(0, 2).map((cert, i) => (
                                            <span
                                              key={i}
                                              className="px-1 py-0.5 bg-black/10 rounded text-[9px]"
                                            >
                                              {cert.slice(0, 2)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  // Continuation marker
                                  return (
                                    <div
                                      key={`cont-${shift.id}`}
                                      className="px-1 py-0.5 rounded text-[10px] border opacity-60"
                                      style={platoonColor ? {
                                        backgroundColor: `${platoonColor}15`,
                                        borderColor: `${platoonColor}40`,
                                        color: platoonColor,
                                      } : {
                                        backgroundColor: '#EFF6FF',
                                        borderColor: '#BFDBFE',
                                        color: '#1D4ED8',
                                      }}
                                    >
                                      <span className="font-medium truncate block">
                                        {getSoldierName(shift.soldierId)}
                                      </span>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={TIME_SLOTS.length + 1}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    {labels.messages.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">מקרא צבעים לפי מחלקה</h3>
        <div className="flex flex-wrap gap-3">
          {platoons.map((platoon) => (
            <div key={platoon.id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border"
                style={{
                  backgroundColor: `${platoon.color}20`,
                  borderColor: `${platoon.color}60`,
                }}
              />
              <span className="text-sm text-slate-700">{platoon.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-50 border border-blue-200" />
            <span className="text-sm text-slate-700">ללא מחלקה</span>
          </div>
        </div>
      </div>

      {/* Today's Assignments Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          סיכום שיבוצים ליום זה ({shiftsForDay.length} משמרות)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {missions.map((mission) => {
            const missionShifts = shiftsForDay.filter(s => s.missionId === mission.id);
            if (missionShifts.length === 0) return null;

            return (
              <div key={mission.id} className="p-3 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 text-sm">{mission.name}</h4>
                <div className="mt-2 space-y-1">
                  {missionShifts.map((shift) => {
                    const platoonColor = getPlatoonColor(shift.soldierId);
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: platoonColor || '#64748B' }}
                        />
                        <span className="font-medium">{getSoldierName(shift.soldierId)}</span>
                        <span className="text-slate-500">
                          {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
