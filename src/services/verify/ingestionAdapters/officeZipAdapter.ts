/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION OFFICE & ARCHIVE ADAPTER
 * Deterministically extracts XML content streams from DOCX, ODT, EPUB, PPTX, and XLSX packages.
 */

import { AdapterExtractionResult } from './pdfAdapter';

/**
 * Decompresses raw Deflate bytes synchronously (in Node) or via DecompressionStream (in Browser).
 */
async function decompressDeflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  // 1. Web Browser DecompressionStream API (Standard Web API)
  if (typeof DecompressionStream !== 'undefined' && typeof Response !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const input = new Blob([bytes]).stream();
      const output = input.pipeThrough(new DecompressionStream('deflate-raw'));
      const buffer = await new Response(output).arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      try {
        const input = new Blob([bytes]).stream();
        const output = input.pipeThrough(new DecompressionStream('deflate'));
        const buffer = await new Response(output).arrayBuffer();
        return new Uint8Array(buffer);
      } catch {}
    }
  }

  // 2. Node.js environment fallback
  try {
    const zlib = await import('node:zlib');
    const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return new Uint8Array(zlib.inflateRawSync(buf));
  } catch {
    try {
      const zlib = await import('node:zlib');
      const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return new Uint8Array(zlib.inflateSync(buf));
    } catch {
      return null;
    }
  }
}

/**
 * Extracts raw uncompressed text of a specified target file from a PKZIP archive (e.g., word/document.xml).
 */
export async function unzipPackageTextFile(zipInput: Uint8Array | ArrayBuffer, targetPath: string): Promise<string | null> {
  try {
    const zipBytes = zipInput instanceof Uint8Array ? zipInput : new Uint8Array(zipInput);
    if (zipBytes.length < 30) return null;

    let pos = 0;
    while (pos + 30 <= zipBytes.length) {
      if (zipBytes[pos] === 0x50 && zipBytes[pos + 1] === 0x4b && zipBytes[pos + 2] === 0x03 && zipBytes[pos + 3] === 0x04) {
        const compMethod = zipBytes[pos + 8] | (zipBytes[pos + 9] << 8);
        const compSize = zipBytes[pos + 18] | (zipBytes[pos + 19] << 8) | (zipBytes[pos + 20] << 16) | (zipBytes[pos + 21] << 24);
        const uncompSize = zipBytes[pos + 22] | (zipBytes[pos + 23] << 8) | (zipBytes[pos + 24] << 16) | (zipBytes[pos + 25] << 24);
        const nameLen = zipBytes[pos + 26] | (zipBytes[pos + 27] << 8);
        const extraLen = zipBytes[pos + 28] | (zipBytes[pos + 29] << 8);

        const nameBytes = zipBytes.subarray(pos + 30, pos + 30 + nameLen);
        const fileName = new TextDecoder('utf-8').decode(nameBytes).replace(/\\/g, '/');
        const dataStart = pos + 30 + nameLen + extraLen;

        const targetNorm = targetPath.toLowerCase().replace(/\\/g, '/');
        const fileNorm = fileName.toLowerCase();

        if (fileNorm === targetNorm || fileNorm.endsWith('/' + targetNorm)) {
          const payloadSize = compSize > 0 ? compSize : uncompSize;
          const compressedBytes = zipBytes.subarray(dataStart, dataStart + payloadSize);
          let decompressed: Uint8Array | null = null;

          if (compMethod === 0) {
            decompressed = compressedBytes;
          } else if (compMethod === 8) {
            decompressed = await decompressDeflate(compressedBytes);
          }

          if (decompressed) {
            return new TextDecoder('utf-8', { fatal: false }).decode(decompressed);
          }
        }

        pos = dataStart + (compSize > 0 ? compSize : uncompSize);
      } else {
        pos++;
      }
    }
  } catch (e) {
    console.warn('ZIP extraction failed:', e);
  }
  return null;
}

/**
 * Extracts plain text from XML elements in Office Open XML / OpenDocument streams.
 */
export function extractTextFromXmlElements(xmlContent: string, elementTagNames: string[]): string[] {
  const textNodes: string[] = [];
  
  for (const tag of elementTagNames) {
    const regex = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = regex.exec(xmlContent)) !== null) {
      const clean = match[1].replace(/<[^>]+>/g, '').trim();
      if (clean) {
        textNodes.push(clean);
      }
    }
  }

  return textNodes;
}

/**
 * Extracts DOCX document.xml or text payload.
 */
