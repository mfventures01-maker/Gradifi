import { spawnSync } from "node:child_process";

const runs = 10;
const runner = "./scratch/G2_INDEPENDENT/runner.ts";

const results: any[] = [];

for (let i = 1; i <= runs; i++) {
  const child = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", runner],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );

  const stdout = (child.stdout ?? "").trim();
  const stderr = (child.stderr ?? "").trim();

  let parsed: any = null;
  let parseError: string | null = null;

  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  results.push({
    run: i,
    exitCode: child.status,
    signal: child.signal,
    stdout,
    stderr,
    parsed,
    parseError
  });
}

console.log("=== G2 PART F NODE-LEVEL REPEATABILITY ===");

for (const r of results) {
  console.log(
    JSON.stringify({
      run: r.run,
      exitCode: r.exitCode,
      signal: r.signal,
      parsed: !!r.parsed,
      extractionSuccess: r.parsed?.extractionSuccess ?? null,
      canonicalReady: r.parsed?.canonicalReady ?? null,
      canonicalTextHash: r.parsed?.canonicalTextHash ?? null,
      documentId: r.parsed?.documentId ?? null,
      textLength: r.parsed?.textLength ?? null,
      wordCount: r.parsed?.wordCount ?? null,
      parseError: r.parseError
    })
  );
}

const valid = results.filter(
  r =>
    r.exitCode === 0 &&
    r.parsed?.extractionSuccess === true &&
    r.parsed?.canonicalReady === true &&
    typeof r.parsed?.canonicalTextHash === "string" &&
    typeof r.parsed?.documentId === "string" &&
    r.parsed?.error === null
);

const unique = (values: any[]) =>
  [...new Set(values.map(v => String(v)))];

const hashes = unique(
  valid.map(r => r.parsed.canonicalTextHash)
);

const ids = unique(
  valid.map(r => r.parsed.documentId)
);

const lengths = unique(
  valid.map(r => r.parsed.textLength)
);

const words = unique(
  valid.map(r => r.parsed.wordCount)
);

const rawHashes = unique(
  valid.map(r => r.parsed.rawBytesHash)
);

console.log("");
console.log("=== G2 PART F ASSERTIONS ===");
console.log(`TOTAL_RUNS=${runs}`);
console.log(`VALID_RUNS=${valid.length}`);
console.log(`DISTINCT_RAW_BYTES_HASHES=${rawHashes.length}`);
console.log(`DISTINCT_CANONICAL_TEXT_HASHES=${hashes.length}`);
console.log(`DISTINCT_DOCUMENT_IDS=${ids.length}`);
console.log(`DISTINCT_TEXT_LENGTHS=${lengths.length}`);
console.log(`DISTINCT_WORD_COUNTS=${words.length}`);

console.log(`RAW_BYTES_HASH=${rawHashes[0] ?? "NONE"}`);
console.log(`CANONICAL_TEXT_HASH=${hashes[0] ?? "NONE"}`);
console.log(`DOCUMENT_ID=${ids[0] ?? "NONE"}`);

const pass =
  valid.length === runs &&
  rawHashes.length === 1 &&
  hashes.length === 1 &&
  ids.length === 1 &&
  lengths.length === 1 &&
  words.length === 1;

console.log(`PART_F_RESULT=${pass ? "PASS" : "FAIL"}`);

if (!pass) {
  console.log("");
  console.log("=== FAILURE DIAGNOSTICS ===");

  for (const r of results) {
    if (
      r.exitCode !== 0 ||
      !r.parsed ||
      r.parsed.extractionSuccess !== true ||
      r.parsed.canonicalReady !== true
    ) {
      console.log(
        JSON.stringify({
          run: r.run,
          exitCode: r.exitCode,
          signal: r.signal,
          parseError: r.parseError,
          stdout: r.stdout,
          stderr: r.stderr
        }, null, 2)
      );
    }
  }

  process.exit(1);
}

process.exit(0);
