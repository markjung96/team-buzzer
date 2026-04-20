'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'home' | 'join'>('home');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    setLoading(true);
    setError('');
    const socket = getSocket();
    socket.emit('create-room', { nickname: nickname.trim() });
    socket.once('room-created', ({ code }: { code: string }) => {
      sessionStorage.setItem('nickname', nickname.trim());
      sessionStorage.setItem('roomCode', code);
      sessionStorage.setItem('isHost', 'true');
      router.push(`/host/lobby?code=${code}`);
    });
    socket.once('error', ({ message }: { message: string }) => {
      setError(message);
      setLoading(false);
    });
  };

  const handleJoin = () => {
    if (!nickname.trim() || code.length !== 4) return;
    setLoading(true);
    setError('');
    const socket = getSocket();
    socket.emit('join-room', { code, nickname: nickname.trim() });
    socket.once('room-joined', () => {
      sessionStorage.setItem('nickname', nickname.trim());
      sessionStorage.setItem('roomCode', code);
      sessionStorage.setItem('isHost', 'false');
      router.push(`/player/lobby?code=${code}`);
    });
    socket.once('error', ({ message }: { message: string }) => {
      setError(message);
      setLoading(false);
    });
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 gap-10 bg-game min-h-dvh">
      {/* Logo area */}
      <div className="text-center animate-slide-up">
        <div className="text-7xl mb-4">&#128276;</div>
        <h1 className="text-5xl font-black tracking-tight neon-text">BUZZER</h1>
        <p className="text-white/40 text-base mt-2">먼저 누른 팀이 이긴다</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <input
          type="text"
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={10}
          className="game-input"
        />

        {mode === 'home' ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreate}
              disabled={!nickname.trim() || loading}
              className="btn-primary w-full"
            >
              {loading ? '생성 중...' : '방 만들기'}
            </button>
            <button
              onClick={() => setMode('join')}
              className="btn-secondary w-full"
            >
              참여하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="game-input text-3xl tracking-[0.6em] font-black"
            />
            <button
              onClick={handleJoin}
              disabled={!nickname.trim() || code.length !== 4 || loading}
              className="btn-green w-full"
            >
              {loading ? '참여 중...' : '입장하기'}
            </button>
            <button
              onClick={() => { setMode('home'); setCode(''); setError(''); }}
              className="text-white/30 hover:text-white/60 transition-colors text-sm py-2"
            >
              &#8592; 뒤로가기
            </button>
          </div>
        )}

        {error && (
          <div className="glass rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
