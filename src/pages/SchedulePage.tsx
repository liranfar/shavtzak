import { useEffect, useState, useMemo, useRef } from 'react';
import { ChevronRight, ChevronLeft, Plus, Pencil, Users, Clock, BarChart3 } from 'lucide-react';
import { format, addDays, subDays, setHours, setMinutes, startOfDay, differenceInMinutes, subHours } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMissionStore } from '../stores/missionStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import type { Soldier } from '../types/entities';
import { ShiftAssignmentModal } from '../components/schedule/ShiftAssignmentModal';
import { ShiftCell } from '../components/schedule/ShiftCell';
import { SoldierDragOverlay } from '../components/schedule/SoldierDragOverlay';
import { validateDaySchedule } from '../services/validationService';
import { labels } from '../utils/translations';
import { PageLoader } from '../components/ui/LoadingSpinner';
import type { Mission, Shift } from '../types/entities';
import clsx from 'clsx';

// Hours in a day for generating slots
const HOURS_IN_DAY = 24;

export function SchedulePage() {
  const { missions, loadMissions, isLoading: missionsLoading } = useMissionStore();
  const { shifts, selectedDate, setSelectedDate, loadShifts, addShift, updateShift, deleteShift, isLoading: shiftsLoading } = useScheduleStore();
  const { soldiers, loadSoldiers, isLoading: soldiersLoading } = useSoldierStore();
  const { platoons, loadPlatoons, loadSquads, certificates, loadCertificates, statuses, loadStatuses, isLoading: platoonsLoading } = usePlatoonStore();

  const isLoading = missionsLoading || shiftsLoading || soldiersLoading || platoonsLoading;

  const [modalData, setModalData] = useState<{
    mission: Mission;
    startTime: Date;
    currentSlotShifts: Shift[];
  } | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [distributionTimeframe, setDistributionTimeframe] = useState<24 | 48 | 60 | 72>(72);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLTableCellElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadPlatoons();
    loadSquads();
    loadCertificates();
    loadStatuses();
    loadMissions();
    loadSoldiers();
    loadShifts();
  }, [loadPlatoons, loadSquads, loadCertificates, loadStatuses, loadMissions, loadSoldiers, loadShifts]);

  // Auto-scroll to selected day when date changes
  useEffect(() => {
    if (!isLoading && scrollContainerRef.current) {
      // Small delay to ensure the table is rendered
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        // In RTL layout:
        // - The table shows: previous day (24h) | selected day (24h) | next day (24h)
        // - Visual order in RTL: right = previous day, middle = selected day, left = next day
        // - scrollLeft = 0 is the rightmost position (previous day 00:00)
        // - scrollLeft becomes negative to scroll left towards selected/next day
        
        // Each hour cell is 70px (min-w-[70px])
        // Previous day has 24 hours = 24 * 70 = 1680px
        // To show selected day at the start, scroll past the previous day
        const hourWidth = 70;
        const previousDayWidth = 24 * hourWidth; // 1680px
        
        // In RTL, we use negative scrollLeft to scroll left
        container.scrollLeft = -previousDayWidth;
      }, 150);
    }
  }, [selectedDate, isLoading]);

  // Show all missions - don't filter by currentPlatoonId
  const filteredMissions = missions;

  // Validate all shifts for the current day
  const alertsByShift = useMemo(() => {
    return validateDaySchedule(shifts, soldiers);
  }, [shifts, soldiers]);

  // Calculate shift time per soldier for the distribution timeframe (last X hours)
  const soldierDistributionStats = useMemo(() => {
    const now = new Date();
    const periodStart = subHours(now, distributionTimeframe);

    const stats = new Map<string, { totalMinutes: number; shifts: Shift[] }>();

    // Filter shifts that overlap with the timeframe
    const periodShifts = shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftEnd = new Date(s.endTime);
      return shiftStart < now && shiftEnd > periodStart;
    });

    for (const shift of periodShifts) {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);

      // Calculate the portion of the shift that falls within the timeframe
      const effectiveStart = shiftStart < periodStart ? periodStart : shiftStart;
      const effectiveEnd = shiftEnd > now ? now : shiftEnd;
      const minutes = differenceInMinutes(effectiveEnd, effectiveStart);

      const existing = stats.get(shift.soldierId) || { totalMinutes: 0, shifts: [] };
      existing.totalMinutes += minutes;
      existing.shifts.push(shift);
      stats.set(shift.soldierId, existing);
    }

    return stats;
  }, [shifts, distributionTimeframe]);

  // Group soldiers by platoon with their distribution stats (show ALL soldiers, sorted by work hours ascending)
  const soldiersByPlatoon = useMemo(() => {
    const grouped = new Map<string, { platoon: typeof platoons[0] | null; soldiers: Array<{ soldier: Soldier; totalMinutes: number; shifts: Shift[] }> }>();

    for (const soldier of soldiers) {
      const platoonId = soldier.platoonId || '__no_platoon__';
      const platoon = platoons.find((p) => p.id === soldier.platoonId) || null;

      if (!grouped.has(platoonId)) {
        grouped.set(platoonId, { platoon, soldiers: [] });
      }

      const stats = soldierDistributionStats.get(soldier.id) || { totalMinutes: 0, shifts: [] };
      grouped.get(platoonId)!.soldiers.push({
        soldier,
        totalMinutes: stats.totalMinutes,
        shifts: stats.shifts,
      });
    }

    // Sort soldiers within each platoon by shift time (ascending - least worked first)
    for (const group of grouped.values()) {
      group.soldiers.sort((a, b) => a.totalMinutes - b.totalMinutes);
    }

    return grouped;
  }, [soldiers, platoons, soldierDistributionStats]);

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  // Generate time slots for 3 days: previous, current, next
  const timeSlots = useMemo(() => {
    const slots: { date: Date; hour: number; minute: number; label: string; dayLabel: string; isFirstOfDay: boolean }[] = [];
    const prevDay = subDays(selectedDate, 1);
    const nextDay = addDays(selectedDate, 1);
    const days = [prevDay, selectedDate, nextDay];

    for (const day of days) {
      for (let h = 0; h < HOURS_IN_DAY; h++) {
        slots.push({
          date: day,
          hour: h,
          minute: 0,
          label: `${String(h).padStart(2, '0')}:00`,
          dayLabel: format(day, 'EEE d/M', { locale: he }),
          isFirstOfDay: h === 0,
        });
      }
    }
    return slots;
  }, [selectedDate]);

  // Get shifts that START at this exact time slot (hour:minute) on a specific date
  const getShiftsStartingAtSlot = (missionId: string, date: Date, hour: number, minute: number) => {
    return shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      return (
        s.missionId === missionId &&
        shiftStart.getDate() === date.getDate() &&
        shiftStart.getMonth() === date.getMonth() &&
        shiftStart.getFullYear() === date.getFullYear() &&
        shiftStart.getHours() === hour &&
        shiftStart.getMinutes() === minute
      );
    });
  };

  // Get all shifts that COVER this time slot (for showing continuation)
  const getShiftsCoveringSlot = (missionId: string, date: Date, hour: number, minute: number) => {
    const slotTime = setMinutes(setHours(startOfDay(date), hour), minute);
    return shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftEnd = new Date(s.endTime);
      return (
        s.missionId === missionId &&
        shiftStart <= slotTime &&
        shiftEnd > slotTime
      );
    });
  };

  // Get overnight shifts that started on a previous day but continue into this day
  // These should display their card at 00:00
  const getOvernightShifts = (missionId: string, date: Date) => {
    const dayStart = startOfDay(date);
    return shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftEnd = new Date(s.endTime);
      return (
        s.missionId === missionId &&
        shiftStart < dayStart &&
        shiftEnd > dayStart
      );
    });
  };

  const getSoldier = (soldierId: string): Soldier | undefined => {
    return soldiers.find((s) => s.id === soldierId);
  };

  const getSoldierName = (soldierId: string) => {
    const soldier = getSoldier(soldierId);
    return soldier?.name || 'לא ידוע';
  };

  const getSoldierCertificates = (soldierId: string): string[] => {
    const soldier = getSoldier(soldierId);
    if (!soldier || !soldier.certificateIds) return [];
    return soldier.certificateIds
      .map((certId) => certificates.find((c) => c.id === certId)?.name)
      .filter((name): name is string => !!name);
  };

  const getPlatoonColor = (soldierId: string): string | undefined => {
    const soldier = getSoldier(soldierId);
    if (!soldier) return undefined;
    const platoon = platoons.find((p) => p.id === soldier.platoonId);
    return platoon?.color;
  };

  const handleCellClick = (mission: Mission, date: Date, hour: number, minute: number) => {
    const startTime = setMinutes(setHours(startOfDay(date), hour), minute);
    // Get shifts that cover this slot for this mission
    const currentSlotShifts = shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftEnd = new Date(s.endTime);
      return (
        s.missionId === mission.id &&
        shiftStart <= startTime &&
        shiftEnd > startTime
      );
    });
    setModalData({ mission, startTime, currentSlotShifts });
  };

  const handleAssignSoldiers = async (soldierIds: string[], startTime: Date, endTime: Date) => {
    if (!modalData) return;

    for (const soldierId of soldierIds) {
      await addShift({
        missionId: modalData.mission.id,
        soldierId,
        startTime,
        endTime,
        status: 'scheduled',
      });
    }
    // Note: modal will call onClose after all operations
  };

  const handleRemoveShift = async (shiftId: string) => {
    await deleteShift(shiftId);
  };

  const handleTrimShift = async (shiftId: string, newEndTime: Date) => {
    await updateShift(shiftId, { endTime: newEndTime });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.shift) {
      setActiveShift(active.data.current.shift);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveShift(null);
    const { active, over } = event;

    if (!over || !active.data.current?.shift) return;

    const shift = active.data.current.shift as Shift;
    const targetMissionId = over.data.current?.missionId;
    const targetHour = over.data.current?.hour;

    if (targetMissionId && targetHour !== undefined) {
      // Calculate original shift duration
      const originalDuration = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();

      // Remove old shift
      await handleRemoveShift(shift.id);

      const mission = missions.find((m) => m.id === targetMissionId);
      if (mission) {
        const startTime = setHours(startOfDay(selectedDate), targetHour);
        const endTime = new Date(startTime.getTime() + originalDuration);

        await addShift({
          missionId: targetMissionId,
          soldierId: shift.soldierId,
          startTime,
          endTime,
          status: 'scheduled',
        });
      }
    }
  };

  if (isLoading) {
    return <PageLoader message="טוען לוח משמרות..." />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
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

        {/* Main content - schedule grid on top, available soldiers at bottom */}
        <div className="flex flex-col gap-4">
          {/* Schedule Grid - with inner scrolling */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div ref={scrollContainerRef} className="max-h-[calc(100vh-380px)] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-20">
                  {/* Day labels row */}
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="sticky right-0 z-10 bg-slate-100 px-3 py-1 text-right text-xs font-semibold text-slate-500 border-l border-slate-300 min-w-[120px]">
                      תאריך
                    </th>
                    {timeSlots.map((slot, idx) => {
                      const isSelectedDayStart = slot.isFirstOfDay && slot.date.getTime() === startOfDay(selectedDate).getTime();
                      return (
                        <th
                          key={`day-${idx}`}
                          ref={isSelectedDayStart ? selectedDayRef : undefined}
                          className={clsx(
                            'px-1 py-1 text-center text-[10px] font-semibold border-l border-l-slate-200 min-w-[70px]',
                            slot.isFirstOfDay && 'border-r-2 border-r-slate-400',
                            slot.date.getTime() === startOfDay(selectedDate).getTime()
                              ? 'bg-blue-100 text-blue-800'
                              : 'text-slate-500'
                          )}
                        >
                          {slot.isFirstOfDay && slot.dayLabel}
                        </th>
                      );
                    })}
                  </tr>
                  {/* Time slots row */}
                  <tr className="bg-slate-50">
                    <th className="sticky right-0 z-10 bg-slate-50 px-3 py-2 text-right text-sm font-semibold text-slate-900 border-l border-slate-200 min-w-[120px]">
                      {labels.missions}
                    </th>
                    {timeSlots.map((slot, idx) => (
                      <th
                        key={`time-${idx}`}
                        className={clsx(
                          'px-1 py-2 text-center text-xs font-medium text-slate-600 border-l border-l-slate-200 min-w-[70px]',
                          slot.isFirstOfDay && 'border-r-2 border-r-slate-400',
                          slot.date.getTime() === startOfDay(selectedDate).getTime() && 'bg-blue-50'
                        )}
                      >
                        {slot.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMissions.length > 0 ? (
                    filteredMissions.map((mission) => (
                      <tr key={mission.id} className="border-t border-slate-200">
                        <td className="sticky right-0 z-10 bg-white px-3 py-2 text-sm font-medium text-slate-900 border-l border-slate-200">
                          <div>
                            <p className="truncate">{mission.name}</p>
                            <p className="text-xs text-slate-500">
                              {mission.requiredSoldiers} חיילים
                            </p>
                          </div>
                        </td>
                        {timeSlots.map((slot, idx) => {
                          const shiftsStartingHere = getShiftsStartingAtSlot(mission.id, slot.date, slot.hour, slot.minute);
                          // At 00:00, also include overnight shifts from previous day
                          const overnightShifts = slot.hour === 0 && slot.minute === 0
                            ? getOvernightShifts(mission.id, slot.date)
                            : [];
                          const allShiftsToShow = [...shiftsStartingHere, ...overnightShifts];

                          const shiftsCoveringThisSlot = getShiftsCoveringSlot(mission.id, slot.date, slot.hour, slot.minute);
                          const hasShifts = shiftsCoveringThisSlot.length > 0;

                          // Get shifts that are continuing through this slot (started earlier, not shown as cards here)
                          // These need to be shown as continuation markers even if other shifts start at this slot
                          const allShiftsToShowIds = new Set(allShiftsToShow.map(s => s.id));
                          const continuingShifts = shiftsCoveringThisSlot.filter(s => !allShiftsToShowIds.has(s.id));

                          const isCurrentDay = slot.date.getTime() === startOfDay(selectedDate).getTime();

                          return (
                            <td
                              key={`cell-${idx}`}
                              className={clsx(
                                'px-1 py-1 border-l border-l-slate-200 align-top',
                                slot.isFirstOfDay && 'border-r-2 border-r-slate-400',
                                isCurrentDay ? 'bg-blue-50/30' : ''
                              )}
                            >
                              <div className="min-h-[60px] space-y-1">
                                {/* Show shifts starting at this slot (or continuing from previous day at 00:00) */}
                                {allShiftsToShow.map((shift) => (
                                  <ShiftCell
                                    key={shift.id}
                                    shift={shift}
                                    soldierName={getSoldierName(shift.soldierId)}
                                    alerts={alertsByShift.get(shift.id)}
                                    missionId={mission.id}
                                    hour={slot.hour}
                                    platoonColor={getPlatoonColor(shift.soldierId)}
                                    certificates={getSoldierCertificates(shift.soldierId)}
                                  />
                                ))}

                                {/* Show continuation markers with soldier names for shifts that started earlier */}
                                {continuingShifts.map((shift) => {
                                  const platoonColor = getPlatoonColor(shift.soldierId);
                                  const certs = getSoldierCertificates(shift.soldierId);
                                  return (
                                    <div
                                      key={`cont-${shift.id}`}
                                      className="px-1 py-0.5 rounded text-[10px] border opacity-70"
                                      style={platoonColor ? {
                                        backgroundColor: `${platoonColor}15`,
                                        borderColor: `${platoonColor}40`,
                                        color: platoonColor,
                                      } : {
                                        backgroundColor: '#EFF6FF',
                                        borderColor: '#BFDBFE',
                                        color: '#1D4ED8',
                                      }}
                                      title={`${getSoldierName(shift.soldierId)}${certs.length > 0 ? ` | ${certs.join(', ')}` : ''}`}
                                    >
                                      <span className="font-medium truncate block">{getSoldierName(shift.soldierId)}</span>
                                      {certs.length > 0 && (
                                        <span className="flex gap-0.5 opacity-75">
                                          {certs.slice(0, 2).map((cert, i) => (
                                            <span key={i} className="px-0.5 bg-black/10 rounded">
                                              {cert.slice(0, 2)}
                                            </span>
                                          ))}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Add/Edit button - always visible for multiple assignments */}
                                <button
                                  onClick={() => handleCellClick(mission, slot.date, slot.hour, slot.minute)}
                                  className={clsx(
                                    'w-full flex items-center justify-center rounded transition-colors',
                                    hasShifts
                                      ? 'h-5 hover:bg-blue-100 opacity-40 hover:opacity-100'
                                      : 'h-10 hover:bg-slate-100'
                                  )}
                                  title={hasShifts ? 'ערוך שיבוץ' : 'הוסף שיבוץ'}
                                >
                                  {hasShifts ? (
                                    <Pencil className="w-3 h-3 text-slate-300 hover:text-blue-500" />
                                  ) : (
                                    <Plus className="w-4 h-4 text-slate-300 hover:text-blue-500" />
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={timeSlots.length + 1}
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

        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded" />
              <span>משמרת תקינה</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded" />
              <span>אזהרה (הפרת מנוחה)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
              <span>שגיאה (כפילות)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border border-slate-200 rounded" />
              <span>המשך משמרת</span>
            </div>
          </div>
        </div>

        {/* Soldier Shift/Rest Distribution by Platoon */}
        <div className="space-y-4">
          {/* Timeframe selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">התפלגות עבודה/מנוחה</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">טווח זמן:</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {([24, 48, 60, 72] as const).map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setDistributionTimeframe(hours)}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        distributionTimeframe === hours
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {hours} ש׳
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {Array.from(soldiersByPlatoon.entries()).map(([platoonId, { platoon, soldiers: platoonSoldiers }]) => {
            // Show all platoons that have soldiers
            if (platoonSoldiers.length === 0) return null;

            const soldiersWithShifts = platoonSoldiers.filter((s) => s.totalMinutes > 0);

            return (
              <div key={platoonId} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5" style={{ color: platoon?.color || '#64748B' }} />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {platoon?.name || 'ללא מחלקה'}
                  </h3>
                  <span className="text-xs text-slate-500">
                    ({platoonSoldiers.length} חיילים, {soldiersWithShifts.length} במשמרות)
                  </span>
                </div>

                <div className="space-y-2">
                  {platoonSoldiers.map(({ soldier, totalMinutes, shifts: soldierShifts }) => {
                    const totalHours = totalMinutes / 60;
                    const restMinutes = distributionTimeframe * 60 - totalMinutes;
                    const shiftPercentage = Math.min((totalMinutes / (distributionTimeframe * 60)) * 100, 100);

                    // Determine bar color based on shift load (proportional to timeframe)
                    const loadRatio = totalMinutes / (distributionTimeframe * 60);
                    let barColor = platoon?.color || '#3B82F6';
                    let statusColor = 'text-slate-600';
                    if (loadRatio >= 0.5) { // 50%+ of time in shifts
                      barColor = '#EF4444'; // Red for heavy load
                      statusColor = 'text-red-600';
                    } else if (loadRatio >= 0.33) { // 33%+ of time in shifts
                      barColor = '#F59E0B'; // Orange for moderate load
                      statusColor = 'text-orange-600';
                    } else if (totalMinutes === 0) {
                      barColor = '#E2E8F0'; // Light gray for no shifts
                    }

                    return (
                      <div key={soldier.id} className="flex items-center gap-3">
                        {/* Soldier name */}
                        <div className="w-24 text-sm font-medium text-slate-900 truncate" title={soldier.name}>
                          {soldier.name}
                        </div>

                        {/* Progress bar */}
                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                          {/* Shift portion */}
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(shiftPercentage, totalMinutes > 0 ? 2 : 0)}%`,
                              backgroundColor: barColor,
                            }}
                          />
                          {/* Time labels inside bar */}
                          <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px]">
                            <span className={clsx(
                              'font-medium',
                              shiftPercentage > 15 ? 'text-white' : 'text-slate-600'
                            )}>
                              {totalHours.toFixed(1)} ש׳
                            </span>
                            {shiftPercentage < 85 && (
                              <span className="text-slate-500">
                                {(restMinutes / 60).toFixed(1)} ש׳ מנוחה
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Shift details */}
                        <div className={clsx('w-20 text-xs text-left', statusColor)}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{soldierShifts.length} משמרות</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Platoon summary */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    סה״כ: {(platoonSoldiers.reduce((sum, s) => sum + s.totalMinutes, 0) / 60).toFixed(1)} שעות משמרת
                  </span>
                  <span>
                    ממוצע: {platoonSoldiers.length > 0 ? (platoonSoldiers.reduce((sum, s) => sum + s.totalMinutes, 0) / platoonSoldiers.length / 60).toFixed(1) : '0'} ש׳ לחייל
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeShift && (
          <SoldierDragOverlay soldierName={getSoldierName(activeShift.soldierId)} />
        )}
      </DragOverlay>

      {/* Assignment Modal */}
      {modalData && (
        <ShiftAssignmentModal
          mission={modalData.mission}
          startTime={modalData.startTime}
          soldiers={soldiers}
          platoons={platoons}
          certificates={certificates}
          statuses={statuses}
          existingShifts={shifts}
          allShifts={shifts}
          missions={missions}
          currentSlotShifts={modalData.currentSlotShifts}
          onAssign={handleAssignSoldiers}
          onRemove={handleRemoveShift}
          onTrimShift={handleTrimShift}
          onClose={() => setModalData(null)}
        />
      )}
    </DndContext>
  );
}
