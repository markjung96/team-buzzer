import { createServer } from 'http';
import { io as ioClient } from 'socket.io-client';
import { setupSocketHandlers } from '../server-logic.js';

export function createTestEnv(options = {}) {
  const httpServer = createServer();
  const { io, rooms } = setupSocketHandlers(httpServer, options);

  return new Promise((resolve) => {
    httpServer.listen(0, () => {
      const port = httpServer.address().port;

      function createClient() {
        return ioClient(`http://localhost:${port}`, {
          path: '/api/socketio',
          transports: ['websocket'],
          forceNew: true,
        });
      }

      async function cleanup() {
        io.close();
        await new Promise((r) => httpServer.close(r));
      }

      resolve({ io, rooms, createClient, cleanup, port });
    });
  });
}

export function waitForEvent(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export function connectClient(createClient) {
  return new Promise((resolve) => {
    const client = createClient();
    client.on('connect', () => resolve(client));
  });
}
