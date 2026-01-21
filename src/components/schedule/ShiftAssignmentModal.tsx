import { useState, useMemo } from 'react';
import { X, AlertTriangle, AlertCircle, Clock, User, Users, Check, Award, Info, Search, Calendar, ChevronDown, ChevronUp, History, RefreshCw } from 'lucide-react';
import { format, addMinutes, differenceInHours, differenceInMinutes, subDays, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Mission, Soldier, Shift, Platoon, Certificate, SoldierStatusDef } from '../../types/entities';
import { suggestSoldiersForShift } from '../../services/fairnessCalculator';
import { validateShiftAssignment } from '../../services/validationService';
import { labels } from '../../utils/translations';
import clsx from 'clsx';

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 30, label: '30 דקות' },
  { value: 60, label: 'שעה' },
  { value: 90, label: 'שעה וחצי' },
  { value: 120, label: 'שעתיים' },
  { value: 180, label: '3 שעות' },
  { value: 240, label: '4 שעות' },
  { value: 360, label: '6 שעות' },
  { value: 480, label: '8 שעות' },
  { value: 720, label: '12 שעות' },
  { value: 1440, label: '24 שעות (יום)' },
  { value: 2880, label: '2 ימים' },
  { value: 4320, label: '3 ימים' },
  { value: 5760, label: '4 ימים' },
  { value: 7200, label: '5 ימים' },
  { value: 10080, label: 'שבוע' },
];

// Number of days to look back for recent shifts
const RECENT_DAYS = 7;
// Number of days to consider "same mission recently" warning
const SAME_MISSION_WARNING_DAYS = 3;

interface ShiftAssignmentModalProps {
  mission: Mission;
  startTime: Date;
  soldiers: Soldier[];
  platoons: Platoon[];
  certificates: Certificate[];
  statuses: SoldierStatusDef[];
  existingShifts: Shift[];
  allShifts: Shift[]; // All shifts for history lookup
  missions: Mission[]; // All missions for name lookup
  currentSlotShifts?: Shift[]; // Shifts already assigned at this slot
  onAssign: (soldierIds: string[], startTime: Date, endTime: Date) => void;
  onClose: () => void;
}

