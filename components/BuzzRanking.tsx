'use client';

import { RankEntry } from '@/lib/types';

interface BuzzRankingProps {
  ranking: RankEntry[];
}

export default function BuzzRanking({ ranking }: BuzzRankingProps) {
  if (ranking.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 text-2xl animate-pulse">버저를 기다리는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full max-w-lg mx-auto">
      {ranking.map((entry, i) => {
        const teamColor = entry.team === 'red' ? 'border-red-500 bg-red-500/10' : entry.team === 'blue' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-500 bg-slate-500/10';
        const textColor = entry.team === 'red' ? 'text-red-400' : entry.team === 'blue' ? 'text-blue-400' : 'text-slate-400';
        const isFirst = i === 0;

        return (
          <div
            key={entry.playerId}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 animate-pop-in ${teamColor} ${
              isFirst ? 'scale-110 shadow-lg' : ''
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className={`text-3xl font-black ${isFirst ? 'text-yellow-400' : 'text-slate-500'}`}>
              {entry.rank}
            </span>
            <div className="flex-1">
              <p className={`font-bold text-lg ${textColor}`}>{entry.nickname}</p>
              <p className={`text-xs uppercase ${textColor} opacity-60`}>{entry.team || 'no team'}</p>
            </div>
            {isFirst && <span className="text-3xl">&#127942;</span>}
          </div>
        );
      })}
    </div>
  );
}
