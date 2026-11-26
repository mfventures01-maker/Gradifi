import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { extractDocxText, normalizeExtractedText } from "./extract.ts";

Deno.test("canonical extraction normalizes whitespace deterministically", () => {
  assertEquals(normalizeExtractedText("  Alpha   beta\r\n\r\n\r\nGamma  "), "Alpha beta\n\nGamma");
});

Deno.test("DOCX extraction reads the canonical document XML", async () => {
  const bytes = await Deno.readFile("tests/hoeos/g2/golden_test_001.docx");
  const text = extractDocxText(bytes);
  assert(text.length > 50);
  assertStringIncludes(text, "Gradifi Universal Ingestion Service");
});

Deno.test({
  name: "Tesseract worker executes against a real image fixture",
  timeout: 120_000,
  fn: async () => {
    const bytes = await Deno.readFile("certification/g5/G5_GRADE_MARKERS.png");
    const result = await (await import("./extract.ts")).recognizeImage(bytes);
    if (result.text.trim().length === 0 || result.confidence <= 0) {
      throw new Error("OCR fixture produced no readable text");
    }
  },
});

Deno.test({
  name: "scanned PDF invokes the production OCR fallback",
  timeout: 120_000,
  fn: async () => {
    const bytes = await Deno.readFile("tests/fixtures/ingestion/scanned_page_001.pdf");
    const result = await (await import("./extract.ts")).extractUploadedDocument(
      bytes, "application/pdf", "scanned_page_001.pdf",
    );
    if (result.method !== "pdf_ocr" || !result.ocrUsed || result.text.trim().length < 10) {
      throw new Error("Scanned PDF did not produce OCR text");
    }
  },
});

Deno.test({
  name: "inspect scanned PDF embedded image objects for OCR raster source",
  timeout: 30_000,
  fn: async () => {
    const pdfjs: any = await import("npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
    const bytes = await Deno.readFile("tests/fixtures/ingestion/scanned_page_001.pdf");
    const pdf = await pdfjs.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false }).promise;
    const page = await pdf.getPage(1);
    const ops = await page.getOperatorList();
    const imageOps = ops.fnArray.map((fn: number, index: number) => ({ fn, args: ops.argsArray[index] }))
      .filter((entry: any) => entry.fn === pdfjs.OPS.paintImageXObject || entry.fn === pdfjs.OPS.paintInlineImageXObject);
    console.log("SCANNED_PDF_IMAGE_OPS", JSON.stringify(imageOps.slice(0, 5)));
    for (const op of imageOps.slice(0, 3)) {
      const imageId = op.args?.[0];
      if (typeof imageId !== "string") continue;
      const image: any = await new Promise(resolve => page.objs.get(imageId, resolve));
      console.log("SCANNED_PDF_IMAGE_OBJECT", JSON.stringify({
        keys: Object.keys(image ?? {}),
        width: image?.width,
        height: image?.height,
        kind: image?.kind,
        dataLength: image?.data?.length,
        dataType: image?.data?.constructor?.name,
        bitmapWidth: image?.bitmap?.width,
        bitmapHeight: image?.bitmap?.height,
      }));
    }
  },
});
