'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { BZ, TEAM_PRESETS } from '@/lib/tokens';
import { Player, Team } from '@/lib/types';
import { Plus, Pencil, X, Check, Play, Live } from '@/components/Icons';

export default function HostLobbyPage() {
  return <Suspense><HostLobby /></Suspense>;
}

function HostLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColorKey, setNewColorKey] = useState('cyan');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColorKey, setEditColorKey] = useState('');

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem('nickname');
    const savedCode = sessionStorage.getItem('roomCode');
    if (nickname && savedCode) socket.emit('rejoin-room', { code: savedCode, nickname });

    socket.on('room-created', ({ roomState }: { roomState: { players: Player[]; teams: Team[] } }) => {
      setPlayers(roomState.players);
      setTeams(roomState.teams);
    });
    socket.on('room-joined', ({ roomState }: { roomState: { players: Player[]; teams: Team[] } }) => {
      setPlayers(roomState.players);
      setTeams(roomState.teams);
    });
    socket.on('player-joined', ({ player }: { player: Player }) => setPlayers(p => [...p, player]));
    socket.on('player-left', ({ playerId }: { playerId: string }) => setPlayers(p => p.filter(x => x.id !== playerId)));
    socket.on('player-team-changed', ({ playerId, teamId }: { playerId: string; teamId: string }) => {
      setPlayers(p => p.map(x => x.id === playerId ? { ...x, teamId } : x));
    });
    socket.on('teams-updated', ({ teams: t }: { teams: Team[] }) => setTeams(t));
    socket.on('players-updated', ({ players: p }: { players: Player[] }) => setPlayers(p));
    socket.on('round-started', () => router.push(`/host/game?code=${code}`));

    return () => {
      socket.off('room-created'); socket.off('room-joined'); socket.off('player-joined');
      socket.off('player-left'); socket.off('player-team-changed'); socket.off('teams-updated');
      socket.off('players-updated'); socket.off('round-started');
    };
  }, [code, router]);

  const handleStart = () => getSocket().emit('start-round');
  const handleCreateTeam = () => {
    if (!newName.trim()) return;
    const t = BZ.teams[newColorKey];
    getSocket().emit('create-team', { name: newName.trim().toUpperCase(), color: t.base });
    setNewName(''); setAdding(false);
  };
  const handleEditTeam = () => {
    if (!editingId || !editName.trim()) return;
    const t = BZ.teams[editColorKey];
    getSocket().emit('edit-team', { teamId: editingId, name: editName.trim().toUpperCase(), color: t?.base });
    setEditingId(null);
  };
  const handleDeleteTeam = (id: string) => getSocket().emit('delete-team', { teamId: id });

  const canStart = players.some(p => p.teamId !== null);

  return (
    <div style={{
      width: '100%', minHeight: '100dvh', background: BZ.bg, color: BZ.text,
      fontFamily: BZ.sans, display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: BZ.mono, fontSize: 10, letterSpacing: 2, color: BZ.textDim, textTransform: 'uppercase' }}>방 코드</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: BZ.mono, fontSize: 10, letterSpacing: 1.5, color: BZ.teams.red.base }}>
            <Live size={8} /> LIVE
          </div>
        </div>
        <div style={{
          fontSize: 84, fontWeight: 800, letterSpacing: 6, lineHeight: 1,
          fontFamily: BZ.mono, textAlign: 'center',
          background: `linear-gradient(180deg, #fff 50%, ${BZ.textMuted})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>{code}</div>
        <div style={{ fontFamily: BZ.mono, fontSize: 12, color: BZ.textDim, textAlign: 'center', marginTop: 8 }}>
          {typeof window !== 'undefined' ? `${window.location.hostname}:${window.location.port || '3000'}` : ''}
        </div>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 140px' }}>
        {/* Teams */}
        <SectionHeader count={teams.length}>팀</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {teams.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: BZ.surface,
              border: `1px solid ${BZ.line}`, borderRadius: BZ.r.md,
            }}>
              {editingId === t.id ? (
                <>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: BZ.teams[editColorKey]?.base || t.color, flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => {
                      const idx = TEAM_PRESETS.indexOf(editColorKey as typeof TEAM_PRESETS[number]);
                      setEditColorKey(TEAM_PRESETS[(idx + 1) % TEAM_PRESETS.length]);
                    }} />
                  <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={8} autoFocus
                    style={{ flex: 1, background: BZ.bg, border: `1px solid ${BZ.line}`, color: BZ.text, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: BZ.sans, outline: 'none' }}
                    onKeyDown={e => e.key === 'Enter' && handleEditTeam()} />
                  <IconBtn onClick={handleEditTeam}><Check size={14} color={BZ.teams.green.base} /></IconBtn>
                  <IconBtn onClick={() => setEditingId(null)}><X size={14} /></IconBtn>
                </>
              ) : (
                <>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontFamily: BZ.mono, fontSize: 12, color: BZ.textDim, marginRight: 4 }}>
                    {players.filter(m => m.teamId === t.id).length}명
                  </div>
                  <IconBtn onClick={() => { setEditingId(t.id); setEditName(t.name); setEditColorKey(TEAM_PRESETS.find(k => BZ.teams[k].base === t.color) || 'red'); }}>
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn onClick={() => handleDeleteTeam(t.id)}>
                    <X size={14} color={BZ.teams.red.base} />
                  </IconBtn>
                </>
              )}
            </div>
          ))}

          {/* Add team */}
          {!adding ? (
            <button onClick={() => { setAdding(true); setNewColorKey(TEAM_PRESETS[teams.length % TEAM_PRESETS.length]); }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 14, borderRadius: BZ.r.md,
              background: 'transparent', border: `1.5px dashed ${BZ.lineStrong}`,
              color: BZ.textMuted, fontFamily: BZ.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={16} /> 팀 추가
            </button>
          ) : (
            <div style={{ padding: 14, borderRadius: BZ.r.md, background: BZ.surface, border: `1px solid ${BZ.lineStrong}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: BZ.teams[newColorKey].base, flexShrink: 0 }} />
                <input placeholder="팀 이름" value={newName} onChange={e => setNewName(e.target.value)} maxLength={8} autoFocus
                  style={{ flex: 1, background: BZ.bg, border: `1px solid ${BZ.line}`, color: BZ.text, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: BZ.sans, outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {TEAM_PRESETS.map(k => (
                  <button key={k} onClick={() => setNewColorKey(k)} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: BZ.teams[k].base,
                    boxShadow: newColorKey === k ? `0 0 0 2px ${BZ.bg}, 0 0 0 4px ${BZ.teams[k].base}` : 'none',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAdding(false)} style={{
                  flex: 1, padding: 10, borderRadius: 8, background: 'transparent',
                  border: `1px solid ${BZ.line}`, color: BZ.textMuted, cursor: 'pointer',
                  fontFamily: BZ.sans, fontWeight: 600, fontSize: 13,
                }}>취소</button>
                <button onClick={handleCreateTeam} style={{
                  flex: 1, padding: 10, borderRadius: 8, background: BZ.text, color: BZ.bg,
                  border: 'none', cursor: 'pointer', fontFamily: BZ.sans, fontWeight: 700, fontSize: 13,
                }}>추가</button>
              </div>
            </div>
          )}
        </div>

        {/* Members */}
        <div style={{ height: 28 }} />
        <SectionHeader count={players.length}>참여자</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          {teams.map(t => {
            const ms = players.filter(m => m.teamId === t.id);
            if (!ms.length) return null;
            return (
              <div key={t.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 2 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: t.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: BZ.textMuted, letterSpacing: 0.3 }}>{t.name}</span>
                  <div style={{ flex: 1, height: 1, background: BZ.line, marginLeft: 6 }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ms.map(m => (
                    <div key={m.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px 6px 8px', borderRadius: 9999,
                      background: BZ.surface, border: `1px solid ${BZ.line}`,
                      fontSize: 13, fontWeight: 500,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                      {m.nickname}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {players.filter(p => !p.teamId).length > 0 && (
            <div style={{ fontSize: 12, color: BZ.textDim }}>
              팀 미선택: {players.filter(p => !p.teamId).map(p => p.nickname).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Fixed CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '16px 20px 32px',
        background: `linear-gradient(180deg, transparent, ${BZ.bg} 40%)`,
      }}>
        <button onClick={handleStart} disabled={!canStart} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '18px 20px', borderRadius: BZ.r.md, border: 'none',
          background: canStart ? `linear-gradient(135deg, ${BZ.teams.green.glow}, ${BZ.teams.green.base} 60%, ${BZ.teams.green.deep})` : BZ.surface,
          color: canStart ? '#062B14' : BZ.textDim,
          boxShadow: canStart ? `0 10px 30px -10px ${BZ.teams.green.base}` : 'none',
          fontFamily: BZ.sans, fontSize: 17, fontWeight: 700, cursor: canStart ? 'pointer' : 'not-allowed',
          opacity: canStart ? 1 : 0.4,
        }}>
          <Play size={16} /> 라운드 시작
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <div style={{ fontSize: 12, fontFamily: BZ.mono, letterSpacing: 2, color: BZ.textDim, textTransform: 'uppercase' }}>{children}</div>
      <div style={{ fontFamily: BZ.mono, fontSize: 11, color: BZ.textFaint }}>{String(count).padStart(2, '0')}</div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, border: `1px solid ${BZ.line}`,
      background: 'transparent', color: BZ.textMuted, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}
