'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Player } from '@/lib/types';
import PlayerList from '@/components/PlayerList';

export default function HostLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');

    // Rejoin if reconnecting
    if (nickname && savedCode) {
      socket.emit('rejoin-room', { code: savedCode, nickname });
    }

    socket.on('room-joined', ({ roomState }) => {
      setPlayers(roomState.players);
      setConnected(true);
    });

    socket.on('room-created', () => {
      setConnected(true);
    });

    socket.on('player-joined', ({ player }) => {
      setPlayers((prev) => [...prev, player]);
    });

    socket.on('player-left', ({ playerId }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    socket.on('team-updated', ({ playerId, team, nickname: nick }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId || p.nickname === nick ? { ...p, team } : p
        )
      );
    });

    socket.on('round-started', () => {
      router.push(`/host/game?code=${code}`);
    });

    // If we already have players from create-room flow
    if (players.length === 0 && nickname) {
      setPlayers([{ id: socket.id || '', nickname, team: null }]);
      setConnected(true);
    }

    return () => {
      socket.off('room-joined');
      socket.off('room-created');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('team-updated');
      socket.off('round-started');
    };
  }, [code, router]);

  const handleStart = () => {
    const socket = getSocket();
    socket.emit('start-round');
  };

  const hasTeamPlayers = players.some((p) => p.team !== null);

  return (
    <main className="flex-1 flex flex-col items-center p-6 gap-6">
      {/* Room Code */}
      <div className="text-center">
        <p className="text-slate-400 text-sm">방 코드</p>
        <h1 className="text-6xl font-black tracking-[0.3em] text-white">{code}</h1>
      </div>

      {/* Connection IP */}
      <div className="bg-slate-800/50 rounded-xl px-4 py-2 text-center">
        <p className="text-slate-400 text-xs">접속 주소</p>
        <p className="text-white font-mono text-sm">
          {typeof window !== 'undefined' ? `${window.location.hostname}:${window.location.port || '3000'}` : ''}
        </p>
      </div>

      {/* Player Count */}
      <div className="bg-slate-800 rounded-xl px-6 py-3">
        <span className="text-slate-400">참여자</span>
        <span className="text-white font-bold ml-2">{players.length}명</span>
      </div>

      {/* Player List */}
      <PlayerList players={players} />

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!hasTeamPlayers}
        className="w-full max-w-sm py-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors mt-auto"
      >
        라운드 시작
      </button>

      {!hasTeamPlayers && (
        <p className="text-slate-500 text-sm text-center">
          참여자가 팀을 선택하면 시작할 수 있습니다
        </p>
      )}
    </main>
  );
}
