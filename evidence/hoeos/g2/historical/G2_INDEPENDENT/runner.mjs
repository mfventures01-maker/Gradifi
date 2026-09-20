// G2 INDEPENDENT RUNNER — reads fixture, invokes production path, prints JSON
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

async function main() {
    const fixture = path.join(REPO_ROOT, 'scratch', 'golden_test_001.docx');
    const bytes = fs.readFileSync(fixture);
    const bytesHash = crypto.createHash('sha256').update(bytes).digest('hex');

    let normalizer = null;
    let ingestion = null;
    try {
        normalizer = await import(path.join(REPO_ROOT, 'src/services/verify/documentNormalizer.ts'));
    } catch (e) { /* not available */ }
    try {
        ingestion = await import(path.join(REPO_ROOT, 'src/services/verify/universalIngestionService.ts'));
    } catch (e) { /* not available */ }

    // Try common export names for canonicalization
    const candidates = ['buildCanonicalAnalysisDocument', 'normalizeText', 'buildCanonicalDocument'];
    let canonicalFn = null;
    let fnName = null;
    for (const name of candidates) {
        if (normalizer && typeof normalizer[name] === 'function') { canonicalFn = normalizer[name]; fnName = 'documentNormalizer.' + name; break; }
        if (ingestion && typeof ingestion[name] === 'function') { canonicalFn = ingestion[name]; fnName = 'universalIngestionService.' + name; break; }
    }

    const result = {
        bytesHash,
        bytesLength: bytes.length,
        canonicalFnName: fnName,
        canonicalTextHash: null,
        documentId: null,
        textLength: null,
        wordCount: null,
        error: null
    };

    if (!canonicalFn) {
        result.error = 'no canonicalization function found in known modules';
        console.log(JSON.stringify(result));
        return;
    }

    try {
        let text = '';
        // If the fn expects a string, decode the docx minimally for the fallback case
        // Otherwise pass bytes
        const out = await Promise.resolve(canonicalFn(bytes));
        if (typeof out === 'string') {
            text = out;
        } else if (out && typeof out === 'object') {
            text = out.normalizedText || out.canonicalText || out.text || '';
            result.documentId = out.documentId || out.id || null;
        }
        result.textLength = text.length;
        result.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        result.canonicalTextHash = crypto.createHash('sha256').update(text).digest('hex');
    } catch (e) {
        result.error = e.message;
    }

    console.log(JSON.stringify(result));
}

main().catch(e => {
    console.log(JSON.stringify({ error: e.message }));
    process.exit(1);
});