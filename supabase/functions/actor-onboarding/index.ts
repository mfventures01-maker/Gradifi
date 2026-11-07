import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) return json({ error: "SERVER_CONFIGURATION_ERROR" }, 500);

  const authHeader = req.headers.get("Authorization");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "login") {
      const identifier = String(body.login_id || "").trim();
      const pin = String(body.pin || "");
      const { data: verified, error } = await admin.rpc("auth_pin_login", { p_identifier: identifier, p_pin: pin });
      if (error || !verified?.success) return json({ error: "INVALID_CREDENTIALS" }, 401);

      const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", verified.user_id).single();
      const { data: authUser, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
      if (userError || !authUser.user?.email) return json({ error: "IDENTITY_NOT_READY" }, 409);

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.user.email,
      });
      if (linkError || !linkData?.properties?.hashed_token) return json({ error: "SESSION_EXCHANGE_FAILED" }, 500);

      return json({ success: true, token_hash: linkData.properties.hashed_token, type: "magiclink" });
    }

    if (!authHeader) return json({ error: "AUTH_REQUIRED" }, 401);
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: callerData, error: callerError } = await caller.auth.getUser();
    if (callerError || !callerData.user) return json({ error: "AUTH_REQUIRED" }, 401);

    const { data: actorRows, error: actorError } = await admin
      .from("identity_actors")
      .select("auth_user_id,institution_id,school_id,actor_type,status")
      .eq("auth_user_id", callerData.user.id)
      .eq("status", "active")
      .single();
    if (actorError || !actorRows || actorRows.actor_type !== "principal_admin") {
      return json({ error: "PRINCIPAL_AUTHORITY_REQUIRED" }, 403);
    }

    const actorType = String(body.actor_type || "");
    const allowed = ["vice_principal", "bursar", "teacher", "student", "parent"];
    if (!allowed.includes(actorType)) return json({ error: "INVALID_ACTOR_TYPE" }, 400);

    const institutionId = String(body.institution_id || actorRows.institution_id);
    const schoolId = body.school_id ? String(body.school_id) : actorRows.school_id;
    if (institutionId !== actorRows.institution_id) return json({ error: "CROSS_INSTITUTION_DENIED" }, 403);
    if (schoolId && actorRows.school_id && schoolId !== actorRows.school_id) {
      const { data: school } = await admin.from("schools").select("id").eq("id", schoolId).eq("institution_id", institutionId).maybeSingle();
      if (!school) return json({ error: "CROSS_SCHOOL_DENIED" }, 403);
    }

    const pinLength = ["student", "parent"].includes(actorType) ? 4 : 6;
    const pin = crypto.getRandomValues(new Uint32Array(1))[0] % (pinLength === 4 ? 9000 : 900000);
    const initialPin = String(pin + (pinLength === 4 ? 1000 : 100000));
    const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(48)), b => b.toString(16).padStart(2, "0")).join("");
    const loginIdPlaceholder = crypto.randomUUID();
    const internalEmail = `${loginIdPlaceholder}@accounts.sefaes.invalid`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { actor_type: actorType, institution_id: institutionId, school_id: schoolId },
    });
    if (createError || !created.user) return json({ error: createError?.message || "AUTH_USER_CREATE_FAILED" }, 400);

    const { data: result, error: provisionError } = await admin.rpc("complete_actor_onboarding", {
      p_auth_user_id: created.user.id,
      p_actor_type: actorType,
      p_school_id: schoolId,
      p_institution_id: institutionId,
      p_full_name: String(body.full_name || ""),
      p_pin: initialPin,
      p_email: body.email ? String(body.email) : null,
      p_phone: body.phone ? String(body.phone) : null,
      p_student_id: body.student_id || null,
      p_class_id: body.class_id || null,
      p_gender: body.gender || null,
      p_date_of_birth: body.date_of_birth || null,
      p_relationship: body.relationship || "Parent",
      p_is_primary: body.is_primary !== false,
    });

    if (provisionError || !result?.success) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: provisionError?.message || "ACTOR_PROVISIONING_FAILED" }, 400);
    }

    const syntheticEmail = `${result.login_id.toLowerCase()}@accounts.sefaes.invalid`;
    const { error: emailUpdateError } = await admin.auth.admin.updateUserById(created.user.id, { email: syntheticEmail, email_confirm: true });
    if (emailUpdateError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "AUTH_IDENTITY_FINALIZATION_FAILED" }, 500);
    }

    return json({ ...result, pin: initialPin });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "INTERNAL_ERROR" }, 500);
  }
});
