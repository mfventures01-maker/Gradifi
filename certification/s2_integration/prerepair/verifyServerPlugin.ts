/**
 * GRADIFI VERIFY - SERVER MIDDLEWARE PLUGIN FOR VITE
 * Connects /api/verify/core, /api/verify/crossref, /api/verify/googlebooks, /api/verify/openalex,
 * /api/verify/unpaywall, /api/verify/gemini, /api/verify/nemotron, and /api/verify/gemma endpoints.
 * HOEOS Standard: Provable server execution boundary, Zero secret exposure.
 */

import { Plugin } from 'vite';
import dotenv from 'dotenv';
import path from 'path';

// Ensure server process.env receives credentials from .env.local & .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { handleCoreServerSearch } from './coreServerHandler';
import { handleCrossrefServerSearch } from './crossrefServerHandler';
import { handleGoogleBooksServerSearch } from './googleBooksServerHandler';
import { handleOpenAlexServerSearch } from './openAlexServerHandler';
import { handleUnpaywallServerSearch } from './unpaywallServerHandler';
import { handleGeminiServerReasoning } from './geminiServerHandler';
import { handleNemotronServerReasoning } from './nemotronServerHandler';
import { handleGemmaServerReasoning } from './gemmaServerHandler';
import { handlePersistenceServerRequest } from './persistenceServerHandler';

function createSearchMiddleware(providerId: string, handler: (payload: any) => Promise<any>) {
  return async (req: any, res: any) => {
    if (req.method !== 'POST' && req.method !== 'GET') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
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

        const result = await handler(payload);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({
          providerId,
          status: 'error',
          fineGrainedStatus: 'REQUEST_FAILED',
          matches: [],
          errorMessage: err?.message || 'Server error'
        }));
      }
    });
  };
}

export function verifyServerPlugin(): Plugin {
  return {
    name: 'gradifi-verify-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/verify/persist', async (req, res) => {
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
            const result = await handlePersistenceServerRequest(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');

            const errName = err?.name || err?.constructor?.name || '';
            const errMessage = String(err?.message || '');

            if (
              errName === 'VerificationConflictError' ||
              errMessage.toLowerCase().includes('conflicting verification record')
            ) {
              res.statusCode = 200;
              res.end(JSON.stringify({
                status: 'ALREADY_PERSISTED',
                verificationId: err?.verificationId || null,
                message: errMessage || 'Verification record already exists'
              }));
              return;
            }

            res.statusCode = 500;
            res.end(JSON.stringify({
              error: errMessage || 'Failed to persist verification record'
            }));
          }
        });
      });

      server.middlewares.use('/api/verify/core', createSearchMiddleware('core', handleCoreServerSearch));
      server.middlewares.use('/api/verify/crossref', createSearchMiddleware('crossref', handleCrossrefServerSearch));
      server.middlewares.use('/api/verify/googlebooks', createSearchMiddleware('googlebooks', handleGoogleBooksServerSearch));
      server.middlewares.use('/api/verify/openalex', createSearchMiddleware('openalex', handleOpenAlexServerSearch));
      server.middlewares.use('/api/verify/unpaywall', createSearchMiddleware('unpaywall', handleUnpaywallServerSearch));

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

      server.middlewares.use('/api/verify/gemma', async (req, res) => {
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
            const result = await handleGemmaServerReasoning(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              status: 'RUNTIME_UNAVAILABLE',
              findings: [],
              errorMessage: err?.message || 'Server error'
            }));
          }
        });
      });
    }
  };
}
