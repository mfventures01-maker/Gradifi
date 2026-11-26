import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

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

async function recognizeImage(bytes: Uint8Array): Promise<{ text: string; confidence: number }> {
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
  const pdfjs = await import("npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
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

  if (typeof OffscreenCanvas === "undefined") throw new Error("PDF_OCR_CANVAS_UNAVAILABLE");
  const ocrPages: string[] = [];
  const confidences: number[] = [];
  const mod = await import("npm:tesseract.js@7.0.0");
  const worker = await mod.createWorker("eng");
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 40); pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PDF_OCR_CANVAS_CONTEXT_UNAVAILABLE");
      await page.render({ canvasContext: context, viewport } as any).promise;
      const blob = await canvas.convertToBlob({ type: "image/png" });
      const result = await worker.recognize(new Uint8Array(await blob.arrayBuffer()));
      const pageText = typeof result.data?.text === "string" ? result.data.text.trim() : "";
      if (pageText) ocrPages.push(pageText);
      if (Number.isFinite(result.data?.confidence)) confidences.push(result.data.confidence);
    }
  } finally {
    await worker.terminate();
  }
  const ocrText = normalizeExtractedText(ocrPages.join("\n\n"));
  if (ocrText.length < 10) throw new Error("OCR_NO_READABLE_TEXT");
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
  const copy = new Uint8Array(bytes.byteLength);\n  copy.set(bytes);\n  const digest = await crypto.subtle.digest("SHA-256", copy.buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}
