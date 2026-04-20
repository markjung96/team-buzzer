'use client';

import { useState } from 'react';
import { Team, TEAM_COLOR_PRESETS } from '@/lib/types';

interface TeamManagerProps {
  teams: Team[];
  onCreateTeam: (name: string, color: string) => void;
  onEditTeam: (teamId: string, name: string, color: string) => void;
  onDeleteTeam: (teamId: string) => void;
}

export default function TeamManager({ teams, onCreateTeam, onEditTeam, onDeleteTeam }: TeamManagerProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TEAM_COLOR_PRESETS[0]);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onCreateTeam(newName.trim().toUpperCase(), newColor);
    setNewName('');
    setNewColor(TEAM_COLOR_PRESETS[teams.length % TEAM_COLOR_PRESETS.length]);
    setAdding(false);
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditName(team.name);
    setEditColor(team.color);
  };

  const handleEdit = () => {
    if (!editingId || !editName.trim()) return;
    onEditTeam(editingId, editName.trim().toUpperCase(), editColor);
    setEditingId(null);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-sm font-bold uppercase tracking-wider">Teams</h3>
        <button
          onClick={() => {
            setAdding(!adding);
            setNewColor(TEAM_COLOR_PRESETS[teams.length % TEAM_COLOR_PRESETS.length]);
          }}
          className="text-white/40 hover:text-white text-xl transition-colors leading-none"
        >
          {adding ? '\u00D7' : '+'}
        </button>
      </div>

      {/* Team list */}
      {teams.map((team) => (
        <div key={team.id} className="glass rounded-xl p-3 flex items-center gap-3">
          {editingId === team.id ? (
            <>
              <div
                className="w-8 h-8 rounded-full shrink-0 cursor-pointer ring-2 ring-white/20"
                style={{ backgroundColor: editColor }}
                onClick={() => {
                  const idx = TEAM_COLOR_PRESETS.indexOf(editColor);
                  setEditColor(TEAM_COLOR_PRESETS[(idx + 1) % TEAM_COLOR_PRESETS.length]);
                }}
              />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={8}
                className="flex-1 bg-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                autoFocus
              />
              <button onClick={handleEdit} className="text-green-400 text-sm font-bold">&#10003;</button>
              <button onClick={() => setEditingId(null)} className="text-white/30 text-sm">&#10005;</button>
            </>
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-full shrink-0"
                style={{ backgroundColor: team.color }}
              />
              <span className="flex-1 font-bold text-white text-sm">{team.name}</span>
              <button
                onClick={() => startEdit(team)}
                className="text-white/30 hover:text-white/60 text-xs transition-colors"
              >
                &#9998;
              </button>
              <button
                onClick={() => onDeleteTeam(team.id)}
                className="text-white/30 hover:text-red-400 text-xs transition-colors"
              >
                &#128465;
              </button>
            </>
          )}
        </div>
      ))}

      {/* Add new team */}
      {adding && (
        <div className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up">
          <div
            className="w-8 h-8 rounded-full shrink-0 cursor-pointer ring-2 ring-white/20"
            style={{ backgroundColor: newColor }}
            onClick={() => {
              const idx = TEAM_COLOR_PRESETS.indexOf(newColor);
              setNewColor(TEAM_COLOR_PRESETS[(idx + 1) % TEAM_COLOR_PRESETS.length]);
            }}
          />
          <input
            type="text"
            placeholder="팀 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={8}
            className="flex-1 bg-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none placeholder:text-white/30"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="btn-green !py-1.5 !px-4 !text-sm !rounded-lg">
            추가
          </button>
        </div>
      )}

      <p className="text-white/20 text-xs text-center">
        색상 원을 클릭하면 색이 바뀝니다
      </p>
    </div>
  );
}
