/**
 * G5-M03 DOCX EXTRACTOR
 *
 * Conforms to evidence/phase3/g5m03_spec.txt.
 *
 * Deterministically extracts the main story (word/document.xml) from a
 * DOCX package (a PKZIP archive) into a TextSegment[] stream with
 * canonical source-map spans.
 *
 * SECURITY CONTRACT
 *   - Reject archives whose declared decompressed sizes exceed limits
 *     BEFORE decompression (fflate streaming is not used; the ZIP
 *     central directory is parsed manually).
 *   - Reject path traversal ('..'), absolute paths, and drive paths.
 *   - Reject duplicate 'word/document.xml' entries.
 *   - Reject XML containing '<!DOCTYPE' or '<!ENTITY'.
 *   - Reject non-UTF-8 XML encodings.
 *   - Never call OCR. Never throw. Every failure returns a typed
 *     ExtractionFailure via the DocxExtractionResult.
 *
 * NON-MODIFICATION CONTRACT
 *   This module does NOT import from documentNormalizer, deterministicEngine,
 *   verifyCoreService, canonicalTextOffsetService, or types.ts.
 *   It is a standalone ingestion adapter.
 *
 * This is the G5-M03 implementation, frozen after certification.
 */

import { unzipSync, inflateSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

// -------------------------------------------------------------------------
// TYPES
// -------------------------------------------------------------------------

export interface ExtractDocxOptions {
  maxBytes?: number;
  maxDecompressedBytes?: number;
  maxEntryBytes?: number;
  maxEntryCount?: number;
}

export type TextSegmentKind = 'text' | 'tab' | 'lineBreak' | 'paragraphBreak';

export interface TextSegment {
  story: 'main';
  partName: string;
  paragraphOrdinal: number;
  runOrdinal: number | null;
  xmlPath: string;
  kind: TextSegmentKind;
  rawText: string;
  canonicalStart: number;
  canonicalEnd: number;
}

export type ExtractionWarningCode =
  | 'TRACKED_INSERTION_PRESENT'
  | 'TRACKED_DELETION_PRESENT'
  | 'FOOTNOTE_REFERENCE_IGNORED'
  | 'ENDNOTE_REFERENCE_IGNORED'
  | 'DRAWING_IGNORED'
  | 'EMBEDDED_OBJECT_IGNORED'
  | 'UNSUPPORTED_ELEMENT_IGNORED';

export interface ExtractionWarning {
  code: ExtractionWarningCode;
  message: string;
  part?: string;
}

export type ExtractionFailureCode =
  | 'INVALID_DOCX'
  | 'CORRUPT_PACKAGE'
  | 'MISSING_MAIN_PART'
  | 'EMPTY_DOCUMENT'
  | 'SECURITY_REJECTED'
  | 'UNSUPPORTED_FEATURE'
  | 'OVERSIZED';

export interface ExtractionFailure {
  code: ExtractionFailureCode;
  message: string;
  detail?: Record<string, unknown>;
}

export interface DocxExtractionResult {
  success: boolean;
  segments: TextSegment[];
  canonicalText: string;
  canonicalTextHash: string;
  zipEntryCount: number;
  decompressedBytes: number;
  warnings: ExtractionWarning[];
  error?: ExtractionFailure;
}

// -------------------------------------------------------------------------
// CONSTANTS
// -------------------------------------------------------------------------

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_COUNT = 5000;

const MAIN_PART = 'word/document.xml';
const PK_MAGIC = [0x50, 0x4b, 0x03, 0x04];

// -------------------------------------------------------------------------
// HASH (FNV-1a-64, identical to documentNormalizer.computeHash)
// -------------------------------------------------------------------------

function fnv1a64Hex(input: string): string {
  if (!input) return '0000000000000000';
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

// -------------------------------------------------------------------------
// FAILURE HELPERS
// -------------------------------------------------------------------------

function failure(
  code: ExtractionFailureCode,
  message: string,
  detail?: Record<string, unknown>,
): DocxExtractionResult {
  return {
    success: false,
    segments: [],
    canonicalText: '',
    canonicalTextHash: '0000000000000000',
    zipEntryCount: 0,
    decompressedBytes: 0,
    warnings: [],
    error: { code, message, detail },
  };
}

// -------------------------------------------------------------------------
// ZIP CENTRAL DIRECTORY PARSING
// -------------------------------------------------------------------------

interface CentralDirEntry {
  name: string;
  nameBytes: Uint8Array;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  compressionMethod: number;
}

interface CentralDir {
  entries: CentralDirEntry[];
}

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

function readU32LE(bytes: Uint8Array, off: number): number {
  return (
    bytes[off] |
    (bytes[off + 1] << 8) |
    (bytes[off + 2] << 16) |
    (bytes[off + 3] << 24)
  ) >>> 0;
}

function readU16LE(bytes: Uint8Array, off: number): number {
  return bytes[off] | (bytes[off + 1] << 8);
}

/**
 * Locate the End of Central Directory record. The EOCD is the last
 * 22 bytes of the archive, optionally preceded by a comment (max 65535 bytes).
 * We scan backwards from the end for the EOCD signature.
 */
function findEocd(bytes: Uint8Array): number | null {
  if (bytes.length < 22) return null;
  const maxScan = Math.min(bytes.length, 22 + 65535);
  for (let i = 22; i <= maxScan; i++) {
    const off = bytes.length - i;
    if (readU32LE(bytes, off) === EOCD_SIG) return off;
  }
  return null;
}

function readCentralDirectory(bytes: Uint8Array): CentralDir | null {
  const eocdOff = findEocd(bytes);
  if (eocdOff === null) return null;

  const totalEntries = readU16LE(bytes, eocdOff + 10);
  const cdSize = readU32LE(bytes, eocdOff + 12);
  const cdOffset = readU32LE(bytes, eocdOff + 16);

  if (cdOffset + cdSize > bytes.length) return null;

  const entries: CentralDirEntry[] = [];
  let pos = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > bytes.length) return null;
    const sig = readU32LE(bytes, pos);
    if (sig !== CDH_SIG) return null;

    const compressionMethod = readU16LE(bytes, pos + 10);
    const compressedSize = readU32LE(bytes, pos + 20);
    const uncompressedSize = readU32LE(bytes, pos + 24);
    const nameLen = readU16LE(bytes, pos + 28);
    const extraLen = readU16LE(bytes, pos + 30);
    const commentLen = readU16LE(bytes, pos + 32);
    const localHeaderOffset = readU32LE(bytes, pos + 42);

    if (pos + 46 + nameLen > bytes.length) return null;
    const nameBytes = bytes.slice(pos + 46, pos + 46 + nameLen);
    const name = strFromU8(nameBytes, true);

    entries.push({
      name,
      nameBytes,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      compressionMethod,
    });

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return { entries };
}

// -------------------------------------------------------------------------
// VALIDATION
// -------------------------------------------------------------------------

function checkZipMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return (
    bytes[0] === PK_MAGIC[0] &&
    bytes[1] === PK_MAGIC[1] &&
    bytes[2] === PK_MAGIC[2] &&
    bytes[3] === PK_MAGIC[3]
  );
}

