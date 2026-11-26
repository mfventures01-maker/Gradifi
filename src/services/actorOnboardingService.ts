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

export interface CreateActorProvisioning {
  job_id: string;
  status: "active";
  recovered: boolean;
}

export interface CreateActorResult {
  success: true;
  login_id: string;
  user_id: string;
  profile_id: string;
  actor_type: ActorType;
  institution_id?: string;
  school_id?: string | null;
  pin: string | null;
  pin_not_reissued: boolean;
  provisioning: CreateActorProvisioning;
  pin_requires_change?: true;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  authority_user_id?: string;
  actor_record_id?: string | null;
  student_number?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const invalidIdentity = (message?: unknown): Error =>
  new Error(isNonEmptyString(message) ? message : "Onboarding returned an incomplete identity");

const validateCreateActorResult = (data: unknown): CreateActorResult => {
  if (!isRecord(data) || data.success !== true) {
    throw invalidIdentity(data && isRecord(data) ? data.error : undefined);
  }

  if (
    !isNonEmptyString(data.login_id) ||
    !isNonEmptyString(data.user_id) ||
    !isNonEmptyString(data.profile_id) ||
    !isNonEmptyString(data.full_name) ||
    typeof data.actor_type !== "string"
  ) {
    throw invalidIdentity(data.error);
  }

  const provisioning = data.provisioning;
  if (
    !isRecord(provisioning) ||
    !isNonEmptyString(provisioning.job_id) ||
    provisioning.status !== "active" ||
    typeof provisioning.recovered !== "boolean" ||
    typeof data.pin_not_reissued !== "boolean"
  ) {
    throw invalidIdentity(data.error);
  }

  const recovered = provisioning.recovered === true;
  if (recovered) {
    if (data.pin !== null || data.pin_not_reissued !== true) {
      throw invalidIdentity(data.error);
    }
  } else if (
    !isNonEmptyString(data.pin) ||
    data.pin_not_reissued !== false
  ) {
    throw invalidIdentity(data.error);
  }

  return data as unknown as CreateActorResult;
};

export const actorOnboardingService = {
  async create(input: CreateActorInput): Promise<CreateActorResult> {
    const { data, error } = await supabase.functions.invoke("actor-onboarding", {
      body: { ...input },
    });
    if (error) {
      let message = error.message || "Actor onboarding failed";
      const response = (error as any).context;
      if (response && typeof response.clone === "function") {
        try {
          const payload = await response.clone().json();
          if (typeof payload?.error === "string" && payload.error) message = payload.error;
        } catch {
          // Preserve the original Supabase error when the response is not JSON.
        }
      }
      throw new Error(message);
    }

    return validateCreateActorResult(data);
  },
};
