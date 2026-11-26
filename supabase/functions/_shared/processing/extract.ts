import { unzipSync, strFromU8, zlibSync } from "npm:fflate@0.8.2";

export type ExtractionResult = {
  text: string;
  method: "txt_utf8" | "docx_xml" | "pdf_text_layer" | "pdf_ocr" | "image_ocr";
  ocrUsed: boolean;
  ocrConfidence: number | null;
  pageCount: number | null;
};

const decodeXml = (value: string) => value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  const key = String(code).toLowerCase();
  if (key in named) return named[key];
  const n = key.startsWith("#x") ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
  try { return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : entity; }
  catch { return entity; }
});



const PNG_CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let value = n;
  for (let k = 0; k < 8; k++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  PNG_CRC_TABLE[n] = value >>> 0;
}
function pngCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ PNG_CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU32(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}
function joinBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}
function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const output = new Uint8Array(12 + data.length);
  writeU32(output, 0, data.length);
  output.set(typeBytes, 4);
  output.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes);
  crcInput.set(data, typeBytes.length);
  writeU32(output, 8 + data.length, pngCrc32(crcInput));
  return output;
}
function pdfImageToPng(image: any): Uint8Array | null {
  const width = Number(image?.width);
  const height = Number(image?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width * height > 30_000_000 || !(image.data instanceof Uint8Array)) return null;
  let pixels = image.data as Uint8Array;
  let channels = image.kind === 2 ? 3 : image.kind === 3 ? 4 : image.kind === 1 ? 1 : 0;
  if (!channels) return null;
  if (image.kind === 1 && pixels.length === Math.ceil(width * height / 8)) {
    const unpacked = new Uint8Array(width * height);
    for (let i = 0; i < unpacked.length; i++) {
      const bit = (pixels[i >> 3] >> (7 - (i & 7))) & 1;
      unpacked[i] = bit ? 255 : 0;
    }
    pixels = unpacked;
  }
  if (pixels.length !== width * height * channels) return null;

  const rowBytes = width * channels;
  const scanlines = new Uint8Array(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    scanlines[rowOffset] = 0;
    scanlines.set(pixels.subarray(y * rowBytes, (y + 1) * rowBytes), rowOffset + 1);
  }
  const ihdr = new Uint8Array(13);
  writeU32(ihdr, 0, width);
  writeU32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return joinBytes([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlibSync(scanlines, { level: 6 })),
    pngChunk("IEND", new Uint8Array()),
  ]);
}
async function resolvePdfImage(page: any, imageId: string): Promise<any> {
  return await new Promise((resolve, reject) => {
    try {
      const value = page.objs.get(imageId, resolve);
      if (value) resolve(value);
    } catch (error) { reject(error); }
  });
}

