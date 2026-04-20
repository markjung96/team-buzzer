'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { BZ, shade } from '@/lib/tokens';
import { RankEntry, Team } from '@/lib/types';
import { Trophy, ArrowR, Live } from '@/components/Icons';

function playBuzzSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800; osc.type = 'square';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function HostGamePage() {
  return <Suspense><HostGame /></Suspense>;
}

function HostGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [flash, setFlash] = useState(false);
  const [winnerColor, setWinnerColor] = useState('');

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');
    if (nickname && savedCode) socket.emit('rejoin-room', { code: savedCode, nickname });

    socket.on('room-joined', ({ roomState }: { roomState: { teams: Team[]; round: { ranking: RankEntry[] } } }) => {
      setTeams(roomState.teams);
      setRanking(roomState.round.ranking);
    });
    socket.on('buzz-result', ({ ranking: r }: { ranking: RankEntry[] }) => {
      setRanking(r);
      playBuzzSound();
      if (r.length === 1 && r[0].teamColor) {
        setWinnerColor(r[0].teamColor);
        setFlash(true);
        setTimeout(() => setFlash(false), 900);
      }
    });
    socket.on('round-reset', () => setRanking([]));
    socket.on('round-started', () => setRanking([]));

    return () => { socket.off('room-joined'); socket.off('buzz-result'); socket.off('round-reset'); socket.off('round-started'); };
  }, []);

  const handleNext = () => {
    const socket = getSocket();
    socket.emit('reset-round');
    setTimeout(() => socket.emit('start-round'), 500);
  };

  return (
    <div style={{
      width: '100%', minHeight: '100dvh', background: BZ.bg, color: BZ.text,
      fontFamily: BZ.sans, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {flash && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `radial-gradient(ellipse at center, ${winnerColor}55 0%, ${winnerColor}00 60%)`,
          pointerEvents: 'none', zIndex: 10, animation: 'bzFlash 900ms ease-out forwards',
        }} />
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 24px', borderBottom: `1px solid ${BZ.line}`, flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>BUZZER</div>
          <div style={{ width: 1, height: 20, background: BZ.line }} />
          <div style={{ fontFamily: BZ.mono, color: BZ.textMuted, fontSize: 13 }}>
            ROOM <span style={{ color: BZ.text, marginLeft: 6, letterSpacing: 3 }}>{code}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 9999,
            background: 'rgba(255,71,87,0.12)', border: `1px solid ${BZ.teams.red.base}55`,
            fontFamily: BZ.mono, fontSize: 11, letterSpacing: 2, color: BZ.teams.red.base, fontWeight: 700,
          }}>
            <Live size={6} /> LIVE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: BZ.mono, fontSize: 12, color: BZ.textDim }}>
            {teams.map(t => (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />{t.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, padding: '40px 32px 120px', overflow: 'hidden' }}>
        {ranking.length === 0 ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{
                  width: 10, height: 80, borderRadius: 6,
                  background: `linear-gradient(180deg, ${BZ.teams.red.base}, ${BZ.teams.red.deep})`,
                  transformOrigin: 'center', animation: `bzBar 1.1s ease-in-out ${i * 0.12}s infinite`,
                }} />
              ))}
            </div>
            <div style={{
              fontSize: 52, fontWeight: 800, letterSpacing: -2, textAlign: 'center',
              background: `linear-gradient(180deg, #fff 40%, ${BZ.textMuted})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'bzPulse 2s ease-in-out infinite',
            }}>버저를 기다리는 중...</div>
            <div style={{ fontFamily: BZ.mono, fontSize: 14, color: BZ.textDim, letterSpacing: 2 }}>PRESS YOUR BUZZER</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 28, height: '100%', flexDirection: ranking.length > 1 ? 'row' : 'column' }}>
            {/* 1st place hero */}
            <div style={{
              flex: ranking.length > 1 ? '1.5' : '1', position: 'relative', borderRadius: 28, overflow: 'hidden',
              background: `linear-gradient(145deg, ${ranking[0].teamColor || '#333'}, ${shade(ranking[0].teamColor || '#333', -0.55)})`,
              padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              animation: 'bzPop 500ms cubic-bezier(.2,.9,.3,1.3) both',
              boxShadow: `0 30px 80px -20px ${ranking[0].teamColor || '#333'}`,
              minHeight: 300,
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 16px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                  background: 'rgba(0,0,0,0.3)', borderRadius: 9999,
                  fontFamily: BZ.mono, fontSize: 12, letterSpacing: 2, fontWeight: 700,
                }}>
                  <Trophy size={14} color="#fff" /> 1ST
                </div>
              </div>
              <div style={{ position: 'relative', marginTop: 'auto' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>
                  TEAM {ranking[0].teamName}
                </div>
                <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 0.9, letterSpacing: -4, color: '#fff', wordBreak: 'break-word' }}>
                  {ranking[0].nickname}
                </div>
              </div>
            </div>

            {/* Rest */}
            {ranking.length > 1 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
                {ranking.slice(1).map((e, i) => {
                  const scale = 1 - Math.min(i, 4) * 0.06;
                  return (
                    <div key={e.playerId} style={{
                      display: 'flex', alignItems: 'center', gap: 20,
                      padding: `${22 * scale}px 24px`, borderRadius: 18, background: BZ.surface,
                      border: `1px solid ${BZ.line}`, position: 'relative', overflow: 'hidden',
                      animation: `bzPop 450ms cubic-bezier(.2,.9,.3,1.3) ${0.15 + i * 0.08}s both`,
                    }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: e.teamColor || '#333' }} />
                      <div style={{ fontFamily: BZ.mono, fontSize: 38 * scale, fontWeight: 800, color: BZ.textFaint, width: 70, textAlign: 'center' }}>
                        {String(e.rank).padStart(2, '0')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 26 * scale, fontWeight: 700, letterSpacing: -0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nickname}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.teamColor || '#333' }} />
                          <span style={{ fontSize: 12, color: BZ.textMuted, fontFamily: BZ.mono, letterSpacing: 1 }}>{(e.teamName || '').toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        padding: '20px 24px 28px', display: 'flex', gap: 14, justifyContent: 'flex-end',
        background: `linear-gradient(180deg, transparent, ${BZ.bg} 60%)`, zIndex: 2,
      }}>
        <button onClick={() => { getSocket().emit('reset-round'); router.push(`/host/lobby?code=${code}`); }} style={{
          padding: '14px 22px', borderRadius: 12, background: 'transparent',
          border: `1px solid ${BZ.lineStrong}`, color: BZ.text,
          fontFamily: BZ.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>로비로</button>
        <button onClick={handleNext} style={{
          padding: '14px 24px', borderRadius: 12, border: 'none',
          background: `linear-gradient(135deg, ${BZ.teams.green.glow}, ${BZ.teams.green.base})`,
          color: '#062B14', fontFamily: BZ.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: `0 10px 24px -10px ${BZ.teams.green.base}`,
        }}>다음 라운드 <ArrowR size={16} /></button>
      </div>
    </div>
  );
}
