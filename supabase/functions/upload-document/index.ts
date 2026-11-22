import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

const allowedTypes = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function safeName(name: string) {
  const cleaned = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return cleaned || "document";
}

async function sha256(data: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply(503, { error: "server_configuration_missing" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { error: "authentication_required" });

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return reply(401, { error: "invalid_session" });
  const user = authData.user;

  let form: FormData;
  try { form = await req.formData(); } catch { return reply(400, { error: "multipart_form_required" }); }
  const file = form.get("file");
  const institutionRaw = form.get("institutionId");
  const institutionId = institutionRaw ? String(institutionRaw) : null;
  const workspaceRaw = form.get("workspaceId");
  const requestedWorkspaceId = workspaceRaw ? String(workspaceRaw) : null;
  const tenantRaw = form.get("tenantId");
  const tenantId = tenantRaw ? String(tenantRaw) : null;

  if (!(file instanceof File)) return reply(400, { error: "file_required" });
  if (institutionId && !/^[0-9a-f-]{36}$/i.test(institutionId)) return reply(400, { error: "invalid_institution_id" });
  if (requestedWorkspaceId && !/^[0-9a-f-]{36}$/i.test(requestedWorkspaceId)) return reply(400, { error: "invalid_workspace_id" });
  if (tenantId && !/^[0-9a-f-]{36}$/i.test(tenantId)) return reply(400, { error: "invalid_tenant_id" });
  if (institutionId && !requestedWorkspaceId) {
    // Backward-compatible institutional callers may omit workspaceId.
  } else if (!institutionId && !requestedWorkspaceId) {
    // Individual workspace is resolved from the authenticated owner, never from a caller-supplied owner id.
  }
  if (file.size < 1 || file.size > 20 * 1024 * 1024) return reply(413, { error: "file_size_out_of_range", maxBytes: 20971520 });

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const expectedType = ext === "pdf" ? "application/pdf" : ext === "txt" ? "text/plain" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "";
  const contentType = file.type || expectedType;
  if (!allowedTypes.has(contentType) || !expectedType || (file.type && file.type !== expectedType)) {
    return reply(415, { error: "unsupported_file_type", supported: ["pdf", "txt", "docx"] });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (contentType === "application/pdf" && new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return reply(415, { error: "invalid_pdf_signature" });
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !(bytes[0] === 0x50 && bytes[1] === 0x4b)) return reply(415, { error: "invalid_docx_package_signature" });
  if (contentType === "text/plain") {
    try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return reply(415, { error: "text_file_must_be_utf8" }); }
  }

  // The service-role client is intentionally confined to this trusted function.
  // Every ownership decision is derived from the verified JWT user above.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let workspace: { id: string; workspace_type: string; institution_id: string | null } | null = null;
  if (institutionId) {
    const { data: membership, error: membershipError } = await admin
      .from("institution_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError || !membership) return reply(403, { error: "active_institution_membership_required" });

    const { data, error } = await admin.from("workspaces")
      .select("id,workspace_type,institution_id")
      .eq("workspace_type", "institution")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .maybeSingle();
    if (error || !data) return reply(403, { error: "active_institution_workspace_required" });
    workspace = data;
    if (requestedWorkspaceId && requestedWorkspaceId !== workspace.id) {
      return reply(403, { error: "workspace_institution_mismatch" });
    }
  } else {
    if (tenantId) return reply(400, { error: "tenant_requires_institution_workspace" });
    let query = admin.from("workspaces")
      .select("id,workspace_type,institution_id")
      .eq("workspace_type", "individual")
      .eq("owner_user_id", user.id)
      .eq("status", "active");
    if (requestedWorkspaceId) query = query.eq("id", requestedWorkspaceId);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return reply(403, { error: "active_individual_workspace_required" });
    workspace = data;
  }

  if (!workspace) return reply(403, { error: "workspace_resolution_failed" });

  if (tenantId) {
    const { data: tenant, error: tenantError } = await admin.from("tenants")
      .select("id,institution_id").eq("id", tenantId).maybeSingle();
    if (tenantError || !tenant || tenant.institution_id !== institutionId) {
      return reply(403, { error: "tenant_institution_mismatch_or_unmapped" });
    }
  }

  const uploadId = crypto.randomUUID();
  // Keep the established institution-rooted path for compatibility. Individual
  // uploads are rooted at the owner-scoped workspace to preserve tenant isolation.
  const objectRoot = institutionId ?? workspace.id;
  const objectPath = `${objectRoot}/${user.id}/${uploadId}/${safeName(file.name)}`;
  const fileHash = await sha256(bytes);

  const { error: storageError } = await admin.storage.from("verify-private").upload(objectPath, bytes, {
    contentType,
    cacheControl: "0",
    upsert: false,
  });
  if (storageError) return reply(502, { error: "private_storage_upload_failed" });

  const { data: record, error: insertError } = await admin.from("verify_document_uploads").insert({
    id: uploadId,
    workspace_id: workspace.id,
    tenant_id: tenantId,
    institution_id: institutionId,
    owner_user_id: user.id,
    bucket_id: "verify-private",
    object_path: objectPath,
    original_filename: file.name.slice(0, 255),
    content_type: contentType,
    byte_size: bytes.byteLength,
    source_file_sha256: fileHash,
    extraction_status: "uploaded",
    canonicalization_status: "pending",
  }).select("id,workspace_id,institution_id,owner_user_id,object_path,content_type,byte_size,source_file_sha256,extraction_status,canonicalization_status,created_at").single();

  if (insertError || !record) {
    await admin.storage.from("verify-private").remove([objectPath]);
    return reply(500, { error: "upload_record_persistence_failed" });
  }

  return reply(201, { success: true, upload: record, next: "ocr_pipeline_pending" });
});
