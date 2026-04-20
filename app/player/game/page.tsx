'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { BZ, shade } from '@/lib/tokens';
import { RankEntry, Team } from '@/lib/types';
import { Live } from '@/components/Icons';

function playBuzzSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 600; osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

export default function PlayerGamePage() {
  return <Suspense><PlayerGame /></Suspense>;
}

function PlayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [state, setState] = useState<'idle' | 'pressed' | 'waiting'>('idle');
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myTeam, setMyTeam] = useState<{ name: string; color: string } | null>(null);
  const [hostLeft, setHostLeft] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');
    if (nickname && savedCode) socket.emit('rejoin-room', { code: savedCode, nickname });

    socket.on('room-joined', ({ roomState }: { roomState: { teams: Team[]; players: { nickname: string; teamId: string | null }[]; round: { active: boolean; ranking: RankEntry[] } } }) => {
      const me = roomState.players.find(p => p.nickname === nickname);
      if (me?.teamId) {
        const team = roomState.teams.find(t => t.id === me.teamId);
        if (team) setMyTeam({ name: team.name, color: team.color });
      }
      if (roomState.round.active) {
        const myEntry = roomState.round.ranking.find(r => r.nickname === nickname);
        if (myEntry) { setState('pressed'); setMyRank(myEntry.rank); }
        else setState('idle');
      } else {
        setState('waiting');
      }
    });
    socket.on('buzz-result', ({ ranking }: { ranking: RankEntry[] }) => {
      const nickname = sessionStorage.getItem('nickname');
      const myEntry = ranking.find(r => r.nickname === nickname);
      if (myEntry) { setMyRank(myEntry.rank); setState('pressed'); playBuzzSound(); }
    });
    socket.on('round-reset', () => { setState('waiting'); setMyRank(null); });
    socket.on('round-started', () => { setState('idle'); setMyRank(null); });
    socket.on('host-left', () => setHostLeft(true));

    return () => { socket.off('room-joined'); socket.off('buzz-result'); socket.off('round-reset'); socket.off('round-started'); socket.off('host-left'); };
  }, []);

  const handleBuzz = useCallback(() => {
    if (state !== 'idle') return;
    setState('pressed');
    getSocket().emit('buzz');
  }, [state]);

  if (hostLeft) {
    return (
      <div style={{ width: '100%', height: '100dvh', background: BZ.bg, color: BZ.text, fontFamily: BZ.sans, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: BZ.teams.red.base }}>방장이 나갔습니다</div>
        <button onClick={() => router.push('/')} style={{
          padding: '14px 28px', borderRadius: BZ.r.md, background: BZ.surface, border: `1px solid ${BZ.line}`,
          color: BZ.text, fontFamily: BZ.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>홈으로</button>
      </div>
    );
  }

  const color = myTeam?.color || '#FFA502';
  const pressed = state === 'pressed';
  const waiting = state === 'waiting';
  const size = pressed ? 180 : 280;
  const tinge = pressed ? `radial-gradient(ellipse at 50% 60%, ${color}35, ${BZ.bg} 70%)` : BZ.bg;

  return (
    <div style={{
      width: '100%', height: '100dvh', position: 'relative',
      background: tinge, transition: 'background 500ms ease',
      fontFamily: BZ.sans, color: BZ.text, overflow: 'hidden',
    }}
    onTouchStart={e => { if (state === 'idle') { e.preventDefault(); handleBuzz(); } }}
    >
      {/* Top status */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '54px 24px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 9999, background: BZ.surface, border: `1px solid ${BZ.line}`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{myTeam?.name || 'TEAM'}</span>
        </div>
        {!waiting && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 9999,
            background: 'rgba(255,71,87,0.12)', border: `1px solid ${BZ.teams.red.base}55`,
            fontFamily: BZ.mono, fontSize: 11, letterSpacing: 2, color: BZ.teams.red.base, fontWeight: 700,
          }}>
            <Live size={6} /> LIVE
          </div>
        )}
      </div>

      {/* Buzzer */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 28,
      }}>
        <button
          onClick={state === 'idle' ? handleBuzz : undefined}
          disabled={waiting}
          style={{
            width: size, height: size, borderRadius: '50%', border: 'none', padding: 0,
            cursor: waiting ? 'not-allowed' : 'pointer', position: 'relative', overflow: 'hidden',
            background: waiting
              ? 'linear-gradient(160deg, #2a2a2e, #141416)'
              : `radial-gradient(circle at 35% 30%, ${shade(color, 0.3)}, ${color} 55%, ${shade(color, -0.4)})`,
            boxShadow: waiting
              ? 'inset 0 2px 8px rgba(0,0,0,0.5)'
              : pressed
                ? `0 0 60px ${color}55, inset 0 -8px 24px rgba(0,0,0,0.3), inset 0 8px 24px rgba(255,255,255,0.2)`
                : `0 20px 60px ${color}66, 0 0 80px ${color}33, inset 0 -10px 30px rgba(0,0,0,0.3), inset 0 12px 30px rgba(255,255,255,0.25)`,
            transition: 'width 400ms cubic-bezier(.3,1.4,.5,1), height 400ms cubic-bezier(.3,1.4,.5,1), background 300ms',
            animation: !pressed && !waiting ? 'bzBreath 2.2s ease-in-out infinite' : undefined,
            // @ts-expect-error css custom property
            '--c': color,
          }}
        >
          {!waiting && (
            <div style={{
              position: 'absolute', top: '6%', left: '15%', right: '15%', height: '28%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)',
              borderRadius: '50%', pointerEvents: 'none',
            }} />
          )}
          <div style={{
            position: 'relative', zIndex: 1, fontFamily: BZ.sans, fontWeight: 800,
            color: waiting ? BZ.textDim : '#fff',
            fontSize: pressed ? 92 : 46, letterSpacing: pressed ? -4 : -1,
            textShadow: waiting ? 'none' : '0 2px 10px rgba(0,0,0,0.3)',
            transition: 'font-size 300ms ease',
          }}>
            {pressed ? myRank : (waiting ? '...' : 'BUZZ!')}
          </div>
        </button>

        {/* Status text */}
        <div style={{ textAlign: 'center', minHeight: 48, padding: '0 24px' }}>
          {state === 'idle' && (
            <div style={{ fontSize: 15, color: BZ.textMuted, fontFamily: BZ.mono, letterSpacing: 2 }}>TAP TO BUZZ</div>
          )}
          {state === 'pressed' && (
            <>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, color }}>{myRank}등!</div>
              <div style={{ fontSize: 13, color: BZ.textDim, fontFamily: BZ.mono, marginTop: 4 }}>결과 화면을 확인하세요</div>
            </>
          )}
          {state === 'waiting' && (
            <>
              <div style={{ fontSize: 18, fontWeight: 600, color: BZ.textMuted }}>다음 라운드를 기다리는 중...</div>
              <div style={{ fontSize: 12, color: BZ.textDim, fontFamily: BZ.mono, marginTop: 6, letterSpacing: 1.5 }}>STANDBY</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
