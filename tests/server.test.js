import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnv, waitForEvent, connectClient } from './helpers.js';

let env;
let clients = [];

async function makeClient() {
  const c = await connectClient(env.createClient);
  clients.push(c);
  return c;
}

async function createRoom(nickname = 'host') {
  const host = await makeClient();
  host.emit('create-room', { nickname });
  const data = await waitForEvent(host, 'room-created');
  return { host, code: data.code, roomState: data.roomState };
}

async function joinRoom(code, nickname) {
  const player = await makeClient();
  player.emit('join-room', { code, nickname });
  const data = await waitForEvent(player, 'room-joined');
  return { player, roomState: data.roomState };
}

beforeEach(async () => {
  env = await createTestEnv({ hostGracePeriodMs: 200 });
  clients = [];
});

afterEach(async () => {
  clients.forEach((c) => c.disconnect());
  await env.cleanup();
});

// ==================== Room Lifecycle ====================

describe('Room Lifecycle', () => {
  test('#1 create-room generates unique 4-digit code', async () => {
    const { code } = await createRoom();
    expect(code).toMatch(/^\d{4}$/);

    // Second room gets different code
    const host2 = await makeClient();
    host2.emit('create-room', { nickname: 'host2' });
    const data2 = await waitForEvent(host2, 'room-created');
    expect(data2.code).toMatch(/^\d{4}$/);
    expect(data2.code).not.toBe(code);
  });

  test('#2 join-room adds player to room', async () => {
    const { code } = await createRoom();
    const { roomState } = await joinRoom(code, 'player1');
    expect(roomState.players).toHaveLength(1);
    expect(roomState.players[0].nickname).toBe('player1');
  });

  test('#3 join-room with duplicate nickname returns error', async () => {
    const { code } = await createRoom();
    await joinRoom(code, 'player1');

    const dup = await makeClient();
    dup.emit('join-room', { code, nickname: 'player1' });
    const err = await waitForEvent(dup, 'error');
    expect(err.message).toContain('닉네임');
  });

  test('#4 join-room with non-existent room returns error', async () => {
    const player = await makeClient();
    player.emit('join-room', { code: '9999', nickname: 'nobody' });
    const err = await waitForEvent(player, 'error');
    expect(err.message).toContain('찾을 수 없습니다');
  });

  test('#5 leave-room (player) removes player and notifies others', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    const leftPromise = waitForEvent(host, 'player-left');
    player.emit('leave-room');
    const { playerId } = await leftPromise;
    expect(playerId).toBe(player.id);
  });

  test('#6 leave-room (host) deletes room and notifies all', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    const hostLeftPromise = waitForEvent(player, 'host-left');
    host.emit('leave-room');
    await hostLeftPromise;
    expect(env.rooms.has(code)).toBe(false);
  });
});

// ==================== Team Management ====================

describe('Team Management', () => {
  test('#7 pick-team updates teamId and broadcasts', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    const changePromise = waitForEvent(host, 'player-team-changed');
    player.emit('pick-team', { teamId: 'red' });
    const change = await changePromise;
    expect(change.teamId).toBe('red');
    expect(change.nickname).toBe('player1');
    expect(change.teamColor).toBe('#ff4757');
  });

  test('#8 pick-team persists through rejoin', async () => {
    const { code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    // Pick team
    player.emit('pick-team', { teamId: 'blue' });
    await waitForEvent(player, 'player-team-changed');

    // Simulate rejoin
    player.emit('rejoin-room', { code, nickname: 'player1' });
    const { roomState } = await waitForEvent(player, 'room-joined');
    const me = roomState.players.find((p) => p.nickname === 'player1');
    expect(me.teamId).toBe('blue');
  });

  test('#9 host can create/edit/delete team', async () => {
    const { host, code } = await createRoom();
    await joinRoom(code, 'player1');

    // Create team
    host.emit('create-team', { name: 'GREEN', color: '#2ed573' });
    const { teams: t1 } = await waitForEvent(host, 'teams-updated');
    expect(t1).toHaveLength(3);
    const greenTeam = t1.find((t) => t.name === 'GREEN');
    expect(greenTeam).toBeDefined();

    // Edit team
    host.emit('edit-team', { teamId: greenTeam.id, name: 'LIME' });
    const { teams: t2 } = await waitForEvent(host, 'teams-updated');
    expect(t2.find((t) => t.id === greenTeam.id).name).toBe('LIME');

    // Delete team
    host.emit('delete-team', { teamId: greenTeam.id });
    const { teams: t3 } = await waitForEvent(host, 'teams-updated');
    expect(t3).toHaveLength(2);
  });

  test('#10 non-host cannot manage teams', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    // Player tries to create team — should be silently ignored
    player.emit('create-team', { name: 'HACK', color: '#000' });

    // Give it a moment, then verify no update
    await new Promise((r) => setTimeout(r, 200));
    const room = [...env.rooms.values()][0];
    expect(room.teams).toHaveLength(2); // Only default teams
  });
});

