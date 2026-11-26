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
