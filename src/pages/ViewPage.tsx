import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Eye, Download, UserX, Calendar, List, Clock, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, addHours, subDays, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { useMissionStore } from '../stores/missionStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels } from '../utils/translations';
import { PageLoader } from '../components/ui/LoadingSpinner';
import type { Soldier } from '../types/entities';

export function ViewPage() {
  const { missions, loadMissions, isLoading: missionsLoading } = useMissionStore();
  const { shifts, loadShifts, isLoading: shiftsLoading } = useScheduleStore();
  const { soldiers, loadSoldiers, isLoading: soldiersLoading } = useSoldierStore();
  const { platoons, loadPlatoons, statuses, loadStatuses, isLoading: platoonsLoading } = usePlatoonStore();

  const isLoading = missionsLoading || shiftsLoading || soldiersLoading || platoonsLoading;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'both' | 'mission' | 'timeslot'>('both');

  useEffect(() => {
    loadMissions();
    loadSoldiers();
    loadShifts();
    loadPlatoons();
    loadStatuses();
  }, [loadMissions, loadSoldiers, loadShifts, loadPlatoons, loadStatuses]);

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

  const getPlatoonName = (soldierId: string) => {
    const soldier = getSoldier(soldierId);
    if (!soldier) return 'ללא מחלקה';
    return platoons.find((p) => p.id === soldier.platoonId)?.name || 'ללא מחלקה';
  };

  const getMissionName = (missionId: string) => {
    return missions.find((m) => m.id === missionId)?.name || 'משימה לא ידועה';
  };

  // Get shifts for selected day
  const shiftsForDay = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);

    return shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftEnd = new Date(s.endTime);
      return shiftStart < dayEnd && shiftEnd > dayStart;
    });
  }, [shifts, selectedDate]);

  // Group shifts by time slot (start time rounded to hour)
  const shiftsByTimeSlot = useMemo(() => {
    const grouped = new Map<string, typeof shiftsForDay>();

    for (const shift of shiftsForDay) {
      const startTime = new Date(shift.startTime);
      // Round to the hour for grouping
      const timeKey = format(startTime, 'HH:00');

      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, []);
      }
      grouped.get(timeKey)!.push(shift);
    }

    // Sort each group by mission name then soldier name
    for (const shifts of grouped.values()) {
      shifts.sort((a, b) => {
        const missionCompare = getMissionName(a.missionId).localeCompare(getMissionName(b.missionId));
        if (missionCompare !== 0) return missionCompare;
        return getSoldierName(a.soldierId).localeCompare(getSoldierName(b.soldierId));
      });
    }

    // Convert to sorted array by time
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([time, shifts]) => ({ time, shifts }));
  }, [shiftsForDay, missions, soldiers]);

  // Group shifts by mission AND time slot (Mission → TimeSlot → Soldiers)
  // Also calculate uncovered time ranges for each mission
  const shiftsByMissionAndTime = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);
    
    const grouped = new Map<string, Map<string, typeof shiftsForDay>>();

    for (const shift of shiftsForDay) {
      const startTime = new Date(shift.startTime);
      const timeKey = format(startTime, 'HH:mm');
      const missionId = shift.missionId;

      if (!grouped.has(missionId)) {
        grouped.set(missionId, new Map());
      }
      const timeMap = grouped.get(missionId)!;

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, []);
      }
      timeMap.get(timeKey)!.push(shift);
    }

    // Sort soldiers within each time slot
    for (const timeMap of grouped.values()) {
      for (const shifts of timeMap.values()) {
        shifts.sort((a, b) => getSoldierName(a.soldierId).localeCompare(getSoldierName(b.soldierId)));
      }
    }

    // Calculate uncovered ranges for each mission (today + overnight into tomorrow)
    const calculateUncoveredRanges = (missionId: string): { 
      today: Array<{ start: string; end: string }>;
      tomorrow: Array<{ start: string; end: string }>;
    } => {
      const missionShiftsRaw = shiftsForDay.filter(s => s.missionId === missionId);
      
      // === TODAY'S GAPS (00:00-24:00) ===
      const todayShifts = missionShiftsRaw
        .map(s => {
          const start = new Date(s.startTime);
          const end = new Date(s.endTime);
          return {
            start: start < dayStart ? dayStart : (start > dayEnd ? dayEnd : start),
            end: end > dayEnd ? dayEnd : (end < dayStart ? dayStart : end),
          };
        })
        .filter(s => s.start < s.end)
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      const todayGaps: Array<{ start: string; end: string }> = [];
      
      if (todayShifts.length === 0) {
        todayGaps.push({ start: '00:00', end: '24:00' });
      } else {
        // Merge overlapping shifts
        const mergedToday: Array<{ start: Date; end: Date }> = [];
        for (const shift of todayShifts) {
          if (mergedToday.length === 0) {
            mergedToday.push({ start: shift.start, end: shift.end });
          } else {
            const last = mergedToday[mergedToday.length - 1];
            if (shift.start <= last.end) {
              last.end = shift.end > last.end ? shift.end : last.end;
            } else {
              mergedToday.push({ start: shift.start, end: shift.end });
            }
          }
        }

        // Find gaps
        let currentTime = dayStart;
        for (const coverage of mergedToday) {
          if (coverage.start > currentTime) {
            todayGaps.push({
              start: format(currentTime, 'HH:mm'),
              end: format(coverage.start, 'HH:mm'),
            });
          }
          currentTime = coverage.end;
        }
        if (currentTime < dayEnd) {
          todayGaps.push({
            start: format(currentTime, 'HH:mm'),
            end: '24:00',
          });
        }
      }

      // === TOMORROW'S OVERNIGHT GAPS (from today's night shifts) ===
      const nextDayStart = dayEnd; // 00:00 tomorrow
      const expectedOvernightEnd = addHours(nextDayStart, 8); // Expect coverage until 08:00 tomorrow
      
      // Find overnight shifts (shifts ending after midnight)
      const overnightShifts = missionShiftsRaw
        .map(s => ({ start: new Date(s.startTime), end: new Date(s.endTime) }))
        .filter(s => s.end > nextDayStart); // Shifts that extend into tomorrow
      
      const tomorrowGaps: Array<{ start: string; end: string }> = [];
      
      // Check if any shifts from today extend into tomorrow
      const hasOvernightShifts = overnightShifts.length > 0;
      
      // Also check if today has late-night shifts (starting after 18:00)
      const hasLateNightShifts = missionShiftsRaw.some(s => {
        const startHour = new Date(s.startTime).getHours();
        return startHour >= 18;
      });
      
      // Only show tomorrow gaps if there are overnight or late-night shifts
      if (hasOvernightShifts || hasLateNightShifts) {
        // Use either the max overnight end or expected end (08:00), whichever is later
        const maxOvernightEnd = overnightShifts.length > 0
          ? new Date(Math.max(...overnightShifts.map(s => s.end.getTime())))
          : nextDayStart;
        const overnightWindowEnd = maxOvernightEnd > expectedOvernightEnd ? maxOvernightEnd : expectedOvernightEnd;
        
        // Clamp overnight shifts to tomorrow's portion only
        const tomorrowShifts = overnightShifts
          .map(s => ({
            start: s.start < nextDayStart ? nextDayStart : s.start,
            end: s.end,
          }))
          .filter(s => s.start < s.end)
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        // Merge overlapping
        const mergedTomorrow: Array<{ start: Date; end: Date }> = [];
        for (const shift of tomorrowShifts) {
          if (mergedTomorrow.length === 0) {
            mergedTomorrow.push({ start: shift.start, end: shift.end });
          } else {
            const last = mergedTomorrow[mergedTomorrow.length - 1];
            if (shift.start <= last.end) {
              last.end = shift.end > last.end ? shift.end : last.end;
            } else {
              mergedTomorrow.push({ start: shift.start, end: shift.end });
            }
          }
        }

        // Find gaps in tomorrow's coverage (from 00:00 to overnight window end)
        let currTime = nextDayStart;
        for (const coverage of mergedTomorrow) {
          if (coverage.start > currTime) {
            tomorrowGaps.push({
              start: format(currTime, 'HH:mm'),
              end: format(coverage.start, 'HH:mm'),
            });
          }
          currTime = coverage.end;
        }
        // Gap from last coverage to expected overnight end
        if (currTime < overnightWindowEnd) {
          tomorrowGaps.push({
            start: format(currTime, 'HH:mm'),
            end: format(overnightWindowEnd, 'HH:mm'),
          });
        }
      }

      return { today: todayGaps, tomorrow: tomorrowGaps };
    };

    // Build result including ALL missions (even those with no shifts)
    const result = missions.map(mission => {
      const timeMap = grouped.get(mission.id);
      const timeSlots = timeMap 
        ? Array.from(timeMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([time, shifts]) => ({ time, shifts }))
        : [];
      
      const { today, tomorrow } = calculateUncoveredRanges(mission.id);
      
      return {
        missionId: mission.id,
        missionName: mission.name,
        timeSlots,
        uncoveredToday: today,
        uncoveredTomorrow: tomorrow,
      };
    });

    // Sort by mission name
    return result.sort((a, b) => a.missionName.localeCompare(b.missionName, 'he'));
  }, [shiftsForDay, missions, soldiers, selectedDate]);

  // Get soldiers who are unavailable (status is not available) or on leave
  const unavailableSoldiers = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);

    return soldiers.filter((soldier) => {
      // Check if soldier's status is unavailable
      const status = statuses.find(s => s.id === soldier.statusId);
      const isStatusUnavailable = status && !status.isAvailable;

      // Check if soldier is on leave during this day
      const isOnLeave = soldier.leaveStart && soldier.leaveEnd &&
        new Date(soldier.leaveStart) < dayEnd &&
        new Date(soldier.leaveEnd) > dayStart;

      return isStatusUnavailable || isOnLeave;
    });
  }, [soldiers, statuses, selectedDate]);

  // Group unavailable soldiers by reason
  const unavailableByReason = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);

    const grouped: { status: string; color: string; soldiers: Soldier[] }[] = [];
    const onLeaveSoldiers: Soldier[] = [];

    // Group by status
    for (const soldier of unavailableSoldiers) {
      const status = statuses.find(s => s.id === soldier.statusId);

      // Check if on leave
      const isOnLeave = soldier.leaveStart && soldier.leaveEnd &&
        new Date(soldier.leaveStart) < dayEnd &&
        new Date(soldier.leaveEnd) > dayStart;

      if (isOnLeave) {
        onLeaveSoldiers.push(soldier);
      } else if (status && !status.isAvailable) {
        let group = grouped.find(g => g.status === status.name);
        if (!group) {
          group = { status: status.name, color: status.color, soldiers: [] };
          grouped.push(group);
        }
        group.soldiers.push(soldier);
      }
    }

    // Add leave group if there are soldiers on leave
    if (onLeaveSoldiers.length > 0) {
      grouped.unshift({ status: 'ביציאה', color: '#8B5CF6', soldiers: onLeaveSoldiers });
    }

    return grouped;
  }, [unavailableSoldiers, statuses, selectedDate]);

  const formatLeaveDate = (soldier: Soldier) => {
    if (!soldier.leaveStart || !soldier.leaveEnd) return '';
    return `${format(new Date(soldier.leaveStart), 'dd/MM HH:mm')} - ${format(new Date(soldier.leaveEnd), 'dd/MM HH:mm')}`;
  };

  const handleDownloadPDF = () => {
    const dateDisplay = format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he });

    // Build PDF content grouped by mission
    const missionsWithShifts = missions
      .map((mission) => {
        const missionShifts = shiftsForDay
          .filter((s) => s.missionId === mission.id)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return { mission, shifts: missionShifts };
      })
      .filter((m) => m.shifts.length > 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('נא לאפשר חלונות קופצים כדי להוריד PDF');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>משמרות - ${dateDisplay}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            direction: rtl;
            font-size: 12px;
          }
          h1 {
            text-align: center;
            margin-bottom: 8px;
            font-size: 18px;
          }
          .date {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
          }
          .missions-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .mission {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            break-inside: avoid;
          }
          .mission-name {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #eee;
          }
          .shift {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
            border-bottom: 1px solid #f5f5f5;
          }
          .shift:last-child {
            border-bottom: none;
          }
          .color-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .shift-info {
            flex: 1;
          }
          .soldier-name {
            font-weight: 500;
          }
          .platoon-name {
            color: #666;
            font-size: 11px;
          }
          .shift-time {
            color: #888;
            font-size: 11px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            color: #999;
            font-size: 10px;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>סידור משמרות</h1>
        <div class="date">${dateDisplay}</div>

        <div class="missions-grid">
          ${missionsWithShifts
            .map(
              ({ mission, shifts: mShifts }) => `
            <div class="mission">
              <div class="mission-name">${mission.name}</div>
              ${mShifts
                .map((shift) => {
                  const soldier = getSoldier(shift.soldierId);
                  const platoon = soldier ? platoons.find((p) => p.id === soldier.platoonId) : null;
                  return `
                  <div class="shift">
                    <div class="color-dot" style="background-color: ${platoon?.color || '#64748B'}"></div>
                    <div class="shift-info">
                      <div class="soldier-name">${soldier?.name || 'לא ידוע'}</div>
                      <div class="platoon-name">${platoon?.name || 'ללא מחלקה'}</div>
                    </div>
                    <div class="shift-time">${format(new Date(shift.startTime), 'HH:mm')} - ${format(new Date(shift.endTime), 'HH:mm')}</div>
                  </div>
                `;
                })
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>

        ${missionsWithShifts.length === 0 ? '<p style="text-align: center; color: #666; padding: 40px;">אין משמרות ליום זה</p>' : ''}

        <div class="footer">
          נוצר ב-${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return <PageLoader message="טוען תצוגה..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">תצוגת משמרות</h2>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          title="הורד כ-PDF"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">הורד PDF</span>
        </button>
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

        {/* View mode toggle */}
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-sm text-slate-500">תצוגה:</span>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('both')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'both'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <List className="w-3.5 h-3.5" />
              משימה + שעה
            </button>
            <button
              onClick={() => setViewMode('mission')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'mission'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <List className="w-3.5 h-3.5" />
              לפי משימה
            </button>
            <button
              onClick={() => setViewMode('timeslot')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'timeslot'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              לפי שעה
            </button>
          </div>
        </div>
      </div>

      {/* Assignments by Mission + Time Slot (Combined) */}
      {viewMode === 'both' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            שיבוצים ליום זה ({shiftsForDay.length} משמרות)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftsByMissionAndTime.map(({ missionId, missionName, timeSlots, uncoveredToday, uncoveredTomorrow }) => (
              <div key={missionId} className="p-3 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-200">
                  {missionName}
                  <span className="text-xs text-slate-500 font-normal mr-2">
                    ({timeSlots.reduce((sum, ts) => sum + ts.shifts.length, 0)} משמרות)
                  </span>
                </h4>
                
                {/* Today's uncovered time ranges warning */}
                {uncoveredToday.length > 0 && (
                  <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-1 text-orange-700 text-xs font-medium mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>אין שיבוצים היום:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {uncoveredToday.map((range, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium"
                        >
                          {range.start}-{range.end}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {timeSlots.map(({ time, shifts: slotShifts }) => (
                    <div key={time} className="border-r-2 border-blue-400 pr-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span className="text-xs font-medium text-blue-700">{time}</span>
                      </div>
                      <div className="space-y-1">
                        {slotShifts.map((shift) => {
                          const platoonColor = getPlatoonColor(shift.soldierId);
                          const platoonName = getPlatoonName(shift.soldierId);
                          return (
                            <div
                              key={shift.id}
                              className="flex items-center gap-2 text-xs p-1.5 rounded border"
                              style={{
                                backgroundColor: platoonColor ? `${platoonColor}15` : '#F8FAFC',
                                borderColor: platoonColor ? `${platoonColor}40` : '#E2E8F0',
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: platoonColor || '#64748B' }}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{getSoldierName(shift.soldierId)}</span>
                                <span className="text-slate-500 mr-1">({platoonName})</span>
                              </div>
                              <span className="text-slate-400 text-[10px]">
                                עד {(() => {
                                  const startDate = startOfDay(new Date(shift.startTime));
                                  const endDate = new Date(shift.endTime);
                                  const endDay = startOfDay(endDate);
                                  // Show date if end time is on a different day than start
                                  if (endDay.getTime() !== startDate.getTime()) {
                                    return format(endDate, 'd/M HH:mm');
                                  }
                                  return format(endDate, 'HH:mm');
                                })()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tomorrow's overnight uncovered time ranges warning - shown below shifts */}
                {uncoveredTomorrow.length > 0 && (
                  <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-1 text-purple-700 text-xs font-medium mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>אין שיבוצים למחר (לילה):</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {uncoveredTomorrow.map((range, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium"
                        >
                          {range.start}-{range.end}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {shiftsForDay.length === 0 && (
            <p className="text-center text-slate-500 py-8">{labels.messages.noData}</p>
          )}
        </div>
      )}

      {/* Assignments by Mission */}
      {viewMode === 'mission' && (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          שיבוצים ליום זה ({shiftsForDay.length} משמרות)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {missions.map((mission) => {
            const missionShifts = shiftsForDay.filter(s => s.missionId === mission.id);
            if (missionShifts.length === 0) return null;

            return (
              <div key={mission.id} className="p-3 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 text-sm">{mission.name}</h4>
                <div className="mt-2 space-y-2">
                  {[...missionShifts].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((shift) => {
                    const platoonColor = getPlatoonColor(shift.soldierId);
                    const platoonName = getPlatoonName(shift.soldierId);
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center gap-2 text-xs p-2 rounded border"
                        style={{
                          backgroundColor: platoonColor ? `${platoonColor}15` : '#F8FAFC',
                          borderColor: platoonColor ? `${platoonColor}40` : '#E2E8F0',
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: platoonColor || '#64748B' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getSoldierName(shift.soldierId)}</span>
                            <span className="text-slate-500">({platoonName})</span>
                          </div>
                          <span className="text-slate-500">
                            {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {shiftsForDay.length === 0 && (
          <p className="text-center text-slate-500 py-8">{labels.messages.noData}</p>
        )}
      </div>
      )}

      {/* Assignments by Time Slot */}
      {viewMode === 'timeslot' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            שיבוצים ליום זה ({shiftsForDay.length} משמרות)
          </h3>
          <div className="space-y-4">
            {shiftsByTimeSlot.map(({ time, shifts: timeShifts }) => (
              <div key={time} className="border-r-4 border-blue-500 pr-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">{time}</h4>
                  <span className="text-xs text-slate-500">({timeShifts.length} משמרות)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {timeShifts.map((shift) => {
                    const platoonColor = getPlatoonColor(shift.soldierId);
                    const platoonName = getPlatoonName(shift.soldierId);
                    const missionName = getMissionName(shift.missionId);
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center gap-2 text-xs p-2 rounded border"
                        style={{
                          backgroundColor: platoonColor ? `${platoonColor}15` : '#F8FAFC',
                          borderColor: platoonColor ? `${platoonColor}40` : '#E2E8F0',
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: platoonColor || '#64748B' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getSoldierName(shift.soldierId)}</span>
                            <span className="text-slate-500">({platoonName})</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="font-medium text-slate-700">{missionName}</span>
                            <span>•</span>
                            <span>
                              {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {shiftsForDay.length === 0 && (
            <p className="text-center text-slate-500 py-8">{labels.messages.noData}</p>
          )}
        </div>
      )}

      {/* Unavailable Soldiers Section */}
      {unavailableByReason.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserX className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              חיילים לא זמינים ({unavailableSoldiers.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unavailableByReason.map((group) => (
              <div key={group.status} className="p-3 rounded-lg" style={{ backgroundColor: `${group.color}10` }}>
                <div className="flex items-center gap-2 mb-2">
                  {group.status === 'ביציאה' ? (
                    <Calendar className="w-4 h-4" style={{ color: group.color }} />
                  ) : (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                  )}
                  <h4 className="font-medium text-sm" style={{ color: group.color }}>
                    {group.status} ({group.soldiers.length})
                  </h4>
                </div>
                <div className="space-y-1">
                  {group.soldiers.map((soldier) => {
                    const platoon = platoons.find(p => p.id === soldier.platoonId);
                    return (
                      <div
                        key={soldier.id}
                        className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: platoon?.color || '#64748B' }}
                          />
                          <span className="font-medium text-slate-900">{soldier.name}</span>
                          <span className="text-slate-500">({platoon?.name || 'ללא מחלקה'})</span>
                        </div>
                        {group.status === 'ביציאה' && (
                          <span className="text-slate-500 text-[10px]">
                            {formatLeaveDate(soldier)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
