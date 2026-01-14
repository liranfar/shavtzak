import { User } from 'lucide-react';

interface SoldierDragOverlayProps {
  soldierName: string;
}

export function SoldierDragOverlay({ soldierName }: SoldierDragOverlayProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg">
      <User className="w-4 h-4" />
      <span className="font-medium">{soldierName}</span>
    </div>
  );
}
