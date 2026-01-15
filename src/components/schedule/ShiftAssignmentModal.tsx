import { useState, useMemo } from 'react';
import { X, AlertTriangle, AlertCircle, Clock, User, Users, Check, Award, Info } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Mission, Soldier, Shift, Platoon, Certificate } from '../../types/entities';
import { suggestSoldiersForShift } from '../../services/fairnessCalculator';
import { validateShiftAssignment } from '../../services/validationService';
import { labels } from '../../utils/translations';
import { STATUS_COLORS } from '../../utils/constants';
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
];

interface ShiftAssignmentModalProps {
  mission: Mission;
  startTime: Date;
  soldiers: Soldier[];
  platoons: Platoon[];
  certificates: Certificate[];
  existingShifts: Shift[];
  onAssign: (soldierIds: string[], startTime: Date, endTime: Date) => void;
  onClose: () => void;
}

export function ShiftAssignmentModal({
  mission,
  startTime: initialStartTime,
  soldiers,
  platoons,
  certificates,
  existingShifts,
  onAssign,
  onClose,
}: ShiftAssignmentModalProps) {
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<Set<string>>(new Set());
  const [durationMinutes, setDurationMinutes] = useState(120); // Default 2 hours

  const startTime = initialStartTime;
  const endTime = addMinutes(startTime, durationMinutes);

  // Get suggested soldiers sorted by fairness (show all platoons)
  const suggestions = useMemo(() => {
    return suggestSoldiersForShift(
      soldiers,
      null, // Show all platoons, not just mission's platoon
      existingShifts,
      startTime,
      endTime,
      50 // Show all
    );
  }, [soldiers, existingShifts, startTime, endTime]);

  // Group soldiers by platoon
  const soldiersByPlatoon = useMemo(() => {
    const grouped = new Map<string, typeof suggestions>();

    for (const suggestion of suggestions) {
      const platoonId = suggestion.soldier.platoonId;
      if (!grouped.has(platoonId)) {
        grouped.set(platoonId, []);
      }
      grouped.get(platoonId)!.push(suggestion);
    }

    return grouped;
  }, [suggestions]);

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
    const platoon = platoons.find(p => p.id === platoonId);
    return platoon?.name || 'ללא מחלקה';
  };

  const getCertificateName = (certId: string) => {
    const cert = certificates.find(c => c.id === certId);
    return cert?.name || '';
  };

  const getSoldierCertificateNames = (soldier: Soldier): string[] => {
    if (!soldier.certificateIds) return [];
    return soldier.certificateIds
      .map(id => getCertificateName(id))
      .filter(Boolean);
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
              {format(startTime, 'EEEE, d בMMMM', { locale: he })} | {' '}
              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
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
                {platoonSoldiers.map(({ soldier, score, hasConflict, hasRestViolation }) => {
                  const isSelected = selectedSoldierIds.has(soldier.id);
                  const isUnavailable = soldier.status !== 'available';
                  const isDisabled = hasConflict || isUnavailable;
                  const soldierCerts = getSoldierCertificateNames(soldier);

                  return (
                    <button
                      key={soldier.id}
                      onClick={() => toggleSoldier(soldier.id, isDisabled)}
                      disabled={isDisabled}
                      className={clsx(
                        'w-full flex items-center gap-3 p-2 rounded-lg border text-right transition-colors',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50',
                        hasConflict && 'opacity-50 cursor-not-allowed bg-red-50 border-red-200',
                        isUnavailable && !hasConflict && 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-300'
                      )}
                    >
                      {/* Checkbox */}
                      <div className={clsx(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300',
                        hasConflict && 'border-red-300 bg-red-100',
                        isUnavailable && !hasConflict && 'border-slate-400 bg-slate-200'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      <User className="w-4 h-4 text-slate-400 shrink-0" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 text-sm">{soldier.name}</span>
                          <span
                            className={clsx(
                              'px-1.5 py-0.5 rounded text-xs font-medium',
                              STATUS_COLORS[soldier.status]
                            )}
                          >
                            {labels.status[soldier.status]}
                          </span>
                          {hasConflict && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              תפוס
                            </span>
                          )}
                          {hasRestViolation && !hasConflict && !isUnavailable && (
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

                      <span className="text-xs text-slate-500">
                        {score.toFixed(1)}
                      </span>
                    </button>
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
