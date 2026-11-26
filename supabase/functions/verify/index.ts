import { createClient } from "npm:@supabase/supabase-js@2";
import {
  analyzeDocumentEvidence,
  extractSimilarityFindingsFromEvidenceMatches,
} from "../_shared/verify/deterministicEngine.ts";
import { computeHash } from "../_shared/verify/documentNormalizer.ts";
import { evaluatePlagiarismEvidence } from "../_shared/verify/plagiarismPolicy.ts";
import type { EvidenceMatch, SimilarityAnalysisResult } from "../_shared/verify/types.ts";
import { sha256Hex } from "../_shared/processing/extract.ts";

const ENGINE_VERSION = "G5-DETERMINISTIC-v1";
const POLICY_VERSION = "G3-POLICY-v1";
const PUBLIC_SCHEMA_VERSION = "SEFAES-PUBLIC-RECEIPT-v1";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const stopWords = new Set([
  "about","after","also","among","been","being","between","could","does","during","each",
  "from","have","into","more","most","other","over","such","than","that","their","there",
  "these","they","this","those","through","under","using","very","were","what","when",
  "where","which","while","with","would","your","study","research","paper","analysis",
]);

function buildSearchQuery(text: string): string {
  const counts = new Map<string, number>();
  for (const token of (text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])) {
    if (stopWords.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word]) => word)
    .join(" ");
}

function abstractFromInvertedIndex(index: Record<string, number[]> | null | undefined): string {
  if (!index || typeof index !== "object") return "";
  const positions: Array<string | undefined> = [];
  for (const [word, offsets] of Object.entries(index)) {
    if (!Array.isArray(offsets)) continue;
    for (const offset of offsets) {
      if (Number.isInteger(offset) && offset >= 0 && offset < 50000) positions[offset] = word;
    }
  }
  return positions.filter((word): word is string => Boolean(word)).join(" ").trim();
}

function htmlText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}

