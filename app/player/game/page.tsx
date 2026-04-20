'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { BZ, shade } from '@/lib/tokens';
import { RankEntry, Team } from '@/lib/types';
import { Live } from '@/components/Icons';

// Singleton AudioContext — avoid creation delay on each buzz
let audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playBuzzSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 600; osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

function vibrate() {
  try { navigator.vibrate?.(30); } catch {}
}

function useElapsedTimer() {
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const runningRef = useRef(false);

  const formatElapsed = (ms: number) => {
    const totalMs = Math.floor(ms);
    const s = Math.floor(totalMs / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const centis = Math.floor((totalMs % 1000) / 10);
    return m > 0
      ? `${m}:${String(sec).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
      : `${sec}.${String(centis).padStart(2, '0')}`;
  };

  const tick = useCallback(() => {
    if (!runningRef.current) return;
    if (elRef.current) {
      elRef.current.textContent = formatElapsed(performance.now() - startRef.current);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    startRef.current = performance.now();
    runningRef.current = true;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    if (elRef.current) elRef.current.textContent = '0.00';
  }, [stop]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { elRef, start, stop, reset };
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
  const [myReactionMs, setMyReactionMs] = useState<number | null>(null);
  const [myTeam, setMyTeam] = useState<{ name: string; color: string } | null>(null);
  const [hostLeft, setHostLeft] = useState(false);
  const roundStartTime = useRef<number>(0);
  const timer = useElapsedTimer();

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');
    if (nickname && savedCode) socket.emit('rejoin-room', { code: savedCode, nickname });

    const handleRoomJoined = ({ roomState }: { roomState: { teams: Team[]; players: { nickname: string; teamId: string | null }[]; round: { active: boolean; ranking: RankEntry[] } } }) => {
      const me = roomState.players.find(p => p.nickname === nickname);
      if (me?.teamId) {
        const team = roomState.teams.find(t => t.id === me.teamId);
        if (team) setMyTeam({ name: team.name, color: team.color });
      }
      if (roomState.round.active) {
        const myEntry = roomState.round.ranking.find(r => r.nickname === nickname);
        if (myEntry) {
          setState('pressed');
          setMyRank(myEntry.rank);
          setMyReactionMs(myEntry.reactionMs);
        } else {
          roundStartTime.current = performance.now();
          setState('idle');
          timer.start();
        }
      } else {
        setState('waiting');
      }
    };
    const handleBuzzResult = ({ ranking }: { ranking: RankEntry[] }) => {
      const nick = sessionStorage.getItem('nickname');
      const myEntry = ranking.find(r => r.nickname === nick);
      if (myEntry) {
        setMyRank(myEntry.rank);
        setMyReactionMs(myEntry.reactionMs);
        if (myEntry.teamName && myEntry.teamColor) {
          setMyTeam({ name: myEntry.teamName, color: myEntry.teamColor });
        }
        setState('pressed');
        playBuzzSound();
      }
    };
    const handleRoundReset = () => { setState('waiting'); setMyRank(null); setMyReactionMs(null); timer.reset(); };
    const handleRoundStarted = () => {
      roundStartTime.current = performance.now();
      setState('idle');
      setMyRank(null);
      setMyReactionMs(null);
      timer.start();
    };
    const handleHostLeft = () => setHostLeft(true);

    socket.on('room-joined', handleRoomJoined);
    socket.on('buzz-result', handleBuzzResult);
    socket.on('round-reset', handleRoundReset);
    socket.on('round-started', handleRoundStarted);
    socket.on('host-left', handleHostLeft);

    return () => { socket.off('room-joined', handleRoomJoined); socket.off('buzz-result', handleBuzzResult); socket.off('round-reset', handleRoundReset); socket.off('round-started', handleRoundStarted); socket.off('host-left', handleHostLeft); };
  }, []);

  const handleBuzz = useCallback(() => {
    if (state !== 'idle') return;
    const reactionMs = roundStartTime.current > 0
      ? performance.now() - roundStartTime.current
      : null;
    setState('pressed');
    vibrate();
    timer.stop();
    getSocket().emit('buzz', { reactionMs });
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

  // Format reaction time for display
  const reactionDisplay = myReactionMs != null
    ? myReactionMs < 1000
      ? `${Math.round(myReactionMs)}ms`
      : `${(myReactionMs / 1000).toFixed(2)}s`
    : null;

  return (
    <div style={{
      width: '100%', height: '100dvh', position: 'relative',
      background: tinge, transition: 'background 200ms ease',
      fontFamily: BZ.sans, color: BZ.text, overflow: 'hidden',
      touchAction: 'manipulation',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}
    onTouchStart={e => { if (state === 'idle') { e.preventDefault(); handleBuzz(); } }}
    >
      {/* Top status */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '54px 24px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { getSocket().emit('leave-room'); sessionStorage.clear(); router.push('/'); }} style={{
            width: 32, height: 32, borderRadius: 9999, border: `1px solid ${BZ.line}`,
            background: BZ.surface, color: BZ.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, padding: 0,
          }}>←</button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 9999, background: BZ.surface, border: `1px solid ${BZ.line}`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{myTeam?.name || 'TEAM'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!waiting && (
            <div ref={timer.elRef} style={{
              fontFamily: BZ.mono, fontSize: 14, fontWeight: 700,
              color: pressed ? BZ.textDim : BZ.text,
              fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'right',
            }}>0.00</div>
          )}
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
            transition: 'width 120ms ease-out, height 120ms ease-out, background 150ms',
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
            transition: 'font-size 120ms ease-out',
          }}>
            {pressed ? (myRank ?? '✓') : (waiting ? '...' : 'BUZZ!')}
          </div>
        </button>

        {/* Status text */}
        <div style={{ textAlign: 'center', minHeight: 48, padding: '0 24px' }}>
          {state === 'idle' && (
            <div style={{ fontSize: 15, color: BZ.textMuted, fontFamily: BZ.mono, letterSpacing: 2 }}>TAP TO BUZZ</div>
          )}
          {state === 'pressed' && (
            <>
              {myRank != null && (
                <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, color }}>{myRank}등!</div>
              )}
              {reactionDisplay && (
                <div style={{
                  fontSize: 28, fontWeight: 700, fontFamily: BZ.mono,
                  color: myReactionMs != null && myReactionMs < 300 ? BZ.teams.green.base
                    : myReactionMs != null && myReactionMs < 700 ? BZ.teams.yellow.base
                    : color,
                  marginTop: 4, letterSpacing: -0.5,
                }}>
                  {reactionDisplay}
                </div>
              )}
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
