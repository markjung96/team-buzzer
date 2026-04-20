'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { RankEntry } from '@/lib/types';
import BuzzRanking from '@/components/BuzzRanking';

function playBuzzSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function HostGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [roundActive, setRoundActive] = useState(true);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');

    if (nickname && savedCode) {
      socket.emit('rejoin-room', { code: savedCode, nickname });
    }

    socket.on('buzz-result', ({ ranking: newRanking }) => {
      setRanking(newRanking);
      playBuzzSound();

      // Flash winner's team color
      if (newRanking.length === 1) {
        const winnerTeam = newRanking[0].team;
        setFlashColor(winnerTeam === 'red' ? 'bg-red-500' : winnerTeam === 'blue' ? 'bg-blue-500' : 'bg-yellow-500');
        setTimeout(() => setFlashColor(null), 1000);
      }
    });

    socket.on('round-reset', () => {
      setRanking([]);
      setRoundActive(true);
    });

    socket.on('round-started', () => {
      setRanking([]);
      setRoundActive(true);
    });

    return () => {
      socket.off('buzz-result');
      socket.off('round-reset');
      socket.off('round-started');
    };
  }, []);

  const handleNextRound = () => {
    const socket = getSocket();
    socket.emit('reset-round');
    setRanking([]);
    setRoundActive(false);
    // Start new round immediately
    setTimeout(() => {
      socket.emit('start-round');
    }, 500);
  };

  const handleBackToLobby = () => {
    const socket = getSocket();
    socket.emit('reset-round');
    router.push(`/host/lobby?code=${code}`);
  };

  return (
    <main className="flex-1 flex flex-col items-center p-6 gap-4 relative">
      {/* Flash overlay */}
      {flashColor && (
        <div className={`fixed inset-0 ${flashColor} animate-flash-win z-50 pointer-events-none`} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-lg">
        <div className="text-slate-400 text-sm">방 {code}</div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${roundActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
          {roundActive ? 'LIVE' : '대기'}
        </div>
      </div>

      {/* Ranking */}
      <BuzzRanking ranking={ranking} />

      {/* Controls */}
      <div className="flex gap-3 w-full max-w-lg mt-auto">
        <button
          onClick={handleBackToLobby}
          className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
        >
          로비로
        </button>
        <button
          onClick={handleNextRound}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
        >
          다음 라운드
        </button>
      </div>
    </main>
  );
}