function openAlexMatches(payload: any, query: string): EvidenceMatch[] {
  const works = Array.isArray(payload?.results) ? payload.results : [];
  const retrievedAt = new Date().toISOString();
  return works.flatMap((work: any) => {
    const snippet = abstractFromInvertedIndex(work.abstract_inverted_index);
    const title = String(work.title ?? "").trim();
    const sourceId = String(work.id ?? "").trim();
    if (!sourceId || !title || snippet.length < 80) return [];
    const authors = Array.isArray(work.authorships)
      ? work.authorships.map((item: any) => String(item?.author?.display_name ?? "")).filter(Boolean).slice(0, 12)
      : [];
    const doi = typeof work.doi === "string" ? work.doi.replace(/^https?:\/\/doi\.org\//i, "") : undefined;
    return [{
      sourceId,
      title,
      authors,
      url: sourceId,
      doi,
      matchedText: "",
      originalSnippet: snippet,
      matchType: "lexical",
      matchPercentage: 0,
      relevanceScore: 0,
      provenance: {
        provider: "openalex",
        providerRecordId: sourceId,
        retrievedAt,
        sourceType: "academic_work",
        sourceUrl: sourceId,
        title,
        authors,
        doi,
        publishedYear: Number.isInteger(work.publication_year) ? work.publication_year : undefined,
        provenanceState: "PARTIAL",
        query,
      },
    } as EvidenceMatch];
  });
}

function crossrefMatches(payload: any, query: string): EvidenceMatch[] {
  const items = Array.isArray(payload?.message?.items) ? payload.message.items : [];
  const retrievedAt = new Date().toISOString();
  return items.flatMap((item: any) => {
    const title = Array.isArray(item.title) ? String(item.title[0] ?? "").trim() : "";
    const snippet = htmlText(item.abstract);
    const doi = typeof item.DOI === "string" ? item.DOI.trim() : "";
    if (!title || snippet.length < 80 || !doi) return [];
    const authors = Array.isArray(item.author)
      ? item.author.map((author: any) => [author.given, author.family].filter(Boolean).join(" ")).filter(Boolean).slice(0, 12)
      : [];
    const sourceUrl = String(item.URL || `https://doi.org/${doi}`);
    return [{
      sourceId: `crossref:${doi.toLowerCase()}`,
      title,
      authors,
      url: sourceUrl,
      doi,
      matchedText: "",
      originalSnippet: snippet,
      matchType: "lexical",
      matchPercentage: 0,
      relevanceScore: 0,
      provenance: {
        provider: "crossref",
        providerRecordId: doi,
        retrievedAt,
        sourceType: "academic_work",
        sourceUrl,
        title,
        authors,
        doi,
        publishedYear: Number.isInteger(item?.published?.["date-parts"]?.[0]?.[0])
          ? item.published["date-parts"][0][0] : undefined,
        provenanceState: "PARTIAL",
        query,
      },
    } as EvidenceMatch];
  });
}

async function providerRequest(url: string): Promise<{ ok: boolean; payload?: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "Gradifi-Verify/1.0 (academic evidence processing)" },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false };
    return { ok: true, payload: await response.json() };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply(500, { error: "server_configuration_missing" });

  const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { error: "authentication_required" });
  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return reply(401, { error: "invalid_session" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "json_body_required" }); }
  const uploadId = String(body.uploadId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return reply(400, { error: "invalid_upload_id" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: upload, error: uploadError } = await admin.from("verify_document_uploads")
    .select("id,workspace_id,institution_id,owner_user_id,bucket_id,canonical_object_path,extraction_status,canonicalization_status,extracted_text_sha256,canonical_document_hash,verification_run_id")
    .eq("id", uploadId).eq("owner_user_id", authData.user.id).maybeSingle();
  if (uploadError || !upload) return reply(404, { error: "owned_upload_not_found" });
  if (upload.extraction_status !== "extracted" || upload.canonicalization_status !== "completed" ||
      !upload.canonical_object_path) return reply(409, { error: "upload_must_be_extracted_before_verification" });

  const { data: workspace, error: workspaceError } = await admin.from("workspaces")
    .select("id,workspace_type,institution_id,owner_user_id,status")
    .eq("id", upload.workspace_id).eq("status", "active").maybeSingle();
  if (workspaceError || !workspace) return reply(403, { error: "active_workspace_required" });
  const { data: membership, error: membershipError } = await admin.from("workspace_members")
    .select("id").eq("workspace_id", upload.workspace_id)
    .eq("user_id", authData.user.id).eq("status", "active").maybeSingle();
  if (membershipError || !membership) return reply(403, { error: "active_workspace_membership_required" });

  if (workspace.workspace_type === "individual") {
    if (workspace.owner_user_id !== authData.user.id || upload.institution_id !== null || workspace.institution_id !== null) {
      return reply(403, { error: "individual_workspace_scope_mismatch" });
    }
  } else if (workspace.workspace_type === "institution") {
    if (!workspace.institution_id || upload.institution_id !== workspace.institution_id) {
      return reply(403, { error: "institution_workspace_scope_mismatch" });
    }
  } else {
    return reply(403, { error: "unsupported_workspace_type" });
  }

  const { data: canonicalBlob, error: canonicalError } = await admin.storage
    .from(upload.bucket_id).download(upload.canonical_object_path);
  if (canonicalError || !canonicalBlob) return reply(502, { error: "canonical_document_download_failed" });
  const rawText = await canonicalBlob.text();
  if (rawText.trim().length < 10) return reply(422, { error: "canonical_document_empty" });
  const canonicalHash = await sha256Hex(new TextEncoder().encode(rawText));
  if (canonicalHash !== upload.extracted_text_sha256 || canonicalHash !== upload.canonical_document_hash) {
    return reply(409, { error: "canonical_document_hash_mismatch" });
  }

  const startedAt = Date.now();
  const query = buildSearchQuery(rawText);
  if (query.length < 8) return reply(422, { error: "document_insufficient_for_source_discovery" });

  const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=5&select=id,doi,title,authorships,publication_year,abstract_inverted_index`;
  const crossrefUrl = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=5&select=DOI,title,author,abstract,published,URL`;
  const [openAlex, crossref] = await Promise.all([
    providerRequest(openAlexUrl),
    providerRequest(crossrefUrl),
  ]);
  if (!openAlex.ok && !crossref.ok) {
    return reply(502, { error: "SOURCE_DISCOVERY_UNAVAILABLE", retryable: true });
  }

  const candidateMatches = [
    ...(openAlex.ok ? openAlexMatches(openAlex.payload, query) : []),
    ...(crossref.ok ? crossrefMatches(crossref.payload, query) : []),
  ];
  const engineOutput = analyzeDocumentEvidence({
    documentText: rawText,
    candidateMatches,
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
  });
  const warnings: string[] = [];
  const findings = extractSimilarityFindingsFromEvidenceMatches(
    rawText,
    engineOutput.documentHash,
    engineOutput.verifiedMatches,
    engineOutput.aggregation,
    warnings,
  );
  const similarityAnalysis: SimilarityAnalysisResult = {
    analysisType: "DETERMINISTIC_SIMILARITY",
    sourceDocumentId: engineOutput.documentHash,
    overallSimilarity: engineOutput.overallSimilarity,
    findings,
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
    deterministic: true,
    warnings,
  };
  const plagiarismEvidence = evaluatePlagiarismEvidence(similarityAnalysis);
  const result = {
    documentHash: engineOutput.documentHash,
    evidenceHash: engineOutput.evidenceHash,
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
    overallSimilarity: engineOutput.overallSimilarity,
    totalSourcesFound: engineOutput.verifiedMatches.length,
    similarityAnalysis: {
      findings: similarityAnalysis.findings,
      overallSimilarity: similarityAnalysis.overallSimilarity,
      engineVersion: similarityAnalysis.engineVersion,
      policyVersion: similarityAnalysis.policyVersion,
      deterministic: true,
    },
    evidenceHashMaterial: {
      totalUniqueMatchedTokens: engineOutput.aggregation.totalUniqueMatchedTokens,
      sourceCoverage: engineOutput.aggregation.sourceReports.map(source => ({
        sourceId: source.sourceId,
        documentCoverage: source.documentCoverage,
      })),
    },
    plagiarismEvidence,
    providerDiscovery: {
      openalex: openAlex.ok ? "RESPONDED" : "UNAVAILABLE",
      crossref: crossref.ok ? "RESPONDED" : "UNAVAILABLE",
      candidateCount: candidateMatches.length,
    },
  };
  const envelope = {
    analysisId: `ANL-${engineOutput.documentHash.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
    documentId: engineOutput.documentHash,
    timestamp: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
    status: openAlex.ok && crossref.ok ? "VERIFIED" : "PARTIALLY_VERIFIED",
    deterministicResult: result,
    canonicalDocument: { rawText },
    processingTimeMs: Date.now() - startedAt,
    warnings,
  };

  const { data: serviceVersion, error: serviceVersionError } = await admin.from("service_versions")
    .select("id").eq("engine_version", ENGINE_VERSION).eq("policy_version", POLICY_VERSION)
    .eq("status", "active").maybeSingle();
  if (serviceVersionError || !serviceVersion) return reply(409, { error: "active_g5_service_version_not_found" });

  const { data: persisted, error: persistError } = await admin.rpc("persist_verification_run_and_receipt", {
    p_workspace_id: upload.workspace_id,
    p_created_by_user_id: authData.user.id,
    p_school_id: null,
    p_service_version_id: serviceVersion.id,
    p_source_upload_id: upload.id,
    p_result: result,
    p_raw_text: rawText,
    p_public_schema_version: PUBLIC_SCHEMA_VERSION,
    p_correction_of_verification_id: null,
  });
  if (persistError || !persisted?.record) {
    return reply(500, { error: "authoritative_verification_persistence_failed" });
  }

  const record = persisted.record;
  const { error: linkError } = await admin.from("verify_document_uploads")
    .update({ verification_run_id: record.verification_run_id, updated_at: new Date().toISOString() })
    .eq("id", upload.id).eq("owner_user_id", authData.user.id);
  if (linkError) return reply(500, { error: "verification_receipt_created_but_upload_link_failed", verificationId: record.verification_id });

  return reply(200, {
    success: true,
    status: persisted.status,
    receipt: record,
    result: {
      overallSimilarity: engineOutput.overallSimilarity,
      totalSourcesFound: engineOutput.verifiedMatches.length,
      findingCount: findings.length,
      plagiarismRisk: plagiarismEvidence.riskLevel,
      requiresHumanReview: plagiarismEvidence.requiresHumanReview,
      providerDiscovery: result.providerDiscovery,
    },
  });
});
