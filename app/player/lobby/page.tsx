'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { BZ, shade } from '@/lib/tokens';
import { Team } from '@/lib/types';
import { Check } from '@/components/Icons';

export default function PlayerLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hostLeft, setHostLeft] = useState(false);
  const nickname = typeof window !== 'undefined' ? sessionStorage.getItem('nickname') || '' : '';

  useEffect(() => {
    const socket = getSocket();
    const nick = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');
    if (nick && savedCode) socket.emit('rejoin-room', { code: savedCode, nickname: nick });

    socket.on('room-joined', ({ roomState }: { roomState: { teams: Team[]; players: { nickname: string; teamId: string | null }[] } }) => {
      setTeams(roomState.teams);
      const me = roomState.players.find(p => p.nickname === nick);
      if (me?.teamId) setSelected(me.teamId);
    });
    socket.on('teams-updated', ({ teams: t }: { teams: Team[] }) => setTeams(t));
    socket.on('round-started', () => router.push(`/player/game?code=${code}`));
    socket.on('host-left', () => setHostLeft(true));

    return () => { socket.off('room-joined'); socket.off('teams-updated'); socket.off('round-started'); socket.off('host-left'); };
  }, [code, router]);

  const handleSelect = (teamId: string) => {
    setSelected(teamId);
    getSocket().emit('pick-team', { teamId });
  };

  if (hostLeft) {
    return (
      <div style={{ width: '100%', minHeight: '100dvh', background: BZ.bg, color: BZ.text, fontFamily: BZ.sans, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: BZ.teams.red.base }}>방장이 나갔습니다</div>
        <button onClick={() => router.push('/')} style={{
          padding: '14px 28px', borderRadius: BZ.r.md, background: BZ.surface, border: `1px solid ${BZ.line}`,
          color: BZ.text, fontFamily: BZ.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>홈으로 돌아가기</button>
      </div>
    );
  }

  const cols = teams.length <= 2 ? 1 : 2;

  return (
    <div style={{
      width: '100%', minHeight: '100dvh', background: BZ.bg, color: BZ.text,
      fontFamily: BZ.sans, display: 'flex', flexDirection: 'column',
      padding: '54px 20px 32px', boxSizing: 'border-box',
    }}>
      {/* Top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: BZ.mono, fontSize: 10, letterSpacing: 2, color: BZ.textDim }}>ROOM</div>
          <div style={{ fontFamily: BZ.mono, fontSize: 20, fontWeight: 700, letterSpacing: 3 }}>{code}</div>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 9999, background: BZ.surface,
          border: `1px solid ${BZ.line}`, fontSize: 13, fontWeight: 600,
        }}>{nickname}</div>
      </div>

      {/* Prompt */}
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8 }}>팀을 골라주세요</div>
        <div style={{ color: BZ.textMuted, fontSize: 14, marginTop: 6 }}>선택 후 방장이 시작하길 기다려요</div>
      </div>

      {/* Team grid */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginTop: 32,
      }}>
        {teams.map(t => {
          const active = selected === t.id;
          return (
            <button key={t.id} onClick={() => handleSelect(t.id)} style={{
              position: 'relative', border: 'none', cursor: 'pointer', borderRadius: BZ.r.lg,
              background: `linear-gradient(160deg, ${t.color}, ${shade(t.color, -0.35)})`,
              color: '#fff', padding: teams.length <= 2 ? '28px 20px' : '20px 16px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              textAlign: 'left', minHeight: teams.length <= 2 ? 120 : 100,
              transform: active ? 'scale(1.02)' : 'scale(1)',
              boxShadow: active
                ? `0 0 0 3px ${BZ.bg}, 0 0 0 5px ${t.color}, 0 12px 30px -8px ${t.color}`
                : `0 8px 22px -10px ${t.color}80`,
              transition: 'transform 180ms cubic-bezier(.2,.8,.3,1.2), box-shadow 180ms',
              fontFamily: BZ.sans,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
                {active && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={14} color="#fff" />
                  </div>
                )}
              </div>
              <div style={{ fontSize: teams.length <= 2 ? 28 : 22, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1, textTransform: 'uppercase' }}>
                {t.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Status */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        {selected ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 18px', borderRadius: 9999,
            background: BZ.surface, border: `1px solid ${BZ.line}`,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: BZ.teams.green.base,
              boxShadow: `0 0 12px ${BZ.teams.green.base}`, animation: 'bzPulse 1.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>대기 중...</span>
            <span style={{ fontSize: 12, color: BZ.textDim, fontFamily: BZ.mono }}>방장이 시작하면 게임 시작</span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: BZ.textDim }}>팀을 선택하세요</div>
        )}
      </div>
    </div>
  );
}
