import { createClient } from "npm:@supabase/supabase-js@2";
import { extractUploadedDocument, sha256Hex } from "../_shared/processing/extract.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

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
    .select("id,workspace_id,institution_id,owner_user_id,bucket_id,object_path,content_type,byte_size,source_file_sha256,extraction_status,canonicalization_status,canonical_object_path,extracted_text_sha256,canonical_document_hash,extraction_method,ocr_used,ocr_confidence")
    .eq("id", uploadId).eq("owner_user_id", authData.user.id).maybeSingle();
  if (uploadError || !upload) return reply(404, { error: "owned_upload_not_found" });

  if (upload.extraction_status === "extracted" &&
      upload.canonicalization_status === "completed" &&
      upload.canonical_object_path) {
    return reply(200, {
      success: true,
      status: "ALREADY_EXTRACTED",
      uploadId,
      canonicalDocumentHash: upload.canonical_document_hash,
      extractionMethod: upload.extraction_method,
      ocrUsed: upload.ocr_used,
      ocrConfidence: upload.ocr_confidence,
    });
  }

  const { data: workspace, error: workspaceError } = await admin.from("workspaces")
    .select("id,workspace_type,institution_id,owner_user_id,status")
    .eq("id", upload.workspace_id).eq("status", "active").maybeSingle();
  if (workspaceError || !workspace) return reply(403, { error: "active_workspace_required" });

  const { data: membership, error: membershipError } = await admin.from("workspace_members")
    .select("id").eq("workspace_id", upload.workspace_id)
    .eq("user_id", authData.user.id).eq("status", "active").maybeSingle();
  if (membershipError || !membership) return reply(403, { error: "active_workspace_membership_required" });

  if (workspace.workspace_type === "individual") {
    if (workspace.owner_user_id !== authData.user.id || upload.institution_id !== null) {
      return reply(403, { error: "individual_workspace_scope_mismatch" });
    }
  } else if (workspace.workspace_type === "institution") {
    if (!workspace.institution_id || upload.institution_id !== workspace.institution_id) {
      return reply(403, { error: "institution_workspace_scope_mismatch" });
    }
  } else {
    return reply(403, { error: "unsupported_workspace_type" });
  }

  await admin.from("verify_document_uploads").update({
    extraction_status: "extracting",
    error_code: null,
    updated_at: new Date().toISOString(),
  }).eq("id", uploadId).eq("owner_user_id", authData.user.id);

  const { data: fileBlob, error: downloadError } = await admin.storage
    .from(upload.bucket_id).download(upload.object_path);
  if (downloadError || !fileBlob) {
    await admin.from("verify_document_uploads").update({
      extraction_status: "failed", canonicalization_status: "failed",
      error_code: "SOURCE_FILE_DOWNLOAD_FAILED", updated_at: new Date().toISOString(),
    }).eq("id", uploadId);
    return reply(502, { error: "source_file_download_failed" });
  }

  try {
    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    if (bytes.byteLength !== Number(upload.byte_size) ||
        await sha256Hex(bytes) !== upload.source_file_sha256) {
      throw new Error("SOURCE_FILE_INTEGRITY_MISMATCH");
    }

    const extracted = await extractUploadedDocument(bytes, upload.content_type, upload.original_filename);
    const textBytes = new TextEncoder().encode(extracted.text);
    const textHash = await sha256Hex(textBytes);
    const canonicalPath = `${upload.workspace_id}/${upload.owner_user_id}/${upload.id}/canonical.txt`;

    const { error: canonicalUploadError } = await admin.storage.from("verify-private").upload(
      canonicalPath,
      textBytes,
      { contentType: "text/plain; charset=utf-8", cacheControl: "0", upsert: true },
    );
    if (canonicalUploadError) throw new Error("CANONICAL_TEXT_STORAGE_FAILED");

    const { error: updateError } = await admin.from("verify_document_uploads").update({
      canonical_object_path: canonicalPath,
      extracted_text_sha256: textHash,
      canonical_document_hash: textHash,
      extraction_method: extracted.method,
      ocr_used: extracted.ocrUsed,
      ocr_confidence: extracted.ocrConfidence,
      extraction_status: "extracted",
      canonicalization_status: "completed",
      canonicalization_version: "SEFAES-CANONICAL-TEXT-v1",
      error_code: null,
      updated_at: new Date().toISOString(),
    }).eq("id", uploadId).eq("owner_user_id", authData.user.id);
    if (updateError) throw new Error("CANONICAL_METADATA_PERSIST_FAILED");

    return reply(200, {
      success: true,
      status: "EXTRACTED",
      uploadId,
      canonicalDocumentHash: textHash,
      extractedCharacterCount: extracted.text.length,
      extractedWordCount: extracted.text.split(/\s+/).filter(Boolean).length,
      extractionMethod: extracted.method,
      ocrUsed: extracted.ocrUsed,
      ocrConfidence: extracted.ocrConfidence,
      pageCount: extracted.pageCount,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "EXTRACTION_FAILED";
    const allowed = [
      "SOURCE_FILE_INTEGRITY_MISMATCH", "INVALID_DOCX_PACKAGE", "DOCX_UNCOMPRESSED_SIZE_LIMIT",
      "DOCX_DOCUMENT_XML_MISSING", "DOCX_NO_EXTRACTABLE_TEXT", "EMPTY_DOCUMENT",
      "PDF_OCR_CANVAS_UNAVAILABLE", "PDF_OCR_CANVAS_CONTEXT_UNAVAILABLE", "OCR_NO_READABLE_TEXT",
      "UNSUPPORTED_UPLOAD_CONTENT_TYPE", "CANONICAL_TEXT_STORAGE_FAILED", "CANONICAL_METADATA_PERSIST_FAILED",
    ];
    const errorCode = allowed.includes(raw) ? raw : "DOCUMENT_EXTRACTION_FAILED";
    await admin.from("verify_document_uploads").update({
      extraction_status: "failed",
      canonicalization_status: "failed",
      error_code: errorCode,
      updated_at: new Date().toISOString(),
    }).eq("id", uploadId).eq("owner_user_id", authData.user.id);
    const status = errorCode === "PDF_OCR_CANVAS_UNAVAILABLE" ||
      errorCode === "PDF_OCR_CANVAS_CONTEXT_UNAVAILABLE" ? 422 : 422;
    return reply(status, { error: errorCode, retryable: false });
  }
});