function validateEntries(
  cd: CentralDir,
  opts: Required<ExtractDocxOptions>,
): ExtractionFailure | null {
  if (cd.entries.length > opts.maxEntryCount) {
    return {
      code: 'SECURITY_REJECTED',
      message: `Entry count ${cd.entries.length} exceeds max ${opts.maxEntryCount}.`,
    };
  }

  let totalDeclared = 0;
  let mainPartSeen = 0;

  for (const e of cd.entries) {
    // Path traversal
    if (e.name.includes('..')) {
      return {
        code: 'SECURITY_REJECTED',
        message: `Entry name contains '..': ${e.name}`,
      };
    }
    // Absolute path (unix or windows)
    if (e.name.startsWith('/') || e.name.startsWith('\\')) {
      return {
        code: 'SECURITY_REJECTED',
        message: `Entry name is absolute: ${e.name}`,
      };
    }
    // Drive path
    if (/^[A-Za-z]:[\\\/]/.test(e.name)) {
      return {
        code: 'SECURITY_REJECTED',
        message: `Entry name contains drive path: ${e.name}`,
      };
    }
    // Null byte
    if (e.name.indexOf('\u0000') !== -1) {
      return {
        code: 'SECURITY_REJECTED',
        message: `Entry name contains null byte.`,
      };
    }
    // Per-entry size
    if (e.uncompressedSize > opts.maxEntryBytes) {
      return {
        code: 'SECURITY_REJECTED',
        message: `Entry ${e.name} declares ${e.uncompressedSize} bytes, exceeds ${opts.maxEntryBytes}.`,
      };
    }
    totalDeclared += e.uncompressedSize;

    // Duplicate main part
    if (e.name === MAIN_PART) {
      mainPartSeen++;
      if (mainPartSeen > 1) {
        return {
          code: 'SECURITY_REJECTED',
          message: `Duplicate ${MAIN_PART} entry detected.`,
        };
      }
    }
  }

  if (totalDeclared > opts.maxDecompressedBytes) {
    return {
      code: 'SECURITY_REJECTED',
      message: `Total declared decompressed size ${totalDeclared} exceeds ${opts.maxDecompressedBytes}.`,
    };
  }

  return null;
}

