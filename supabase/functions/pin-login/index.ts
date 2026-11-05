/**
 * SUPABASE EDGE FUNCTION: PIN-LOGIN (Authentication Bridge)
 * Canonical SSoT Bridge converting PIN credential lookups into authentic Supabase Auth sessions.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";\n    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Supabase environment configuration missing in Edge Function runtime.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const { identifier, pin } = body;

    if (!pin) {
      return new Response(
        JSON.stringify({ error: "Missing required credential: pin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Call canonical auth_pin_login RPC
    const { data: authData, error: rpcError } = await supabaseAdmin.rpc("auth_pin_login", {
      p_identifier: identifier || "",
      p_pin: pin,
      pin: pin,
      institution_slug: identifier || "",
    });

    if (rpcError || !authData) {
      return new Response(
        JSON.stringify({ 
          error: rpcError?.message || "Invalid PIN or identifier.", 
          code: "AUTH_PIN_INVALID" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileId = authData.profile_id || authData.user_id;
    const institutionId = authData.institution_id;
    const role = authData.role || "student";
    const schoolId = authData.school_id || null;

    let targetEmail = "";

    // Step 2: Resolve user profile & associated auth.users record
    if (profileId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, user_id")
        .eq("id", profileId)
        .maybeSingle();

      if (profile?.email) {
        targetEmail = profile.email;
      } else if (profile?.user_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        if (userData?.user?.email) {
          targetEmail = userData.user.email;
        }
      }
    }

    if (!targetEmail) {
      return new Response(JSON.stringify({ success: false, error: "No verified authentication email is associated with this account." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      throw new Error(linkError?.message || "Could not generate a one-time authentication token.");
    }

    const sessionClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: verified, error: verifyError } = await sessionClient.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });
    if (verifyError || !verified.session) {
      throw new Error(verifyError?.message || "PIN session exchange failed.");
    }

    return new Response(JSON.stringify({
      success: true,
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
      user_id: verified.user?.id || profileId,
      profile_id: profileId,
      institution_id: institutionId,
      school_id: schoolId,
      role,
      user: { id: verified.user?.id || profileId, email: targetEmail, role, institution_id: institutionId },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error during PIN auth exchange." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
