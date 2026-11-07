import { supabase } from "../lib/supabase";

export type ActorType = "vice_principal" | "bursar" | "teacher" | "student" | "parent";

export interface CreateActorInput {
  actor_type: ActorType;
  institution_id: string;
  school_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  student_id?: string | null;
  class_id?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  relationship?: string;
  is_primary?: boolean;
}

export interface CreateActorResult {
  success: true;
  login_id: string;
  user_id: string;
  profile_id: string;
  actor_type: ActorType;
  institution_id: string;
  school_id: string | null;
  pin: string;
  pin_requires_change: true;
}

export const actorOnboardingService = {
  async create(input: CreateActorInput): Promise<CreateActorResult> {
    const { data, error } = await supabase.functions.invoke("actor-onboarding", {
      body: { action: "create", ...input },
    });
    if (error) throw new Error(error.message || "Actor onboarding failed");
    if (!data?.success || !data.login_id || !data.user_id || !data.pin) {
      throw new Error(data?.error || "Onboarding returned an incomplete identity");
    }
    return data as CreateActorResult;
  },
};