// -------------------------------------------------------------------------
// MAIN PART DECOMPRESSION
// -------------------------------------------------------------------------

/**
 * Extract and decompress the payload of a single entry by reading its
 * local file header and slicing out the compressed data.
 * Only STORED (0) and DEFLATE (8) are supported.
 */
function extractEntryBytes(
  bytes: Uint8Array,
  entry: CentralDirEntry,
): Uint8Array | null {
  const off = entry.localHeaderOffset;
  if (off + 30 > bytes.length) return null;
  if (readU32LE(bytes, off) !== LFH_SIG) return null;

  const nameLen = readU16LE(bytes, off + 26);
  const extraLen = readU16LE(bytes, off + 28);
  const dataStart = off + 30 + nameLen + extraLen;
  const dataEnd = dataStart + entry.compressedSize;

  if (dataEnd > bytes.length) return null;
  const compressed = bytes.slice(dataStart, dataEnd);

  if (entry.compressionMethod === 0) {
    // STORED
    return compressed;
  }
  if (entry.compressionMethod === 8) {
    // DEFLATE
    try {
      return inflateSync(compressed);
    } catch {
      return null;
    }
  }
  return null;
}

// -------------------------------------------------------------------------
// XML SAFETY AND PARSING
// -------------------------------------------------------------------------

function scanForForbiddenPatterns(xmlBytes: Uint8Array): ExtractionFailure | null {
  // Reject non-UTF-8 BOM prefixes. UTF-8 BOM is 0xEF 0xBB 0xBF.
  // UTF-16 BOMs are 0xFF 0xFE and 0xFE 0xFF. Reject both.
  if (xmlBytes.length >= 2) {
    if (xmlBytes[0] === 0xff && xmlBytes[1] === 0xfe) {
      return { code: 'SECURITY_REJECTED', message: 'UTF-16 LE encoding not supported.' };
    }
    if (xmlBytes[0] === 0xfe && xmlBytes[1] === 0xff) {
      return { code: 'SECURITY_REJECTED', message: 'UTF-16 BE encoding not supported.' };
    }
  }

  const xml = strFromU8(xmlBytes, true);
  const upper = xml.toUpperCase();

  if (upper.includes('<!DOCTYPE')) {
    return { code: 'SECURITY_REJECTED', message: 'DOCTYPE declaration rejected.' };
  }
  if (upper.includes('<!ENTITY')) {
    return { code: 'SECURITY_REJECTED', message: 'ENTITY declaration rejected.' };
  }
  return null;
}

interface ParsedTree {
  [key: string]: unknown;
}

function parseXml(text: string): ParsedTree {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    processEntities: false,
    htmlEntities: false,
    allowBooleanAttributes: false,
    parseTagValue: false,
    trimValues: false,
    parseAttributeValue: false,
    stopNodes: [],
  });
  return parser.parse(text) as ParsedTree;
}

