import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Users, Plus } from 'lucide-react';
import { format, addDays, subDays, setHours, setMinutes, startOfDay } from 'date-fns';
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
import { ShiftAssignmentModal } from '../components/schedule/ShiftAssignmentModal';
import { ShiftCell } from '../components/schedule/ShiftCell';
import { SoldierDragOverlay } from '../components/schedule/SoldierDragOverlay';
import { validateDaySchedule } from '../services/validationService';
import { calculateShiftScore } from '../services/fairnessCalculator';
import { labels } from '../utils/translations';
import { STATUS_COLORS } from '../utils/constants';
import type { Mission, Shift } from '../types/entities';
import clsx from 'clsx';

// Generate 30-minute time slots for precise scheduling
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  TIME_SLOTS.push({ hour: h, minute: 0, label: `${String(h).padStart(2, '0')}:00` });
  TIME_SLOTS.push({ hour: h, minute: 30, label: `${String(h).padStart(2, '0')}:30` });
}

export function SchedulePage() {
  const { missions, loadMissions } = useMissionStore();
  const { shifts, selectedDate, setSelectedDate, loadShifts, addShift, deleteShift } = useScheduleStore();
  const { soldiers, loadSoldiers, updateFairnessScore } = useSoldierStore();
  const { platoons, currentPlatoonId, loadPlatoons, loadSquads } = usePlatoonStore();

  const [modalData, setModalData] = useState<{
    mission: Mission;
    startTime: Date;
  } | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

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
    loadMissions();
    loadSoldiers();
    loadShifts();
  }, [loadPlatoons, loadSquads, loadMissions, loadSoldiers, loadShifts]);

  const filteredMissions = currentPlatoonId
    ? missions.filter((m) => m.platoonId === currentPlatoonId)
    : missions;

  // Validate all shifts for the current day
  const alertsByShift = useMemo(() => {
    return validateDaySchedule(shifts, soldiers);
  }, [shifts, soldiers]);

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  // Get shifts that START at this exact time slot (hour:minute)
  const getShiftsStartingAtSlot = (missionId: string, hour: number, minute: number) => {
    return shifts.filter((s) => {
      const shiftStart = new Date(s.startTime);
      const shiftDate = new Date(selectedDate);
      return (
        s.missionId === missionId &&
        shiftStart.getDate() === shiftDate.getDate() &&
        shiftStart.getMonth() === shiftDate.getMonth() &&
        shiftStart.getFullYear() === shiftDate.getFullYear() &&
        shiftStart.getHours() === hour &&
        shiftStart.getMinutes() === minute
      );
    });
  };

  // Get all shifts that COVER this time slot (for showing continuation)
  // This includes overnight shifts that started on the previous day
  const getShiftsCoveringSlot = (missionId: string, hour: number, minute: number) => {
    const slotTime = setMinutes(setHours(startOfDay(selectedDate), hour), minute);
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
  const getOvernightShifts = (missionId: string) => {
    const dayStart = startOfDay(selectedDate);
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

  const getSoldierName = (soldierId: string) => {
    const soldier = soldiers.find((s) => s.id === soldierId);
    return soldier?.name || 'לא ידוע';
  };

  const handleCellClick = (mission: Mission, hour: number, minute: number) => {
    const startTime = setMinutes(setHours(startOfDay(selectedDate), hour), minute);
    setModalData({ mission, startTime });
  };

  const handleAssignSoldiers = async (soldierIds: string[], startTime: Date, endTime: Date) => {
    if (!modalData) return;

    for (const soldierId of soldierIds) {
      const shift = await addShift({
        missionId: modalData.mission.id,
        soldierId,
        startTime,
        endTime,
        status: 'scheduled',
      });

      // Calculate and update fairness score
      const score = calculateShiftScore(shift, modalData.mission);
      await updateFairnessScore(soldierId, score);
    }

    setModalData(null);
  };

  const handleRemoveShift = async (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    // Subtract fairness points
    const mission = missions.find((m) => m.id === shift.missionId);
    if (mission) {
      const score = calculateShiftScore(shift, mission);
      await updateFairnessScore(shift.soldierId, -score);
    }

    await deleteShift(shiftId);
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

        const newShift = await addShift({
          missionId: targetMissionId,
          soldierId: shift.soldierId,
          startTime,
          endTime,
          status: 'scheduled',
        });

        const score = calculateShiftScore(newShift, mission);
        await updateFairnessScore(shift.soldierId, score);
      }
    }
  };

  // Get available soldiers for sidebar
  const availableSoldiers = soldiers.filter(
    (s) => s.status === 'available' && (!currentPlatoonId || s.platoonId === currentPlatoonId)
  );

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
            <div className="max-h-[calc(100vh-380px)] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky right-0 z-10 bg-slate-50 px-3 py-2 text-right text-sm font-semibold text-slate-900 border-l border-slate-200 min-w-[120px]">
                      {labels.missions}
                    </th>
                    {TIME_SLOTS.map((slot) => (
                      <th
                        key={slot.label}
                        className="px-1 py-2 text-center text-xs font-medium text-slate-600 border-l border-slate-200 min-w-[70px]"
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
                        {TIME_SLOTS.map((slot) => {
                          const shiftsStartingHere = getShiftsStartingAtSlot(mission.id, slot.hour, slot.minute);
                          // At 00:00, also include overnight shifts from previous day
                          const overnightShifts = slot.hour === 0 && slot.minute === 0
                            ? getOvernightShifts(mission.id)
                            : [];
                          const allShiftsToShow = [...shiftsStartingHere, ...overnightShifts];

                          const shiftsCoveringThisSlot = getShiftsCoveringSlot(mission.id, slot.hour, slot.minute);
                          const hasShifts = shiftsCoveringThisSlot.length > 0;

                          // Check if this slot is covered by a shift that started earlier (continuation)
                          // For 00:00 with overnight shifts, don't show as continuation since we show the card
                          const isContinuation = hasShifts && allShiftsToShow.length === 0;

                          return (
                            <td
                              key={slot.label}
                              className={clsx(
                                'px-1 py-1 border-l border-slate-200 align-top',
                                isContinuation && 'bg-blue-50/50'
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
                                    onRemove={handleRemoveShift}
                                  />
                                ))}

                                {/* Add button - always visible for multiple assignments */}
                                <button
                                  onClick={() => handleCellClick(mission, slot.hour, slot.minute)}
                                  className={clsx(
                                    'w-full flex items-center justify-center rounded transition-colors',
                                    hasShifts
                                      ? 'h-5 hover:bg-blue-100 opacity-40 hover:opacity-100'
                                      : 'h-10 hover:bg-slate-100'
                                  )}
                                  title="הוסף שיבוץ"
                                >
                                  <Plus className={clsx(
                                    'text-slate-300 hover:text-blue-500',
                                    hasShifts ? 'w-3 h-3' : 'w-4 h-4'
                                  )} />
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

          {/* Available Soldiers - at bottom for visibility while scrolling timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">חיילים זמינים</h3>
                <span className="text-sm text-slate-500">({availableSoldiers.length})</span>
              </div>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-sm text-blue-600"
              >
                {showSidebar ? 'הסתר' : 'הצג'}
              </button>
            </div>
            {showSidebar && (
              <div className="flex flex-wrap gap-2">
                {availableSoldiers
                  .sort((a, b) => a.fairnessScore - b.fairnessScore)
                  .map((soldier) => (
                    <div
                      key={soldier.id}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{soldier.name}</p>
                        <p className="text-xs text-slate-500">
                          ציון: {soldier.fairnessScore.toFixed(1)}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          STATUS_COLORS[soldier.status]
                        )}
                      >
                        {labels.status[soldier.status]}
                      </span>
                    </div>
                  ))}
                {availableSoldiers.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2 w-full">
                    אין חיילים זמינים
                  </p>
                )}
              </div>
            )}
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
          existingShifts={shifts}
          onAssign={handleAssignSoldiers}
          onClose={() => setModalData(null)}
        />
      )}
    </DndContext>
  );
}