// ==================== Round Flow ====================

describe('Round Flow', () => {
  test('#11 start-round sets active and broadcasts', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    const startPromise = waitForEvent(player, 'round-started');
    host.emit('start-round');
    await startPromise;

    const room = [...env.rooms.values()][0];
    expect(room.round.active).toBe(true);
  });

  test('#12 buzz updates ranking and broadcasts', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');
    player.emit('pick-team', { teamId: 'red' });
    await waitForEvent(player, 'player-team-changed');

    host.emit('start-round');
    await waitForEvent(player, 'round-started');

    const resultPromise = waitForEvent(host, 'buzz-result');
    player.emit('buzz', { reactionMs: 150 });
    const { ranking } = await resultPromise;
    expect(ranking).toHaveLength(1);
    expect(ranking[0].nickname).toBe('player1');
    expect(ranking[0].rank).toBe(1);
  });

  test('#13 buzz without team is rejected', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');
    // NOT picking a team

    host.emit('start-round');
    await waitForEvent(player, 'round-started');

    player.emit('buzz', { reactionMs: 100 });

    // Wait and verify no buzz-result
    await new Promise((r) => setTimeout(r, 300));
    const room = [...env.rooms.values()][0];
    expect(room.round.ranking).toHaveLength(0);
  });

  test('#14 buzz when round not active is rejected', async () => {
    const { code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');
    player.emit('pick-team', { teamId: 'red' });
    await waitForEvent(player, 'player-team-changed');

    // Round not started — buzz should be ignored
    player.emit('buzz', { reactionMs: 100 });
    await new Promise((r) => setTimeout(r, 300));
    const room = [...env.rooms.values()][0];
    expect(room.round.ranking).toHaveLength(0);
  });

  test('#15 double buzz is rejected', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');
    player.emit('pick-team', { teamId: 'red' });
    await waitForEvent(player, 'player-team-changed');

    host.emit('start-round');
    await waitForEvent(player, 'round-started');

    player.emit('buzz', { reactionMs: 100 });
    await waitForEvent(host, 'buzz-result');

    // Second buzz
    player.emit('buzz', { reactionMs: 200 });
    await new Promise((r) => setTimeout(r, 300));
    const room = [...env.rooms.values()][0];
    expect(room.round.ranking).toHaveLength(1);
  });

  test('#16 multiple buzzes have correct ranking order', async () => {
    const { host, code } = await createRoom();
    const { player: p1 } = await joinRoom(code, 'p1');
    const { player: p2 } = await joinRoom(code, 'p2');

    p1.emit('pick-team', { teamId: 'red' });
    await waitForEvent(p1, 'player-team-changed');
    p2.emit('pick-team', { teamId: 'blue' });
    await waitForEvent(p2, 'player-team-changed');

    host.emit('start-round');
    await waitForEvent(p1, 'round-started');

    p1.emit('buzz', { reactionMs: 100 });
    await waitForEvent(host, 'buzz-result');

    p2.emit('buzz', { reactionMs: 200 });
    const { ranking } = await waitForEvent(host, 'buzz-result');

    expect(ranking).toHaveLength(2);
    expect(ranking[0].nickname).toBe('p1');
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].nickname).toBe('p2');
    expect(ranking[1].rank).toBe(2);
  });

  test('#17 reset-round then start-round transitions correctly', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');
    player.emit('pick-team', { teamId: 'red' });
    await waitForEvent(player, 'player-team-changed');

    // First round
    host.emit('start-round');
    await waitForEvent(player, 'round-started');
    player.emit('buzz', { reactionMs: 100 });
    await waitForEvent(host, 'buzz-result');

    // Reset
    host.emit('reset-round');
    await waitForEvent(player, 'round-reset');

    const room = [...env.rooms.values()][0];
    expect(room.round.active).toBe(false);
    expect(room.round.ranking).toHaveLength(0);

    // Start again
    host.emit('start-round');
    await waitForEvent(player, 'round-started');

    expect(room.round.active).toBe(true);
    expect(room.round.ranking).toHaveLength(0);
  });

  test('#18 buzz with reactionMs stores correctly', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');
    player.emit('pick-team', { teamId: 'red' });
    await waitForEvent(player, 'player-team-changed');

    host.emit('start-round');
    await waitForEvent(player, 'round-started');

    player.emit('buzz', { reactionMs: 342.567 });
    const { ranking } = await waitForEvent(host, 'buzz-result');
    expect(ranking[0].reactionMs).toBe(343); // rounded
  });
});