// -------------------------------------------------------------------------
// WORDPROCESSINGML WALKER
// -------------------------------------------------------------------------

interface WalkerState {
  segments: TextSegment[];
  warnings: ExtractionWarning[];
  paragraphOrdinal: number;
  runOrdinalInParagraph: number;
  inDeleted: boolean;
  seenTrackedInsertion: boolean;
  seenTrackedDeletion: boolean;
  seenFootnoteRef: boolean;
  seenEndnoteRef: boolean;
  seenDrawing: boolean;
  seenObject: boolean;
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function walkParagraph(
  paragraph: ParsedTree,
  state: WalkerState,
  xmlPathPrefix: string,
): void {
  state.paragraphOrdinal++;
  state.runOrdinalInParagraph = 0;

  const pChildren = toArray(paragraph['w:r'] as unknown);
  const insChildren = toArray(paragraph['w:ins'] as unknown);
  const delChildren = toArray(paragraph['w:del'] as unknown);

  // Emit runs directly on the paragraph
  for (const r of pChildren) {
    walkRun(r as ParsedTree, state, xmlPathPrefix);
  }

  // Tracked insertions: include contained runs
  for (const ins of insChildren) {
    if (!state.seenTrackedInsertion) {
      state.seenTrackedInsertion = true;
      state.warnings.push({
        code: 'TRACKED_INSERTION_PRESENT',
        message: 'Tracked insertions present; inserted text is included.',
      });
    }
    const insRuns = toArray((ins as ParsedTree)['w:r'] as unknown);
    for (const r of insRuns) {
      walkRun(r as ParsedTree, state, xmlPathPrefix);
    }
  }

  // Tracked deletions: exclude contained runs
  for (const del of delChildren) {
    if (!state.seenTrackedDeletion) {
      state.seenTrackedDeletion = true;
      state.warnings.push({
        code: 'TRACKED_DELETION_PRESENT',
        message: 'Tracked deletions present; deleted text is excluded.',
      });
    }
    // Do not walk runs inside w:del
  }

  // End of paragraph marker
  state.segments.push({
    story: 'main',
    partName: MAIN_PART,
    paragraphOrdinal: state.paragraphOrdinal,
    runOrdinal: null,
    xmlPath: `${xmlPathPrefix}.paragraphBreak`,
    kind: 'paragraphBreak',
    rawText: '',
    canonicalStart: 0,
    canonicalEnd: 0,
  });
}

function walkRun(run: ParsedTree, state: WalkerState, xmlPathPrefix: string): void {
  state.runOrdinalInParagraph++;
  const runOrdinal = state.runOrdinalInParagraph;

  // Text nodes
  const textNodes = toArray(run['w:t'] as unknown);
  for (let i = 0; i < textNodes.length; i++) {
    const t = textNodes[i];
    let raw = '';
    let preserve = false;

    if (typeof t === 'string' || typeof t === 'number') {
      raw = String(t);
    } else if (t && typeof t === 'object') {
      const obj = t as ParsedTree;
      const inner = obj['#text'];
      if (typeof inner === 'string' || typeof inner === 'number') {
        raw = String(inner);
      }
      const space = obj['@_xml:space'];
      if (space === 'preserve') preserve = true;
    }

    if (!preserve) raw = raw.trim();
    if (raw.length === 0) continue;

    state.segments.push({
      story: 'main',
      partName: MAIN_PART,
      paragraphOrdinal: state.paragraphOrdinal,
      runOrdinal,
      xmlPath: `${xmlPathPrefix}.w:r[${runOrdinal}].w:t[${i}]`,
      kind: 'text',
      rawText: raw,
      canonicalStart: 0,
      canonicalEnd: 0,
    });
  }

  // Tab
  const tabs = toArray(run['w:tab'] as unknown);
  for (let i = 0; i < tabs.length; i++) {
    state.segments.push({
      story: 'main',
      partName: MAIN_PART,
      paragraphOrdinal: state.paragraphOrdinal,
      runOrdinal,
      xmlPath: `${xmlPathPrefix}.w:r[${runOrdinal}].w:tab[${i}]`,
      kind: 'tab',
      rawText: '',
      canonicalStart: 0,
      canonicalEnd: 0,
    });
  }

  // Line break
  const brs = toArray(run['w:br'] as unknown);
  for (let i = 0; i < brs.length; i++) {
    state.segments.push({
      story: 'main',
      partName: MAIN_PART,
      paragraphOrdinal: state.paragraphOrdinal,
      runOrdinal,
      xmlPath: `${xmlPathPrefix}.w:r[${runOrdinal}].w:br[${i}]`,
      kind: 'lineBreak',
      rawText: '',
      canonicalStart: 0,
      canonicalEnd: 0,
    });
  }

  // Footnote reference
  const fns = toArray(run['w:footnoteReference'] as unknown);
  if (fns.length > 0 && !state.seenFootnoteRef) {
    state.seenFootnoteRef = true;
    state.warnings.push({
      code: 'FOOTNOTE_REFERENCE_IGNORED',
      message: 'Footnote reference ignored; footnote not extracted.',
    });
  }

  // Endnote reference
  const ens = toArray(run['w:endnoteReference'] as unknown);
  if (ens.length > 0 && !state.seenEndnoteRef) {
    state.seenEndnoteRef = true;
    state.warnings.push({
      code: 'ENDNOTE_REFERENCE_IGNORED',
      message: 'Endnote reference ignored; endnote not extracted.',
    });
  }

  // Drawing
  const drawings = toArray(run['w:drawing'] as unknown);
  if (drawings.length > 0 && !state.seenDrawing) {
    state.seenDrawing = true;
    state.warnings.push({
      code: 'DRAWING_IGNORED',
      message: 'Drawing ignored; image content not extracted.',
    });
  }

  // Embedded object
  const objs = toArray(run['w:object'] as unknown);
  if (objs.length > 0 && !state.seenObject) {
    state.seenObject = true;
    state.warnings.push({
      code: 'EMBEDDED_OBJECT_IGNORED',
      message: 'Embedded object ignored.',
    });
  }
}

function walkTable(table: ParsedTree, state: WalkerState, xmlPathPrefix: string): void {
  const rows = toArray(table['w:tr'] as unknown);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] as ParsedTree;
    const cells = toArray(row['w:tc'] as unknown);
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c] as ParsedTree;
      const cellPars = toArray(cell['w:p'] as unknown);
      for (let p = 0; p < cellPars.length; p++) {
        walkParagraph(cellPars[p] as ParsedTree, state, `${xmlPathPrefix}.w:tbl[${r}].w:tc[${c}].w:p[${p}]`);
      }
    }
  }
}

