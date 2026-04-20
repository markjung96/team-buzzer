import { createServer } from 'http';
import next from 'next';
import { setupSocketHandlers } from './server-logic.js';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  setupSocketHandlers(httpServer);

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Server listening at http://0.0.0.0:${port} as ${dev ? 'development' : 'production'}`);
  });
});