export function ShiftAssignmentModal({
  mission,
  startTime: initialStartTime,
  soldiers,
  platoons,
  certificates,
  statuses,
  existingShifts,
  allShifts,
  missions,
  currentSlotShifts = [],
  onAssign,
  onClose,
}: ShiftAssignmentModalProps) {
  // Pre-select soldiers from existing shifts at this slot
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<Set<string>>(() => {
    return new Set(currentSlotShifts.map(s => s.soldierId));
  });
  // Default duration: use existing shift duration if editing, otherwise 2 hours
  const [durationMinutes, setDurationMinutes] = useState(() => {
    if (currentSlotShifts.length > 0) {
      const firstShift = currentSlotShifts[0];
      const duration = differenceInMinutes(new Date(firstShift.endTime), new Date(firstShift.startTime));
      // Find matching duration option or default to 120
      const matchingOption = DURATION_OPTIONS.find(opt => opt.value === duration);
      return matchingOption ? duration : 120;
    }
    return 120;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSoldierIds, setExpandedSoldierIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const startTime = initialStartTime;
  const endTime = addMinutes(startTime, durationMinutes);

  // Calculate recent shifts per soldier (last 7 days)
  const recentShiftsBySoldier = useMemo(() => {
    const cutoffDate = subDays(startTime, RECENT_DAYS);
    const result = new Map<string, Array<{ shift: Shift; missionName: string; daysAgo: number }>>();

    for (const shift of allShifts) {
      const shiftStart = new Date(shift.startTime);
      if (shiftStart >= cutoffDate && shiftStart < startTime) {
        const missionObj = missions.find(m => m.id === shift.missionId);
        const missionName = missionObj?.name || 'משימה לא ידועה';
        const daysAgo = differenceInDays(startTime, shiftStart);

        if (!result.has(shift.soldierId)) {
          result.set(shift.soldierId, []);
        }
        result.get(shift.soldierId)!.push({ shift, missionName, daysAgo });
      }
    }

    // Sort each soldier's shifts by date (most recent first)
    for (const shifts of result.values()) {
      shifts.sort((a, b) => new Date(b.shift.startTime).getTime() - new Date(a.shift.startTime).getTime());
    }

    return result;
  }, [allShifts, missions, startTime]);

  // Check if soldier did this same mission recently (within SAME_MISSION_WARNING_DAYS)
  const getSameMissionWarning = (soldierId: string): { daysAgo: number; count: number } | null => {
    const recentShifts = recentShiftsBySoldier.get(soldierId) || [];
    const sameMissionShifts = recentShifts.filter(
      rs => rs.shift.missionId === mission.id && rs.daysAgo <= SAME_MISSION_WARNING_DAYS
    );
    if (sameMissionShifts.length > 0) {
      return {
        daysAgo: Math.min(...sameMissionShifts.map(s => s.daysAgo)),
        count: sameMissionShifts.length,
      };
    }
    return null;
  };

  const toggleSoldierExpand = (soldierId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedSoldierIds);
    if (newExpanded.has(soldierId)) {
      newExpanded.delete(soldierId);
    } else {
      newExpanded.add(soldierId);
    }
    setExpandedSoldierIds(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedSoldierIds(new Set());
    } else {
      // Expand all soldiers that have recent shifts
      const allWithHistory = new Set(recentShiftsBySoldier.keys());
      setExpandedSoldierIds(allWithHistory);
    }
    setExpandAll(!expandAll);
  };

  // Get suggested soldiers sorted by availability (show all platoons)
  const suggestions = useMemo(() => {
    return suggestSoldiersForShift(
      soldiers,
      null, // Show all platoons, not just mission's platoon
      existingShifts,
      startTime,
      endTime,
      9999 // Show all soldiers
    );
  }, [soldiers, existingShifts, startTime, endTime]);

  // Filter suggestions by search term
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return suggestions;
    const term = searchTerm.toLowerCase();
    return suggestions.filter(({ soldier }) =>
      soldier.name.toLowerCase().includes(term) ||
      soldier.personalNumber.includes(term)
    );
  }, [suggestions, searchTerm]);

  // Group soldiers by platoon (consolidate non-existent platoons into one group)
  const soldiersByPlatoon = useMemo(() => {
    const grouped = new Map<string, typeof filteredSuggestions>();
    const NO_PLATOON_KEY = '__no_platoon__';

    for (const suggestion of filteredSuggestions) {
      const platoonId = suggestion.soldier.platoonId;
      // Check if platoon exists, if not group under "no platoon"
      const platoonExists = platoons.some(p => p.id === platoonId);
      const groupKey = platoonExists ? platoonId : NO_PLATOON_KEY;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(suggestion);
    }

    return grouped;
  }, [filteredSuggestions, platoons]);

  // Get validation results for selected soldiers
  const validationResults = useMemo(() => {
    const results = new Map<string, { isValid: boolean; hasWarning: boolean }>();

    for (const soldierId of selectedSoldierIds) {
      const soldier = soldiers.find((s) => s.id === soldierId);
      if (!soldier) continue;

      const validation = validateShiftAssignment(
        soldierId,
        startTime,
        endTime,
        existingShifts,
        soldier
      );

      results.set(soldierId, {
        isValid: validation.isValid,
        hasWarning: validation.alerts.some(a => a.type === 'warning'),
      });
    }

    return results;
  }, [selectedSoldierIds, startTime, endTime, existingShifts, soldiers]);

  const toggleSoldier = (soldierId: string, hasConflict: boolean) => {
    if (hasConflict) return;

    const newSelected = new Set(selectedSoldierIds);
    if (newSelected.has(soldierId)) {
      newSelected.delete(soldierId);
    } else {
      newSelected.add(soldierId);
    }
    setSelectedSoldierIds(newSelected);
  };

  const handleAssign = () => {
    const validSoldierIds = Array.from(selectedSoldierIds).filter(id => {
      const result = validationResults.get(id);
      return result?.isValid !== false;
    });

    if (validSoldierIds.length > 0) {
      onAssign(validSoldierIds, startTime, endTime);
    }
  };

  // Count how many soldiers are already assigned to this mission at this time
  const currentlyAssigned = existingShifts.filter(
    (s) =>
      s.missionId === mission.id &&
      new Date(s.startTime) <= startTime &&
      new Date(s.endTime) > startTime
  ).length;

  const spotsRemaining = mission.requiredSoldiers - currentlyAssigned;
  const canAssign = selectedSoldierIds.size > 0 &&
    Array.from(selectedSoldierIds).some(id => validationResults.get(id)?.isValid !== false);

  const getPlatoonName = (platoonId: string) => {
    if (platoonId === '__no_platoon__') return 'ללא מחלקה';
    const platoon = platoons.find(p => p.id === platoonId);
    return platoon?.name || 'ללא מחלקה';
  };

  const getCertificateName = (certId: string) => {
    const cert = certificates.find(c => c.id === certId);
    return cert?.name || '';
  };

  const getStatusName = (statusId: string) => {
    return statuses.find(s => s.id === statusId)?.name || 'לא ידוע';
  };

  const getStatusColor = (statusId: string) => {
    return statuses.find(s => s.id === statusId)?.color || '#6B7280';
  };

  const isStatusAvailable = (statusId: string) => {
    return statuses.find(s => s.id === statusId)?.isAvailable ?? false;
  };

  const getSoldierCertificateNames = (soldier: Soldier): string[] => {
    if (!soldier.certificateIds) return [];
    return soldier.certificateIds
      .map(id => getCertificateName(id))
      .filter(Boolean);
  };

  // Check if soldier has leave that overlaps or is within 12 hours of the shift
  const getLeaveWarning = (soldier: Soldier): { type: 'onLeave' | 'leavingSoon' | 'returningRecently' | null; message: string | null } => {
    if (!soldier.leaveStart && !soldier.leaveEnd) {
      return { type: null, message: null };
    }

    const leaveStart = soldier.leaveStart;
    const leaveEnd = soldier.leaveEnd;

    // Check if on leave during shift
    if (leaveStart && leaveEnd) {
      if (startTime >= leaveStart && startTime < leaveEnd) {
        return { type: 'onLeave', message: `ביציאה עד ${format(leaveEnd, 'dd/MM HH:mm')}` };
      }
      if (endTime > leaveStart && endTime <= leaveEnd) {
        return { type: 'onLeave', message: `ביציאה מ-${format(leaveStart, 'dd/MM HH:mm')}` };
      }
    }

    // Check if leaving within 12 hours after shift ends
    if (leaveStart) {
      const hoursUntilLeave = differenceInHours(leaveStart, endTime);
      if (hoursUntilLeave >= 0 && hoursUntilLeave <= 12) {
        return { type: 'leavingSoon', message: `יוצא בעוד ${hoursUntilLeave} שעות` };
      }
    }

    // Check if returning within 12 hours before shift starts
    if (leaveEnd) {
      const hoursSinceReturn = differenceInHours(startTime, leaveEnd);
      if (hoursSinceReturn >= 0 && hoursSinceReturn <= 12) {
        return { type: 'returningRecently', message: `חוזר ${hoursSinceReturn} שעות לפני` };
      }
    }

    return { type: null, message: null };
  };

  const requiredCertNames = useMemo(() => {
    if (!mission.requiredCertificateIds) return [];
    return mission.requiredCertificateIds.map(id => getCertificateName(id)).filter(Boolean);
  }, [mission.requiredCertificateIds, certificates]);

  // Check which certificates are missing from the selected TEAM (not per soldier)
  const teamMissingCerts = useMemo(() => {
    if (!mission.requiredCertificateIds || mission.requiredCertificateIds.length === 0) {
      return [];
    }

    // Collect all certificates from selected soldiers
    const teamCertIds = new Set<string>();
    for (const soldierId of selectedSoldierIds) {
      const soldier = soldiers.find(s => s.id === soldierId);
      if (soldier?.certificateIds) {
        soldier.certificateIds.forEach(certId => teamCertIds.add(certId));
      }
    }

    // Find which required certificates are missing from the team
    const missingCertIds = mission.requiredCertificateIds.filter(reqCert => !teamCertIds.has(reqCert));
    return missingCertIds.map(id => getCertificateName(id)).filter(Boolean);
  }, [selectedSoldierIds, soldiers, mission.requiredCertificateIds]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">שיבוץ משמרת</h3>
            <p className="text-sm text-slate-500">{mission.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time & Duration info */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>
              {durationMinutes >= 1440 ? (
                // Multi-day format
                <>
                  {format(startTime, 'EEEE d/MM HH:mm', { locale: he })} - {format(endTime, 'EEEE d/MM HH:mm', { locale: he })}
                </>
              ) : (
                // Same-day format
                <>
                  {format(startTime, 'EEEE, d בMMMM', { locale: he })} | {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </>
              )}
            </span>
          </div>

          {/* Duration selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">משך:</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Spots info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-600">נדרשים:</span>
              <span className="font-medium text-slate-900">{mission.requiredSoldiers}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">משובצים:</span>
              <span className="font-medium text-slate-900">{currentlyAssigned}</span>
              {spotsRemaining > 0 && (
                <span className="text-orange-600">(חסרים {spotsRemaining})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600 font-medium">נבחרו: {selectedSoldierIds.size}</span>
            </div>
          </div>

          {/* Required certificates */}
          {requiredCertNames.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-amber-600" />
              <span className="text-slate-600">הסמכות נדרשות:</span>
              <div className="flex gap-1">
                {requiredCertNames.map((name, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search bar and expand all */}
        <div className="px-4 pt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם או מספר אישי..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={toggleExpandAll}
            className={clsx(
              'flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
              expandAll
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
            title={expandAll ? 'סגור הכל' : 'הצג היסטוריה'}
          >
            <History className="w-4 h-4" />
            {expandAll ? 'סגור' : 'היסטוריה'}
          </button>
        </div>

        {/* Soldier list grouped by platoon */}
        <div className="flex-1 overflow-y-auto p-4">
          {Array.from(soldiersByPlatoon.entries()).map(([platoonId, platoonSoldiers]) => (
            <div key={platoonId} className="mb-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {getPlatoonName(platoonId)}
                <span className="text-slate-400 font-normal">({platoonSoldiers.length})</span>
              </h4>
              <div className="space-y-1">
                {platoonSoldiers.map(({ soldier, hasConflict, restViolationType }) => {
                  const isSelected = selectedSoldierIds.has(soldier.id);
                  const isCurrentlyUnavailable = !isStatusAvailable(soldier.statusId);
                  const leaveWarning = getLeaveWarning(soldier);
                  const isOnLeave = leaveWarning.type === 'onLeave';
                  // Only block if on leave during the shift time, NOT for current status
                  // Current status (like "at home") is temporary and should only show a warning for future shifts
                  const isDisabled = hasConflict || isOnLeave;
                  const soldierCerts = getSoldierCertificateNames(soldier);
                  const sameMissionWarning = getSameMissionWarning(soldier.id);
                  const recentShifts = recentShiftsBySoldier.get(soldier.id) || [];
                  const isExpanded = expandedSoldierIds.has(soldier.id) || expandAll;

                  return (
                    <div key={soldier.id} className="rounded-lg border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleSoldier(soldier.id, isDisabled)}
                        disabled={isDisabled}
                        className={clsx(
                          'w-full flex items-center gap-3 p-2 text-right transition-colors',
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-slate-50',
                          hasConflict && 'opacity-50 cursor-not-allowed bg-red-50',
                          isOnLeave && !hasConflict && 'opacity-50 cursor-not-allowed bg-purple-50',
                          isCurrentlyUnavailable && !hasConflict && !isOnLeave && !isSelected && 'bg-amber-50'
                        )}
                      >
                        {/* Checkbox */}
                        <div className={clsx(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300',
                          hasConflict && 'border-red-300 bg-red-100',
                          isOnLeave && !hasConflict && 'border-purple-300 bg-purple-100'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        <User className="w-4 h-4 text-slate-400 shrink-0" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900 text-sm">{soldier.name}</span>
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${getStatusColor(soldier.statusId)}20`,
                                color: getStatusColor(soldier.statusId),
                              }}
                            >
                              {getStatusName(soldier.statusId)}
                            </span>
                            {/* Same mission recently badge */}
                            {sameMissionWarning && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium">
                                <RefreshCw className="w-3 h-3" />
                                {sameMissionWarning.daysAgo === 0 ? 'היום' : sameMissionWarning.daysAgo === 1 ? 'אתמול' : `לפני ${sameMissionWarning.daysAgo} ימים`}
                              </span>
                            )}
                            {hasConflict && (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                תפוס
                              </span>
                            )}
                            {isOnLeave && !hasConflict && (
                              <span className="flex items-center gap-1 text-xs text-purple-600">
                                <Calendar className="w-3 h-3" />
                                {leaveWarning.message}
                              </span>
                            )}
                            {isCurrentlyUnavailable && !hasConflict && !isOnLeave && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="w-3 h-3" />
                                כרגע {getStatusName(soldier.statusId)}
                              </span>
                            )}
                            {leaveWarning.type === 'leavingSoon' && !hasConflict && !isOnLeave && (
                              <span className="flex items-center gap-1 text-xs text-orange-600">
                                <Calendar className="w-3 h-3" />
                                {leaveWarning.message}
                              </span>
                            )}
                            {leaveWarning.type === 'returningRecently' && !hasConflict && !isOnLeave && (
                              <span className="flex items-center gap-1 text-xs text-blue-600">
                                <Calendar className="w-3 h-3" />
                                {leaveWarning.message}
                              </span>
                            )}
                            {restViolationType === 'error' && !hasConflict && !isCurrentlyUnavailable && !isOnLeave && (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                מנוחה קריטית
                              </span>
                            )}
                            {restViolationType === 'warning' && !hasConflict && !isCurrentlyUnavailable && !isOnLeave && (
                              <span className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="w-3 h-3" />
                                מנוחה
                              </span>
                            )}
                          </div>
                          {/* Soldier certificates */}
                          {soldierCerts.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {soldierCerts.map((certName, i) => {
                                const isRequired = requiredCertNames.includes(certName);
                                return (
                                  <span
                                    key={i}
                                    className={clsx(
                                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                      isRequired
                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                        : 'bg-slate-100 text-slate-600'
                                    )}
                                  >
                                    {certName}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Expand button for history */}
                        {recentShifts.length > 0 && (
                          <div
                            onClick={(e) => toggleSoldierExpand(soldier.id, e)}
                            className="p-1 hover:bg-slate-200 rounded shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        )}
                      </button>

                      {/* Expandable recent shifts history */}
                      {isExpanded && recentShifts.length > 0 && (
                        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2">
                          <div className="text-[10px] text-slate-500 mb-1 font-medium">משמרות אחרונות (7 ימים):</div>
                          <div className="space-y-1">
                            {recentShifts.map((rs, idx) => (
                              <div
                                key={idx}
                                className={clsx(
                                  'flex items-center gap-2 text-xs px-2 py-1 rounded',
                                  rs.shift.missionId === mission.id ? 'bg-pink-50 text-pink-700' : 'bg-white text-slate-600'
                                )}
                              >
                                <span className="font-medium">{rs.missionName}</span>
                                <span className="text-slate-400">|</span>
                                <span>{format(new Date(rs.shift.startTime), 'EEEE dd/MM', { locale: he })}</span>
                                <span className="text-slate-400">
                                  {format(new Date(rs.shift.startTime), 'HH:mm')} - {format(new Date(rs.shift.endTime), 'HH:mm')}
                                </span>
                                {rs.shift.missionId === mission.id && (
                                  <span className="mr-auto text-pink-600 text-[10px]">אותה משימה</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Validation summary */}
        {selectedSoldierIds.size > 0 && (
          <div className="px-6 py-2 border-t border-slate-200 bg-slate-50">
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedSoldierIds).map(id => {
                const soldier = soldiers.find(s => s.id === id);
                const validation = validationResults.get(id);
                if (!soldier) return null;

                return (
                  <span
                    key={id}
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                      validation?.isValid === false ? 'bg-red-100 text-red-800' :
                      validation?.hasWarning ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    )}
                  >
                    {soldier.name}
                    <button
                      onClick={() => toggleSoldier(id, false)}
                      className="hover:bg-black/10 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Missing certificates warning - for the team as a whole */}
        {teamMissingCerts.length > 0 && selectedSoldierIds.size > 0 && (
          <div className="px-6 py-2 border-t border-slate-200 bg-amber-50">
            <div className="flex items-start gap-2 text-sm text-amber-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">הסמכות חסרות לצוות:</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {teamMissingCerts.map((certName, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded text-xs font-medium"
                    >
                      {certName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={handleAssign}
            disabled={!canAssign}
            className={clsx(
              'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
              canAssign
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            שבץ {selectedSoldierIds.size > 0 ? `(${selectedSoldierIds.size})` : ''}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {labels.actions.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