export function normalizeExtractedText(value: string): string {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractDocxText(bytes: Uint8Array): string {
  if (bytes.length < 30 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("INVALID_DOCX_PACKAGE");
  const files = unzipSync(bytes);
  let total = 0;
  for (const value of Object.values(files)) {
    total += value.byteLength;
    if (total > 100 * 1024 * 1024) throw new Error("DOCX_UNCOMPRESSED_SIZE_LIMIT");
  }
  const key = Object.keys(files).find(name => name.toLowerCase().replace(/\\/g, "/") === "word/document.xml");
  if (!key) throw new Error("DOCX_DOCUMENT_XML_MISSING");
  const xml = strFromU8(files[key]);
  const paragraphs: string[] = [];
  const paragraphRe = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/gi;
  let paragraph: RegExpExecArray | null;
  while ((paragraph = paragraphRe.exec(xml)) !== null) {
    const runs: string[] = [];
    const textRe = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi;
    let run: RegExpExecArray | null;
    while ((run = textRe.exec(paragraph[1])) !== null) runs.push(decodeXml(run[1].replace(/<[^>]+>/g, "")));
    if (runs.join("").trim()) paragraphs.push(runs.join(""));
  }
  return normalizeExtractedText(paragraphs.join("\n"));
}

export async function recognizeImage(bytes: Uint8Array): Promise<{ text: string; confidence: number }> {
  const mod = await import("npm:tesseract.js@7.0.0");
  const worker = await mod.createWorker("eng");
  try {
    const result = await worker.recognize(bytes);
    return {
      text: typeof result.data?.text === "string" ? result.data.text : "",
      confidence: Number.isFinite(result.data?.confidence)
        ? Math.max(0, Math.min(100, result.data.confidence))
        : 0,
    };
  } finally {
    await worker.terminate();
  }
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractionResult> {
  const pdfjs: any = await import("npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false });
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => typeof item.str === "string" ? item.str : "").filter(Boolean).join(" ");
    if (text.trim()) pages.push(text.trim());
  }
  const textLayer = normalizeExtractedText(pages.join("\n\n"));
  if (textLayer.length >= 10) {
    return { text: textLayer, method: "pdf_text_layer", ocrUsed: false, ocrConfidence: null, pageCount: pdf.numPages };
  }

  const mod = await import("npm:tesseract.js@7.0.0");
  const worker = await mod.createWorker("eng");
  const ocrPages: string[] = [];
  const confidences: number[] = [];
  let processedImages = 0;
  let totalPixels = 0;
  const seenImages = new Set<string>();
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 40); pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const ops = await page.getOperatorList();
      for (let index = 0; index < ops.fnArray.length; index++) {
        const fn = ops.fnArray[index];
        if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintInlineImageXObject) continue;
        const args = ops.argsArray[index] ?? [];
        const imageId = args[0];
        let image: any = null;
        if (typeof imageId === "string") {
          if (seenImages.has(imageId)) continue;
          seenImages.add(imageId);
          image = await resolvePdfImage(page, imageId);
        } else if (imageId && typeof imageId === "object") {
          image = imageId;
        }
        if (!image) continue;
        const width = Number(image.width);
        const height = Number(image.height);
        if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
        totalPixels += width * height;
        if (totalPixels > 60_000_000) throw new Error("PDF_OCR_PIXEL_BUDGET_EXCEEDED");
        const png = pdfImageToPng(image);
        if (!png) continue;
        const result = await worker.recognize(png);
        const pageText = typeof result.data?.text === "string" ? result.data.text.trim() : "";
        if (pageText) ocrPages.push(pageText);
        if (Number.isFinite(result.data?.confidence)) confidences.push(result.data.confidence);
        processedImages++;
        if (processedImages >= 20) break;
      }
      if (processedImages >= 20) break;
    }
  } finally {
    await worker.terminate();
  }

  const ocrText = normalizeExtractedText(ocrPages.join("\n\n"));
  if (processedImages === 0 || ocrText.length < 10) throw new Error("OCR_NO_READABLE_TEXT");
  const confidence = confidences.length ? confidences.reduce((sum, n) => sum + n, 0) / confidences.length : 0;
  return { text: ocrText, method: "pdf_ocr", ocrUsed: true, ocrConfidence: confidence, pageCount: pdf.numPages };
}

export async function extractUploadedDocument(
  bytes: Uint8Array,
  contentType: string,
  filename: string,
): Promise<ExtractionResult> {
  if (contentType === "text/plain") {
    const text = normalizeExtractedText(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (text.length < 10) throw new Error("EMPTY_DOCUMENT");
    return { text, method: "txt_utf8", ocrUsed: false, ocrConfidence: null, pageCount: null };
  }
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const text = extractDocxText(bytes);
    if (text.length < 10) throw new Error("DOCX_NO_EXTRACTABLE_TEXT");
    return { text, method: "docx_xml", ocrUsed: false, ocrConfidence: null, pageCount: null };
  }
  if (contentType === "application/pdf") return await extractPdf(bytes);
  if (contentType === "image/jpeg" || contentType === "image/png") {
    const result = await recognizeImage(bytes);
    const text = normalizeExtractedText(result.text);
    if (text.length < 10) throw new Error("OCR_NO_READABLE_TEXT");
    return { text, method: "image_ocr", ocrUsed: true, ocrConfidence: result.confidence, pageCount: 1 };
  }
  throw new Error("UNSUPPORTED_UPLOAD_CONTENT_TYPE");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}
