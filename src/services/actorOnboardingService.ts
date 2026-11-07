import { supabase } from "../lib/supabase";

export type ActorType = "vice_principal" | "bursar" | "teacher" | "student" | "parent" | "hod" | "adviser" | "lecturer";

export interface CreateActorInput {
  actor_type: ActorType;
  institution_id: string;
  school_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  student_id?: string | null;
  class_id?: string | null;
  class_subject_id?: string | null;
  class_subject_ids?: string[];
  gender?: string | null;
  date_of_birth?: string | null;
  relationship?: string;
  is_primary?: boolean;
  faculty_id?: string | null;
  department_id?: string | null;
  title?: string | null;
  rank?: string | null;
  specialization?: string | null;
  is_graduate_student_supervisor?: boolean;
  max_students?: number | null;
}

export interface CreateDeanInput {\n  institution_id: string;\n  faculty_id: string;\n  full_name: string;\n  email: string;\n  password: string;\n  phone?: string | null;\n}\n\nexport interface CreateDeanResult {\n  success: true;\n  user_id: string;\n  profile_id: string;\n  actor_type: "dean";\n  institution_id: string;\n  email: string;\n  full_name: string;\n  authentication_method: "email";\n}\n\nexport interface CreateActorResult {
  success: true;
  login_id: string;
  user_id: string;
  profile_id: string;
  actor_type: ActorType;
  institution_id: string;
  school_id: string | null;
  pin: string;
  pin_requires_change: true;
  full_name: string;
  email: string | null;
  phone: string | null;
  actor_record_id?: string | null;
  student_number?: string | null;
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