// ==================== Edge Cases ====================

describe('Edge Cases', () => {
  test('#19 late joiner gets correct room state', async () => {
    const { host, code } = await createRoom();
    const { player: p1 } = await joinRoom(code, 'p1');
    p1.emit('pick-team', { teamId: 'red' });
    await waitForEvent(p1, 'player-team-changed');

    host.emit('start-round');
    await waitForEvent(p1, 'round-started');

    p1.emit('buzz', { reactionMs: 100 });
    await waitForEvent(host, 'buzz-result');

    // Late joiner
    const { roomState } = await joinRoom(code, 'latecomer');
    expect(roomState.round.active).toBe(true);
    expect(roomState.round.ranking).toHaveLength(1);
    expect(roomState.players).toHaveLength(2);
  });

  test('#20 rejoin preserves teamId (same socket, page navigation)', async () => {
    const { code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    player.emit('pick-team', { teamId: 'blue' });
    await waitForEvent(player, 'player-team-changed');

    // Simulate page navigation — same socket emits rejoin (singleton pattern)
    player.emit('rejoin-room', { code, nickname: 'player1' });
    const { roomState } = await waitForEvent(player, 'room-joined');
    const me = roomState.players.find((p) => p.nickname === 'player1');
    expect(me.teamId).toBe('blue');
  });

  test('#21 host disconnect triggers grace period then room deletion', async () => {
    const { host, code } = await createRoom();
    const { player } = await joinRoom(code, 'player1');

    const hostLeftPromise = waitForEvent(player, 'host-left');
    host.disconnect();

    // Room should still exist briefly
    expect(env.rooms.has(code)).toBe(true);

    // Wait for grace period (200ms in test)
    await hostLeftPromise;
    expect(env.rooms.has(code)).toBe(false);
  });

  test('#22 host reconnect within grace period preserves room', async () => {
    const { host, code } = await createRoom();
    await joinRoom(code, 'player1');

    host.disconnect();
    expect(env.rooms.has(code)).toBe(true);

    // Rejoin quickly (within 200ms grace period)
    await new Promise((r) => setTimeout(r, 50));
    const rejoinHost = await makeClient();
    rejoinHost.emit('rejoin-room', { code, nickname: 'host' });
    const { roomState, isHost } = await waitForEvent(rejoinHost, 'room-joined');
    expect(isHost).toBe(true);
    expect(roomState.code).toBe(code);

    // Wait past grace period — room should still exist
    await new Promise((r) => setTimeout(r, 300));
    expect(env.rooms.has(code)).toBe(true);
  });
});
