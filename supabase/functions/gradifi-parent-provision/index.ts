import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

function response(status: number, body: Record<string, unknown>, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

function securePin(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(1000 + (bytes[0] % 9000));
}

serve(async (req: Request) => {
  const appOrigin = (Deno.env.get("APP_URL") || "").replace(/\/+$/, "");
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOrigin = appOrigin && requestOrigin === appOrigin ? appOrigin : "";
  if (req.method === "OPTIONS") {
    if (!allowedOrigin) return new Response("Origin not allowed", { status: 403 });
    return new Response("ok", { headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    }});
  }
  if (req.method !== "POST") return response(405, { success: false, error: "Method not allowed" }, allowedOrigin || "null");
  if (!allowedOrigin) return response(403, { success: false, error: "Origin is not authorized." }, "null");

  let createdUserId: string | null = null;
  let createdNewUser = false;
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !anonKey || !serviceKey) throw new Error("Server configuration is incomplete.");

    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return response(401, { success: false, error: "Authenticated principal session required." }, allowedOrigin);
    }
    const principalClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: principal, error: principalError } = await principalClient.auth.getUser();
    if (principalError || !principal.user) {
      return response(401, { success: false, error: "Principal session is invalid." }, allowedOrigin);
    }

    const body = await req.json();
    const studentId = String(body.student_id || "");
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const relationship = String(body.relationship || "guardian").toLowerCase();
    const isPrimary = body.is_primary !== false;
    if (!/^[0-9a-f-]{36}$/i.test(studentId) || name.length < 2 || phone.length < 7 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !["father","mother","guardian","other"].includes(relationship)) {
      return response(400, { success: false, error: "A valid student, parent name, phone, email and relationship are required." }, allowedOrigin);
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw new Error(listError.message);
    const existingUser = users.users.find((user) => user.email?.toLowerCase() === email);
    let parentUserId: string;
    if (existingUser) {
      parentUserId = existingUser.id;
    } else {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name, invited_role: "parent" },
        redirectTo: `${appOrigin}/login`,
      });
      if (inviteError || !invited.user) throw new Error(inviteError?.message || "Could not create parent authentication identity.");
      parentUserId = invited.user.id;
      createdUserId = parentUserId;
      createdNewUser = true;
    }

    const pin = securePin();
    const { data, error } = await principalClient.rpc("gradifi_create_parent_profile", {
      p_user_id: parentUserId,
      p_student_id: studentId,
      p_parent_name: name,
      p_parent_phone: phone,
      p_parent_email: email,
      p_relationship: relationship,
      p_is_primary: isPrimary,
      p_pin: pin,
    });
    if (error) throw new Error(error.message);
    if (!data || data.success !== true || !data.profile_id || !data.parent_id) {
      throw new Error(data?.error || "Parent profile and relationship persistence was not confirmed.");
    }

    return response(200, {
      success: true,
      parent_id: data.parent_id,
      profile_id: data.profile_id,
      user_id: parentUserId,
      parent_name: data.parent_name,
      phone: data.phone,
      email: data.email,
      student_id: data.student_id,
      pin,
      is_existing: data.is_existing === true,
    }, allowedOrigin);
  } catch (error) {
    if (createdNewUser && createdUserId) {
      const url = Deno.env.get("SUPABASE_URL") || "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (url && serviceKey) {
        const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
        await admin.auth.admin.deleteUser(createdUserId);
      }
    }
    return response(400, { success: false, error: error instanceof Error ? error.message : "Parent provisioning failed." }, allowedOrigin || "null");
  }
});
