import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { composeHandler } from './server/compose-handler';

/**
 * Mounts server/compose-handler.ts on /api/compose during dev.
 *
 * The handler stays free of Vite imports so the exact same function can be
 * redeployed as a serverless function in production — only the mounting here
 * is dev-specific. See docs/architecture.md → "server/compose-handler.ts".
 */
function composeApi(): Plugin {
  return {
    name: 'banda-virtual:compose-api',
    configureServer(server) {
      server.middlewares.use('/api/compose', (req, res, next) => {
        composeHandler(req, res).catch(next);
      });
    },
  };
}

export default defineConfig({
  // basicSsl() supplies the self-signed cert WebXR needs (AGENTS.md hard rule 3).
  plugins: [react(), basicSsl(), composeApi()],
  server: { port: 5173, strictPort: true },
});
