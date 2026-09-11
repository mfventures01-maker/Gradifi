/**
 * GRADIFI VERIFY - SERVER MIDDLEWARE PLUGIN FOR VITE
 * Connects /api/verify/core, /api/verify/googlebooks, /api/verify/gemini, and /api/verify/nemotron endpoints.
 * HOEOS Standard: Provable server execution boundary, Zero secret exposure.
 */

import { Plugin } from 'vite';
import { handleCoreServerSearch } from './coreServerHandler';
import { handleGoogleBooksServerSearch } from './googleBooksServerHandler';
import { handleGeminiServerReasoning } from './geminiServerHandler';
import { handleNemotronServerReasoning } from './nemotronServerHandler';

export function verifyServerPlugin(): Plugin {
  return {
    name: 'gradifi-verify-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/verify/core', async (req, res) => {
        if (req.method !== 'POST' && req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            let payload: any = {};
            if (req.method === 'POST' && body) {
              payload = JSON.parse(body);
            } else if (req.url) {
              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              payload = {
                query: urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || '',
                limit: parseInt(urlObj.searchParams.get('limit') || '5', 10)
              };
            }

            const result = await handleCoreServerSearch(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              providerId: 'core',
              status: 'error',
              fineGrainedStatus: 'REQUEST_FAILED',
              matches: [],
              errorMessage: err?.message || 'Server error'
            }));
          }
        });
      });

      server.middlewares.use('/api/verify/googlebooks', async (req, res) => {
        if (req.method !== 'POST' && req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            let payload: any = {};
            if (req.method === 'POST' && body) {
              payload = JSON.parse(body);
            } else if (req.url) {
              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              payload = {
                query: urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || '',
                limit: parseInt(urlObj.searchParams.get('limit') || '5', 10)
              };
            }

            const result = await handleGoogleBooksServerSearch(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              providerId: 'googlebooks',
              status: 'error',
              fineGrainedStatus: 'REQUEST_FAILED',
              matches: [],
              errorMessage: err?.message || 'Server error'
            }));
          }
        });
      });

      server.middlewares.use('/api/verify/gemini', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = body ? JSON.parse(body) : {};
            const result = await handleGeminiServerReasoning(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              status: 'ERROR',
              findings: [],
              errorMessage: err?.message || 'Server error'
            }));
          }
        });
      });

      server.middlewares.use('/api/verify/nemotron', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = body ? JSON.parse(body) : {};
            const result = await handleNemotronServerReasoning(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              status: 'INFERENCE_FAILED',
              findings: [],
              errorMessage: err?.message || 'Server error'
            }));
          }
        });
      });
    }
  };
}
