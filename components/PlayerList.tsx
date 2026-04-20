'use client';

import { Player } from '@/lib/types';

interface PlayerListProps {
  players: Player[];
}

export default function PlayerList({ players }: PlayerListProps) {
  const redTeam = players.filter((p) => p.team === 'red');
  const blueTeam = players.filter((p) => p.team === 'blue');
  const noTeam = players.filter((p) => !p.team);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Red Team */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <h3 className="text-red-400 font-bold text-sm mb-2 text-center">
            RED ({redTeam.length})
          </h3>
          <div className="flex flex-col gap-1">
            {redTeam.map((p) => (
              <div key={p.id} className="text-center text-sm text-red-300">
                {p.nickname}
              </div>
            ))}
          </div>
        </div>

        {/* Blue Team */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
          <h3 className="text-blue-400 font-bold text-sm mb-2 text-center">
            BLUE ({blueTeam.length})
          </h3>
          <div className="flex flex-col gap-1">
            {blueTeam.map((p) => (
              <div key={p.id} className="text-center text-sm text-blue-300">
                {p.nickname}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* No team */}
      {noTeam.length > 0 && (
        <div className="text-center text-slate-500 text-xs">
          팀 미선택: {noTeam.map((p) => p.nickname).join(', ')}
        </div>
      )}
    </div>
  );
}
