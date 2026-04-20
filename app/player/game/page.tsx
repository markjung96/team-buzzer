'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Team, RankEntry } from '@/lib/types';
import BuzzerButton from '@/components/BuzzerButton';

function playBuzzSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

export default function PlayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [pressed, setPressed] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [roundActive, setRoundActive] = useState(true);
  const [hostLeft, setHostLeft] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');

    if (nickname && savedCode) {
      socket.emit('rejoin-room', { code: savedCode, nickname });
    }

    socket.on('room-joined', ({ roomState }) => {
      const me = roomState.players.find((p: { nickname: string }) => p.nickname === nickname);
      if (me?.team) setMyTeam(me.team);
      setRoundActive(roomState.round.active);
      // Check if already buzzed
      const myEntry = roomState.round.ranking.find((r: RankEntry) => r.nickname === nickname);
      if (myEntry) {
        setPressed(true);
        setMyRank(myEntry.rank);
      }
    });

    socket.on('buzz-result', ({ ranking }: { ranking: RankEntry[] }) => {
      const myEntry = ranking.find((r) => r.nickname === nickname);
      if (myEntry) {
        setMyRank(myEntry.rank);
        setPressed(true);
        playBuzzSound();
      }
    });

    socket.on('round-reset', () => {
      setPressed(false);
      setMyRank(null);
      setRoundActive(false);
    });

    socket.on('round-started', () => {
      setPressed(false);
      setMyRank(null);
      setRoundActive(true);
    });

    socket.on('host-left', () => {
      setHostLeft(true);
    });

    return () => {
      socket.off('room-joined');
      socket.off('buzz-result');
      socket.off('round-reset');
      socket.off('round-started');
      socket.off('host-left');
    };
  }, []);

  const handleBuzz = useCallback(() => {
    if (pressed || !roundActive) return;
    setPressed(true);
    const socket = getSocket();
    socket.emit('buzz');
  }, [pressed, roundActive]);

  if (hostLeft) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-2xl font-bold text-red-400">방장이 나갔습니다</p>
        <button
          onClick={() => router.push('/')}
          className="py-3 px-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
        >
          홈으로
        </button>
      </main>
    );
  }

  return (
    <main
      className="flex-1 flex flex-col items-center justify-center p-6 select-none"
      onTouchStart={(e) => {
        if (!pressed && roundActive) {
          e.preventDefault();
          handleBuzz();
        }
      }}
    >
      <div onClick={handleBuzz}>
        <BuzzerButton
          disabled={!roundActive || pressed}
          pressed={pressed}
          rank={myRank}
          team={myTeam}
        />
      </div>

      {!roundActive && !pressed && (
        <p className="text-slate-500 mt-8 text-lg">다음 라운드를 기다리는 중...</p>
      )}
    </main>
  );
}
