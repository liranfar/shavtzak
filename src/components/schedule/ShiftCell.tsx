import { useDraggable } from '@dnd-kit/core';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
import type { Shift, ValidationAlert } from '../../types/entities';
import { getHighestAlertType } from '../../services/validationService';
import { format } from 'date-fns';
import clsx from 'clsx';

interface ShiftCellProps {
  shift?: Shift;
  soldierName?: string;
  alerts?: ValidationAlert[];
  missionId: string;
  hour: number;
  minute?: number;
  onRemove?: (shiftId: string) => void;
}

export function ShiftCell({
  shift,
  soldierName,
  alerts = [],
  missionId,
  hour,
  minute = 0,
  onRemove,
}: ShiftCellProps) {
  const droppableId = `${missionId}-${hour}-${minute}`;

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: shift?.id || droppableId,
    data: { shift, missionId, hour, minute },
    disabled: !shift,
  });

  const alertType = getHighestAlertType(alerts);

  if (shift && soldierName) {
    const startTime = new Date(shift.startTime);
    const endTime = new Date(shift.endTime);

    return (
      <div
        ref={setDraggableRef}
        {...listeners}
        {...attributes}
        className={clsx(
          'relative group px-1.5 py-1 rounded text-xs cursor-grab active:cursor-grabbing transition-all',
          isDragging && 'opacity-50',
          alertType === 'error' && 'bg-red-100 text-red-800 border border-red-300',
          alertType === 'warning' && 'bg-orange-100 text-orange-800 border border-orange-300',
          alertType === 'info' && 'bg-blue-100 text-blue-800 border border-blue-200',
          !alertType && 'bg-blue-100 text-blue-800 border border-blue-200'
        )}
        title={`${soldierName} | ${format(startTime, 'HH:mm')}-${format(endTime, 'HH:mm')}`}
      >
        <div className="flex items-center gap-1">
          {alertType === 'error' && <AlertCircle className="w-3 h-3 shrink-0" />}
          {alertType === 'warning' && <AlertTriangle className="w-3 h-3 shrink-0" />}
          <span className="truncate font-medium">{soldierName}</span>
        </div>
        <div className="text-[10px] opacity-75">
          {format(startTime, 'HH:mm')}-{format(endTime, 'HH:mm')}
        </div>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(shift.id);
            }}
            className="absolute -top-1 -left-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // Empty droppable cell - handled by parent now
  return null;
}
