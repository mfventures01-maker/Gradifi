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

import { handleCoreServerSearch } from './coreServerHandler.js';
import { handleCrossrefServerSearch } from './crossrefServerHandler.js';
import { handleGoogleBooksServerSearch } from './googleBooksServerHandler.js';
import { handleOpenAlexServerSearch } from './openAlexServerHandler.js';
import { handleUnpaywallServerSearch } from './unpaywallServerHandler.js';
import { handleSemanticScholarServerSearch } from './semanticScholarServerHandler.js';
import { handleGeminiServerReasoning } from './geminiServerHandler.js';
import { handleNemotronServerReasoning } from './nemotronServerHandler.js';
import { handleGemmaServerReasoning } from './gemmaServerHandler.js';
import { handleTrustedVerifyRun } from './verifyRunServerHandler.js';

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
      // Legacy client-authored persistence is disabled in local Vite as well as Vercel.
      server.middlewares.use('/api/verify/persist', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.statusCode = req.method === 'POST' ? 410 : 405;
        res.end(JSON.stringify({
          code: 'CLIENT_AUTHORED_PERSISTENCE_DISABLED',
          error: 'Submit documentText to /api/verify/run. Client-authored scores and hashes are not accepted.'
        }));
      });

      // Run the authoritative engine on the server; only this result may be persisted.
      server.middlewares.use('/api/verify/run', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        let tooLarge = false;
        req.on('data', (chunk) => {
          if (tooLarge) return;
          body += chunk;
          if (Buffer.byteLength(body, 'utf8') > 1_100_000) {
            tooLarge = true;
            body = '';
          }
        });

        req.on('end', async () => {
          if (tooLarge) {
            res.statusCode = 413;
            res.end(JSON.stringify({ code: 'DOCUMENT_TOO_LARGE', error: 'Request body exceeds the verification limit.' }));
            return;
          }

          try {
            const payload = body ? JSON.parse(body) : {};
            const result = await handleTrustedVerifyRun(payload);
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            const code = err?.message === 'DOCUMENT_TOO_LARGE'
              ? 'DOCUMENT_TOO_LARGE'
              : err?.message === 'DOCUMENT_TEXT_REQUIRED'
                ? 'DOCUMENT_TEXT_REQUIRED'
                : 'VERIFY_RUN_FAILED';
            res.statusCode = code === 'DOCUMENT_TOO_LARGE' ? 413 : code === 'DOCUMENT_TEXT_REQUIRED' ? 400 : 500;
            res.end(JSON.stringify({
              code,
              error: code === 'DOCUMENT_TOO_LARGE'
                ? 'Document text exceeds the 1 MB verification limit.'
                : code === 'DOCUMENT_TEXT_REQUIRED'
                  ? 'A non-empty documentText field is required.'
                  : 'Server-side verification could not be completed.'
            }));
          }
        });
      });

      server.middlewares.use('/api/verify/core', createSearchMiddleware('core', handleCoreServerSearch));
      server.middlewares.use('/api/verify/crossref', createSearchMiddleware('crossref', handleCrossrefServerSearch));
      server.middlewares.use('/api/verify/googlebooks', createSearchMiddleware('googlebooks', handleGoogleBooksServerSearch));
      server.middlewares.use('/api/verify/openalex', createSearchMiddleware('openalex', handleOpenAlexServerSearch));
      server.middlewares.use('/api/verify/unpaywall', createSearchMiddleware('unpaywall', handleUnpaywallServerSearch));
      server.middlewares.use('/api/verify/semanticscholar', createSearchMiddleware('semanticscholar', handleSemanticScholarServerSearch));

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
