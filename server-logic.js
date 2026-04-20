import { Server } from 'socket.io';

const DEFAULT_TEAMS = [
  { id: 'red', name: 'RED', color: '#ff4757' },
  { id: 'blue', name: 'BLUE', color: '#3742fa' },
];

export function setupSocketHandlers(httpServer, options = {}) {
  const hostGracePeriodMs = options.hostGracePeriodMs ?? 5000;

  const io = new Server(httpServer, {
    path: '/api/socketio',
  });

  const rooms = new Map();

  function generateCode() {
    let code;
    do {
      code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    } while (rooms.has(code));
    return code;
  }

  function generateId() {
    return Math.random().toString(36).substring(2, 8);
  }

  function findRoomBySocketId(socketId) {
    for (const [, room] of rooms) {
      if (room.hostId === socketId) return room;
      if (room.players.some((p) => p.id === socketId)) return room;
    }
    return null;
  }

  function getRoomState(room) {
    return {
      code: room.code,
      players: room.players,
      teams: room.teams,
      round: room.round,
    };
  }

  io.on('connection', (socket) => {
    socket.on('create-room', ({ nickname }) => {
      const code = generateCode();
      const room = {
        code,
        hostId: socket.id,
        hostNickname: nickname,
        players: [],
        teams: DEFAULT_TEAMS.map((t) => ({ ...t })),
        round: { active: false, ranking: [] },
        hostDisconnectTimer: null,
      };
      rooms.set(code, room);
      socket.join(code);
      socket.emit('room-created', { code, isHost: true, roomState: getRoomState(room) });
    });

    socket.on('join-room', ({ code, nickname }) => {
      const room = rooms.get(code);
      if (!room) {
        socket.emit('error', { message: '방을 찾을 수 없습니다' });
        return;
      }
      if (room.players.some((p) => p.nickname === nickname)) {
        socket.emit('error', { message: '이미 사용 중인 닉네임입니다' });
        return;
      }
      const player = { id: socket.id, nickname, teamId: null };
      room.players.push(player);
      socket.join(code);
      socket.emit('room-joined', { roomState: getRoomState(room), isHost: false });
      socket.to(code).emit('player-joined', { player });
    });

    socket.on('rejoin-room', ({ code, nickname }) => {
      const room = rooms.get(code);
      if (!room) {
        socket.emit('error', { message: '방을 찾을 수 없습니다' });
        return;
      }
      const isHost = room.hostNickname === nickname;
      if (!isHost) {
        let player = room.players.find((p) => p.nickname === nickname);
        if (player) {
          player.id = socket.id;
        } else {
          player = { id: socket.id, nickname, teamId: null };
          room.players.push(player);
        }
      }
      socket.join(code);
      if (isHost) {
        if (room.hostDisconnectTimer) {
          clearTimeout(room.hostDisconnectTimer);
          room.hostDisconnectTimer = null;
        }
        room.hostId = socket.id;
      }
      socket.emit('room-joined', { roomState: getRoomState(room), isHost });
    });

    socket.on('create-team', ({ name, color }) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || socket.id !== room.hostId) return;
      const team = { id: generateId(), name, color };
      room.teams.push(team);
      io.to(room.code).emit('teams-updated', { teams: room.teams });
    });

    socket.on('edit-team', ({ teamId, name, color }) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || socket.id !== room.hostId) return;
      const team = room.teams.find((t) => t.id === teamId);
      if (!team) return;
      if (name !== undefined) team.name = name;
      if (color !== undefined) team.color = color;
      io.to(room.code).emit('teams-updated', { teams: room.teams });
    });

    socket.on('delete-team', ({ teamId }) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || socket.id !== room.hostId) return;
      room.teams = room.teams.filter((t) => t.id !== teamId);
      room.players.forEach((p) => {
        if (p.teamId === teamId) p.teamId = null;
      });
      io.to(room.code).emit('teams-updated', { teams: room.teams });
      io.to(room.code).emit('players-updated', { players: room.players });
    });

    socket.on('pick-team', ({ teamId }) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      const team = room.teams.find((t) => t.id === teamId);
      if (!team) return;
      player.teamId = teamId;
      io.to(room.code).emit('player-team-changed', {
        playerId: socket.id,
        nickname: player.nickname,
        teamId,
        teamName: team.name,
        teamColor: team.color,
      });
    });

    socket.on('start-round', () => {
      const room = findRoomBySocketId(socket.id);
      if (!room || socket.id !== room.hostId) return;
      room.round = { active: true, ranking: [] };
      io.to(room.code).emit('round-started');
    });

    socket.on('buzz', ({ reactionMs } = {}) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || !room.round.active) return;
      if (room.round.ranking.some((r) => r.playerId === socket.id)) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player || !player.teamId) return;
      const team = room.teams.find((t) => t.id === player.teamId);
      const rank = room.round.ranking.length + 1;
      room.round.ranking.push({
        playerId: socket.id,
        nickname: player.nickname,
        teamId: player.teamId,
        teamName: team?.name || null,
        teamColor: team?.color || null,
        rank,
        timestamp: Date.now(),
        reactionMs: typeof reactionMs === 'number' ? Math.round(reactionMs) : null,
      });
      io.to(room.code).emit('buzz-result', { ranking: room.round.ranking });
    });

    socket.on('reset-round', () => {
      const room = findRoomBySocketId(socket.id);
      if (!room || socket.id !== room.hostId) return;
      room.round = { active: false, ranking: [] };
      io.to(room.code).emit('round-reset');
    });

    socket.on('leave-room', () => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      if (socket.id === room.hostId) {
        io.to(room.code).emit('host-left');
        rooms.delete(room.code);
      } else {
        room.players = room.players.filter((p) => p.id !== socket.id);
        socket.leave(room.code);
        io.to(room.code).emit('player-left', { playerId: socket.id });
      }
    });

    socket.on('disconnect', () => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      if (socket.id === room.hostId) {
        room.hostDisconnectTimer = setTimeout(() => {
          io.to(room.code).emit('host-left');
          rooms.delete(room.code);
        }, hostGracePeriodMs);
      } else {
        room.players = room.players.filter((p) => p.id !== socket.id);
        io.to(room.code).emit('player-left', { playerId: socket.id });
      }
    });
  });

  return { io, rooms };
}