export async function extractDocxText(input: ArrayBuffer | Uint8Array | string): Promise<AdapterExtractionResult> {
  let xmlContent: string | null = null;

  if (typeof input !== 'string') {
    xmlContent = await unzipPackageTextFile(input, 'word/document.xml');
  } else if (input.trim().startsWith('<') || input.includes('<w:t')) {
    xmlContent = input;
  } else {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    xmlContent = await unzipPackageTextFile(bytes, 'word/document.xml');
  }

  if (!xmlContent) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'docx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['Could not extract word/document.xml from DOCX package.'],
      error: {
        code: 'INVALID_PACKAGE',
        message: 'The uploaded file is not a valid DOCX package.'
      }
    };
  }

  const nodes = extractTextFromXmlElements(xmlContent, ['w:t', 'w:p']);
  let text = nodes.join('\n').replace(/[ \t]+/g, ' ').trim();

  if (!text.trim()) {
    text = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (!text.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'docx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['DOCX file contains no extractable text.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The DOCX file contains no extractable text.'
      }
    };
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    pageCount: Math.max(1, Math.ceil(text.length / 2000)),
    extractionMethod: 'docx_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts ODT content.xml.
 */
export async function extractOdtText(input: ArrayBuffer | Uint8Array | string): Promise<AdapterExtractionResult> {
  let xmlContent: string | null = null;

  if (typeof input !== 'string') {
    xmlContent = await unzipPackageTextFile(input, 'content.xml');
  } else if (input.trim().startsWith('<') || input.includes('<text:p')) {
    xmlContent = input;
  } else {
    const encoder = new TextEncoder();
    xmlContent = await unzipPackageTextFile(encoder.encode(input), 'content.xml');
  }

  if (!xmlContent) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'odt_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['Could not extract content.xml from ODT package.'],
      error: {
        code: 'INVALID_PACKAGE',
        message: 'The uploaded file is not a valid ODT package.'
      }
    };
  }

  const nodes = extractTextFromXmlElements(xmlContent, ['text:p', 'text:h']);
  let text = nodes.join('\n').replace(/[ \t]+/g, ' ').trim();

  if (!text.trim()) {
    text = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    pageCount: Math.max(1, Math.ceil(text.length / 2000)),
    extractionMethod: 'odt_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts EPUB text content.
 */
export async function extractEpubText(input: ArrayBuffer | Uint8Array | string): Promise<AdapterExtractionResult> {
  let epubContent: string | null = null;

  if (typeof input !== 'string') {
    epubContent = await unzipPackageTextFile(input, 'content.opf');
    if (!epubContent) {
      epubContent = await unzipPackageTextFile(input, 'chapter1.xhtml');
    }
  } else {
    epubContent = input;
  }

  if (!epubContent) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'epub_xhtml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['EPUB file is empty or invalid package.'],
      error: {
        code: 'INVALID_PACKAGE',
        message: 'The uploaded EPUB file is empty or invalid.'
      }
    };
  }

  let text = epubContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|h[1-6]|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    chapterCount: 1,
    pageCount: Math.max(1, Math.ceil(text.length / 2000)),
    extractionMethod: 'epub_xhtml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts PPTX slides.
 */
export async function extractPptxText(input: ArrayBuffer | Uint8Array | string): Promise<AdapterExtractionResult> {
  let xmlContent: string | null = null;

  if (typeof input !== 'string') {
    xmlContent = await unzipPackageTextFile(input, 'ppt/slides/slide1.xml');
    if (!xmlContent) {
      xmlContent = await unzipPackageTextFile(input, 'ppt/presentation.xml');
    }
  } else if (input.trim().startsWith('<') || input.includes('<a:t')) {
    xmlContent = input;
  } else {
    const encoder = new TextEncoder();
    xmlContent = await unzipPackageTextFile(encoder.encode(input), 'ppt/slides/slide1.xml');
  }

  if (!xmlContent) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'pptx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['Could not extract slides from PPTX package.'],
      error: {
        code: 'INVALID_PACKAGE',
        message: 'The uploaded file is not a valid PPTX package.'
      }
    };
  }

  const nodes = extractTextFromXmlElements(xmlContent, ['a:t', 'p:txBody']);
  let text = nodes.join('\n').replace(/[ \t]+/g, ' ').trim();

  if (!text.trim()) {
    text = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    slideCount: 1,
    extractionMethod: 'pptx_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts XLSX worksheets.
 */
export async function extractXlsxText(input: ArrayBuffer | Uint8Array | string): Promise<AdapterExtractionResult> {
  let xmlContent: string | null = null;

  if (typeof input !== 'string') {
    xmlContent = await unzipPackageTextFile(input, 'xl/sharedStrings.xml');
    if (!xmlContent) {
      xmlContent = await unzipPackageTextFile(input, 'xl/worksheets/sheet1.xml');
    }
  } else if (input.trim().startsWith('<') || input.includes('<t>')) {
    xmlContent = input;
  } else {
    const encoder = new TextEncoder();
    xmlContent = await unzipPackageTextFile(encoder.encode(input), 'xl/sharedStrings.xml');
  }

  if (!xmlContent) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'xlsx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['Could not extract worksheets from XLSX package.'],
      error: {
        code: 'INVALID_PACKAGE',
        message: 'The uploaded file is not a valid XLSX package.'
      }
    };
  }

  const nodes = extractTextFromXmlElements(xmlContent, ['t', 'v']);
  let text = nodes.join(' ').replace(/\s+/g, ' ').trim();

  if (!text.trim()) {
    text = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    sheetCount: 1,
    extractionMethod: 'xlsx_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

