'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { BZ } from '@/lib/tokens';
import { Live } from '@/components/Icons';

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'main' | 'join'>('main');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // 참여하기 탭 전환 시 코드 input 포커스
  useEffect(() => {
    if (tab === 'join') {
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } else {
      setTimeout(() => nicknameRef.current?.focus(), 50);
    }
  }, [tab]);

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
    <div style={{
      width: '100%', minHeight: '100dvh', background: BZ.bg, color: BZ.text,
      fontFamily: BZ.sans, display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle gradient backdrop */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(55,66,250,0.18) 0%, transparent 45%), radial-gradient(ellipse at 50% 100%, rgba(255,71,87,0.10) 0%, transparent 45%)',
        pointerEvents: 'none',
      }} />

      {/* Top chip */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 68, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 9999,
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${BZ.line}`,
          fontSize: 11, fontFamily: BZ.mono, letterSpacing: 1.5, color: BZ.textMuted,
        }}>
          <Live size={10} color={BZ.teams.red.base} />
          TEAM BUZZER v1.0
        </div>
      </div>

      {/* Title */}
      <div style={{ position: 'relative', zIndex: 1, padding: '40px 28px 0', textAlign: 'center' }}>
        <div style={{
          fontSize: 82, fontWeight: 800, lineHeight: 0.92, letterSpacing: -4,
          background: `linear-gradient(180deg, #fff 40%, ${BZ.textMuted} 120%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          BUZZER
        </div>
        <div style={{ marginTop: 18, fontSize: 15, color: BZ.textMuted, letterSpacing: -0.2, fontWeight: 500 }}>
          먼저 누른 팀이 이긴다
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', padding: '28px 24px 40px' }}>
        {tab === 'main' && (
          <>
            <FieldLabel>닉네임</FieldLabel>
            <input
              ref={nicknameRef}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nickname.trim() && handleCreate()}
              placeholder="예: 준호"
              maxLength={10}
              autoFocus
              aria-label="닉네임 입력"
              autoComplete="off"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: BZ.surface, color: BZ.text,
                border: `1px solid ${BZ.line}`, borderRadius: BZ.r.md,
                padding: '16px 18px', fontSize: 16, fontFamily: BZ.sans, fontWeight: 500, outline: 'none',
              }}
            />
            <div style={{ height: 20 }} />
            <BzButton variant="primary" onClick={handleCreate} disabled={!nickname.trim() || loading}>
              {loading ? '생성 중...' : '방 만들기'}
            </BzButton>
            <div style={{ height: 10 }} />
            <BzButton variant="ghost" onClick={() => setTab('join')}>참여하기</BzButton>
          </>
        )}

        {tab === 'join' && (
          <>
            <FieldLabel>닉네임</FieldLabel>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="예: 준호"
              maxLength={10}
              aria-label="닉네임 입력"
              autoComplete="off"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: BZ.surface, color: BZ.text,
                border: `1px solid ${BZ.line}`, borderRadius: BZ.r.md,
                padding: '16px 18px', fontSize: 16, fontFamily: BZ.sans, fontWeight: 500, outline: 'none',
                marginBottom: 20,
              }}
            />
            <FieldLabel>방 코드</FieldLabel>
            <CodeInput ref={codeInputRef} value={code} onChange={setCode} onSubmit={handleJoin} />
            <div style={{ textAlign: 'center', fontSize: 12, color: BZ.textDim, marginTop: 10, fontFamily: BZ.mono }}>
              방장이 알려준 4자리 숫자를 입력하세요
            </div>
            <div style={{ height: 24 }} />
            <BzButton variant="success" onClick={handleJoin} disabled={!nickname.trim() || code.length < 4 || loading}>
              {loading ? '참여 중...' : '입장하기'}
            </BzButton>
            <div style={{ height: 14 }} />
            <button onClick={() => { setTab('main'); setCode(''); setError(''); }} style={{
              width: '100%', background: 'none', border: 'none', color: BZ.textMuted,
              fontFamily: BZ.sans, fontSize: 14, fontWeight: 500, padding: 12, cursor: 'pointer',
            }}>뒤로가기</button>
          </>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: BZ.r.md, background: 'rgba(255,71,87,0.12)', border: `1px solid rgba(255,71,87,0.3)`, textAlign: 'center' }}>
            <span style={{ color: BZ.teams.red.base, fontSize: 14 }}>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: BZ.mono, fontSize: 10, letterSpacing: 2, color: BZ.textDim,
      marginBottom: 8, textTransform: 'uppercase',
    }}>{children}</div>
  );
}

const CodeInput = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; onSubmit?: () => void }>(
  function CodeInput({ value, onChange, onSubmit }, ref) {
    const v = (value || '').padEnd(4, ' ');
    return (
      <>
        <input
          ref={ref}
          type="text" inputMode="numeric" value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && value.length === 4 && onSubmit?.()}
          maxLength={4}
          aria-label="4자리 방 코드 입력"
          autoComplete="off"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', cursor: 'text' }}
             role="group" aria-label="방 코드"
             onClick={() => {
               if (ref && 'current' in ref) ref.current?.focus();
             }}>
          {[0,1,2,3].map(i => {
            const ch = v[i];
            const filled = ch !== ' ';
            return (
              <div key={i} style={{
                width: 62, height: 78, borderRadius: 14,
                background: filled ? BZ.elevated : BZ.surface,
                border: `1.5px solid ${filled ? BZ.lineStrong : BZ.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: BZ.mono, fontSize: 36, fontWeight: 700, color: BZ.text,
                transition: 'border-color 150ms, background 150ms',
              }}>
                {filled ? ch : (
                  i === (value || '').length ? (
                    <div style={{ width: 2, height: 36, background: BZ.teams.green.base, animation: 'bzBlink 1s steps(2) infinite' }} />
                  ) : null
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  }
);

function BzButton({ children, onClick, variant = 'primary', disabled }: {
  children: React.ReactNode; onClick?: () => void; variant?: string; disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${BZ.teams.blue.glow}, ${BZ.teams.blue.base} 60%, ${BZ.teams.blue.deep})`,
      color: '#fff',
      boxShadow: `0 10px 30px -10px ${BZ.teams.blue.base}, inset 0 1px 0 rgba(255,255,255,0.25)`,
    },
    success: {
      background: `linear-gradient(135deg, ${BZ.teams.green.glow}, ${BZ.teams.green.base} 60%, ${BZ.teams.green.deep})`,
      color: '#062B14',
      boxShadow: `0 10px 30px -10px ${BZ.teams.green.base}, inset 0 1px 0 rgba(255,255,255,0.3)`,
    },
    ghost: {
      background: 'transparent', color: BZ.text,
      border: `1.5px solid ${BZ.lineStrong}`,
    },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      width: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '18px 20px', borderRadius: BZ.r.md, border: 'none',
      fontFamily: BZ.sans, fontSize: 17, fontWeight: 700, letterSpacing: -0.2,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.35 : 1,
      transition: 'transform 120ms ease',
      ...styles[variant],
    }}>{children}</button>
  );
}