function walkBody(body: ParsedTree, state: WalkerState): void {
  // Body children can appear in arbitrary order.
  // Walk them in the parsed order returned by fast-xml-parser.
  for (const key of Object.keys(body)) {
    if (key === 'w:p') {
      const pars = toArray(body[key] as unknown);
      for (let i = 0; i < pars.length; i++) {
        walkParagraph(pars[i] as ParsedTree, state, `w:document.w:body.w:p[${i + 1}]`);
      }
    } else if (key === 'w:tbl') {
      const tables = toArray(body[key] as unknown);
      for (let i = 0; i < tables.length; i++) {
        walkTable(tables[i] as ParsedTree, state, `w:document.w:body.w:tbl[${i + 1}]`);
      }
    }
  }
}

// -------------------------------------------------------------------------
// CANONICAL ASSEMBLY
// -------------------------------------------------------------------------

function assembleCanonical(segments: TextSegment[]): { text: string; bytes: number } {
  // First pass: compute the canonical piece for each segment
  const pieces: string[] = segments.map((s) => {
    switch (s.kind) {
      case 'text':
        return s.rawText;
      case 'tab':
        return '\t';
      case 'lineBreak':
        return '\n';
      case 'paragraphBreak':
        return '\n\n';
    }
  });

  // Compute byte offsets (UTF-8 encoded)
  const encoder = new TextEncoder();
  let offset = 0;
  for (let i = 0; i < segments.length; i++) {
    segments[i].canonicalStart = offset;
    offset += encoder.encode(pieces[i]).length;
    segments[i].canonicalEnd = offset;
  }

  return { text: pieces.join(''), bytes: offset };
}

