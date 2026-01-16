import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Eye, Download } from 'lucide-react';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { useMissionStore } from '../stores/missionStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSoldierStore } from '../stores/soldierStore';
import { usePlatoonStore } from '../stores/platoonStore';
import { labels } from '../utils/translations';

export function ViewPage() {
  const { missions, loadMissions } = useMissionStore();
  const { shifts, loadShifts } = useScheduleStore();
  const { soldiers, loadSoldiers } = useSoldierStore();
  const { platoons, loadPlatoons } = usePlatoonStore();

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadMissions();
    loadSoldiers();
    loadShifts();
    loadPlatoons();
  }, [loadMissions, loadSoldiers, loadShifts, loadPlatoons]);

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
      </div>

      {/* Assignments by Mission */}
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
    </div>
  );
}
