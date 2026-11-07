import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const publicAuth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function pinFor(role: string) {
  const length = role === "student" || role === "parent" ? 4 : 6;
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  const min = 10 ** (length - 1);
  return String(min + (bytes[0] % (9 * min)));
}
function internalEmail() {
  return `${crypto.randomUUID()}@identity.sefaes.invalid`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const action = String(body.action ?? "");
    if (action === "login") {
      const identifier = String(body.identifier ?? "").trim().toUpperCase();
      const pin = String(body.pin ?? "");
      if (!/^(VP|BUR|TCH|STU|PAR)-[A-F0-9]{4}-[0-9]{6}$/.test(identifier)) return json({ error: "Invalid login ID or PIN" }, 401);
      if (!/^\d{4,6}$/.test(pin)) return json({ error: "Invalid login ID or PIN" }, 401);
      const { data: checked, error: checkError } = await admin.rpc("auth_pin_login", { p_identifier: identifier, p_pin: pin });
      if (checkError || !checked?.success) return json({ error: checked?.error ?? "Invalid login ID or PIN" }, 401);
      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(checked.auth_user_id);
      if (userError || !userResult.user?.email) return json({ error: "Account identity is unavailable" }, 401);
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: userResult.user.email });
      const tokenHash = link?.properties?.hashed_token;
      if (linkError || !tokenHash) return json({ error: "Could not establish an authentication session" }, 503);
      const { data: verified, error: verifyError } = await publicAuth.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (verifyError || !verified.session) return json({ error: "Could not establish an authentication session" }, 503);
      return json({
        success: true,
        access_token: verified.session.access_token,
        refresh_token: verified.session.refresh_token,
        user: verified.user,
        role: checked.role,
        profile_id: checked.profile_id,
        institution_id: checked.institution_id,
        school_id: checked.school_id,
        requires_change: checked.requires_change,
      });
    }

    if (action !== "provision") return json({ error: "Unsupported action" }, 400);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) return json({ error: "Authentication required" }, 401);

    const { data: principal, error: principalError } = await admin.from("profiles")
      .select("user_id,institution_id,school_id,role")
      .eq("user_id", callerData.user.id).maybeSingle();
    if (principalError || !principal || principal.role !== "principal_admin") return json({ error: "Principal authorization required" }, 403);

    const role = String(body.role ?? "");
    if (!["vice_principal", "bursar", "teacher", "student", "parent"].includes(role)) return json({ error: "Unsupported account role" }, 400);
    const institutionId = String(body.institution_id ?? principal.institution_id ?? "");
    const schoolId = body.school_id ? String(body.school_id) : principal.school_id;
    if (!institutionId || institutionId !== principal.institution_id || (principal.school_id && schoolId !== principal.school_id)) return json({ error: "Institution or school scope mismatch" }, 403);
    if (!body.full_name || !String(body.full_name).trim()) return json({ error: "Full name is required" }, 400);

    const pin = pinFor(role);
    const email = internalEmail();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true,
      app_metadata: { account_type: role, institution_id: institutionId, school_id: schoolId, created_by: callerData.user.id },
    });
    if (createError || !created.user) return json({ error: createError?.message ?? "Auth identity creation failed" }, 400);

    const { data: provisioned, error: provisionError } = await admin.rpc("provision_identity_actor", {
      p_auth_user_id: created.user.id,
      p_institution_id: institutionId,
      p_school_id: schoolId,
      p_actor_type: role,
      p_full_name: String(body.full_name).trim(),
      p_pin: pin,
      p_email: body.email ? String(body.email).trim() : null,
      p_phone: body.phone ? String(body.phone).trim() : null,
      p_class_id: body.class_id || null,
      p_gender: body.gender || null,
      p_date_of_birth: body.date_of_birth || null,
      p_student_number: body.student_number || null,
      p_student_id: body.student_id || null,
      p_relationship: body.relationship || "guardian",
    });
    if (provisionError || !provisioned?.success) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: provisionError?.message ?? "Database provisioning failed" }, 409);
    }
    return json({ ...provisioned, temporary_pin: pin }, 201);
  } catch (error) {
    console.error("identity-onboarding failure", error);
    return json({ error: "Identity onboarding failed" }, 500);
  }
});
