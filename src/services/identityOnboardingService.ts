import { supabase } from "../lib/supabase";

export type OnboardableRole = "vice_principal" | "bursar" | "teacher" | "student" | "parent";
export interface ProvisionIdentityInput {
  role: OnboardableRole;
  full_name: string;
  institution_id: string;
  school_id?: string | null;
  email?: string | null;
  phone?: string | null;
  class_id?: string | null;
  gender?: "male" | "female" | null;
  date_of_birth?: string | null;
  student_number?: string | null;
  student_id?: string | null;
  relationship?: "father" | "mother" | "guardian";
}
export interface ProvisionIdentityResult {
  success: true;
  actor_id: string;
  profile_id: string;
  record_id: string | null;
  auth_user_id: string;
  login_id: string;
  role: OnboardableRole;
  temporary_pin: string;
  pin_requires_change: true;
}

export const identityOnboardingService = {
  async provision(input: ProvisionIdentityInput): Promise<ProvisionIdentityResult> {
    const { data, error } = await supabase.functions.invoke("identity-onboarding", {
      body: { action: "provision", ...input },
    });
    if (error) throw new Error(error.message || "Account provisioning failed");
    if (!data?.success || !data.login_id || !data.temporary_pin || !data.auth_user_id) {
      throw new Error(data?.error || "The server did not confirm account provisioning");
    }
    return data as ProvisionIdentityResult;
  },

  async login(identifier: string, pin: string) {
    const { data, error } = await supabase.functions.invoke("identity-onboarding", {
      body: { action: "login", identifier, pin },
    });
    if (error) throw new Error(error.message || "Login failed");
    if (!data?.success || !data.access_token || !data.refresh_token) {
      throw new Error(data?.error || "Authentication session was not established");
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) throw sessionError;
    return data;
  },
};
