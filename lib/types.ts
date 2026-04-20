export interface Team {
  id: string;
  name: string;
  color: string; // hex color
}

export interface Player {
  id: string;
  nickname: string;
  teamId: string | null;
}

export interface RankEntry {
  playerId: string;
  nickname: string;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  rank: number;
  timestamp: number;
  reactionMs: number | null; // client-measured reaction time in ms
}

export interface Round {
  active: boolean;
  ranking: RankEntry[];
}

export interface RoomState {
  code: string;
  players: Player[];
  teams: Team[];
  round: Round;
}

// Default team presets
export const DEFAULT_TEAMS: Team[] = [
  { id: 'red', name: 'RED', color: '#ff4757' },
  { id: 'blue', name: 'BLUE', color: '#3742fa' },
];

export const TEAM_COLOR_PRESETS = [
  '#ff4757', // red
  '#3742fa', // blue
  '#2ed573', // green
  '#ffd32a', // yellow
  '#ff6b81', // pink
  '#7bed9f', // mint
  '#70a1ff', // sky
  '#ff7f50', // coral
  '#a55eea', // purple
  '#1e90ff', // dodger blue
];
