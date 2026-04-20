'use client';

import { Team } from '@/lib/types';

interface TeamPickerProps {
  selectedTeam: Team | null;
  onPick: (team: Team) => void;
}

export default function TeamPicker({ selectedTeam, onPick }: TeamPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <button
        onClick={() => onPick('red')}
        className={`py-8 rounded-2xl font-bold text-xl transition-all ${
          selectedTeam === 'red'
            ? 'bg-red-500 text-white scale-105 ring-4 ring-red-300'
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
      >
        RED
      </button>
      <button
        onClick={() => onPick('blue')}
        className={`py-8 rounded-2xl font-bold text-xl transition-all ${
          selectedTeam === 'blue'
            ? 'bg-blue-500 text-white scale-105 ring-4 ring-blue-300'
            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
        }`}
      >
        BLUE
      </button>
    </div>
  );
}
