'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Team } from '@/lib/types';
import TeamPicker from '@/components/TeamPicker';

export default function PlayerLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
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
      if (me?.team) setSelectedTeam(me.team);
    });

    socket.on('round-started', () => {
      router.push(`/player/game?code=${code}`);
    });

    socket.on('host-left', () => {
      setHostLeft(true);
    });

    return () => {
      socket.off('room-joined');
      socket.off('round-started');
      socket.off('host-left');
    };
  }, [code, router]);

  const handlePickTeam = (team: Team) => {
    setSelectedTeam(team);
    const socket = getSocket();
    socket.emit('pick-team', { team });
  };

  if (hostLeft) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-2xl font-bold text-red-400">방장이 나갔습니다</p>
        <button
          onClick={() => router.push('/')}
          className="py-3 px-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
        >
          홈으로 돌아가기
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <p className="text-slate-400 text-sm">방 코드</p>
        <h1 className="text-4xl font-black tracking-[0.3em] text-white">{code}</h1>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-center text-slate-400 mb-4">팀을 선택하세요</p>
        <TeamPicker selectedTeam={selectedTeam} onPick={handlePickTeam} />
      </div>

      {selectedTeam && (
        <div className="text-center animate-pop-in">
          <div className="text-slate-400 text-lg">대기 중...</div>
          <div className="text-slate-500 text-sm mt-1">방장이 라운드를 시작하면 게임이 시작됩니다</div>
        </div>
      )}
    </main>
  );
}