// -------------------------------------------------------------------------
// MAIN EXPORT
// -------------------------------------------------------------------------

export async function extractDocx(
  input: Uint8Array | ArrayBuffer,
  options: ExtractDocxOptions = {},
): Promise<DocxExtractionResult> {
  const opts: Required<ExtractDocxOptions> = {
    maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
    maxDecompressedBytes: options.maxDecompressedBytes ?? DEFAULT_MAX_DECOMPRESSED_BYTES,
    maxEntryBytes: options.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES,
    maxEntryCount: options.maxEntryCount ?? DEFAULT_MAX_ENTRY_COUNT,
  };

  // Normalize input to Uint8Array
  let bytes: Uint8Array;
  if (input instanceof Uint8Array) {
    bytes = input;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else {
    return failure('INVALID_DOCX', 'Input must be Uint8Array or ArrayBuffer.');
  }

  if (bytes.length > opts.maxBytes) {
    return failure('OVERSIZED', `Input size ${bytes.length} exceeds ${opts.maxBytes}.`);
  }

  if (!checkZipMagic(bytes)) {
    return failure('INVALID_DOCX', 'Input does not begin with PK\\x03\\x04.');
  }

  const cd = readCentralDirectory(bytes);
  if (!cd) {
    return failure('CORRUPT_PACKAGE', 'ZIP central directory could not be read.');
  }

  const entryFail = validateEntries(cd, opts);
  if (entryFail) {
    return failure(entryFail.code, entryFail.message, entryFail.detail);
  }

  const mainEntry = cd.entries.find((e) => e.name === MAIN_PART);
  if (!mainEntry) {
    return failure('MISSING_MAIN_PART', `${MAIN_PART} not found in archive.`);
  }

  const xmlBytes = extractEntryBytes(bytes, mainEntry);
  if (!xmlBytes) {
    return failure('CORRUPT_PACKAGE', `Failed to decompress ${MAIN_PART}.`);
  }

  if (xmlBytes.length > opts.maxEntryBytes) {
    return failure('SECURITY_REJECTED', `Decompressed ${MAIN_PART} exceeds ${opts.maxEntryBytes}.`);
  }

  const scanFail = scanForForbiddenPatterns(xmlBytes);
  if (scanFail) {
    return failure(scanFail.code, scanFail.message, scanFail.detail);
  }

  const xmlText = strFromU8(xmlBytes, true);
  let parsed: ParsedTree;
  try {
    parsed = parseXml(xmlText);
  } catch (e) {
    return failure('INVALID_DOCX', `XML parse failed: ${(e as Error)?.message ?? 'unknown'}`);
  }

  const docRoot = parsed['w:document'] as ParsedTree | undefined;
  if (!docRoot) {
    return failure('INVALID_DOCX', 'Missing w:document root.');
  }
  const body = docRoot['w:body'] as ParsedTree | undefined;
  if (!body) {
    return failure('INVALID_DOCX', 'Missing w:body.');
  }

  const state: WalkerState = {
    segments: [],
    warnings: [],
    paragraphOrdinal: 0,
    runOrdinalInParagraph: 0,
    inDeleted: false,
    seenTrackedInsertion: false,
    seenTrackedDeletion: false,
    seenFootnoteRef: false,
    seenEndnoteRef: false,
    seenDrawing: false,
    seenObject: false,
  };

  walkBody(body, state);

  if (state.segments.length === 0) {
    return failure('EMPTY_DOCUMENT', 'No text segments produced.');
  }

  const { text: canonicalText, bytes: canonicalBytes } = assembleCanonical(state.segments);

  if (canonicalText.trim().length === 0) {
    return failure('EMPTY_DOCUMENT', 'Canonical text is empty after walking.');
  }

  const canonicalTextHash = fnv1a64Hex(canonicalText);

  return {
    success: true,
    segments: state.segments,
    canonicalText,
    canonicalTextHash,
    zipEntryCount: cd.entries.length,
    decompressedBytes: canonicalBytes,
    warnings: state.warnings,
  };
}
