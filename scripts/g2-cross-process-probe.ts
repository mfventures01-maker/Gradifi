import fs from 'fs';
import { ingestDocument } from '../src/services/verify/universalIngestionService';

(async () => {
  const buf = fs.readFileSync('tests/hoeos/g2/golden_test_001.docx');
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const r = await ingestDocument({ name: 'golden_test_001.docx', buffer: ab });
  const docId = r.canonicalDocument?.documentId ?? '';
  if (!docId) {
    console.error('NO_DOCUMENT_ID');
    process.exit(1);
  }
  console.log(docId);
})().catch((e: any) => {
  console.error('SCRIPT_ERROR=' + (e?.message ?? String(e)));
  process.exit(2);
});
