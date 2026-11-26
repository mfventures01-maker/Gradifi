import { supabase } from "../lib/supabase";

export type PublicIndividualAccountType =
  | "freelancer"
  | "independent_student"
  | "independent_professional"
  | "other_individual";

export interface BootstrapPublicIndividualResult {
  success: true;
  user_id: string;
  profile_id: string;
  actor_id: string;
  workspace_id: string;
  membership_id: string;
  individual_account_id: string;
  role: "individual";
  account_type: PublicIndividualAccountType;
  institution_id: null;
  school_id: null;
}

export interface CompletePublicIndividualInput {
  authUserId: string;
  fullName: string;
  accountType: PublicIndividualAccountType;
}

/**
 * The database is the authority for identity and workspace creation.
 * The browser sends only the two supported arguments. Auth UID, role,
 * actor type, institution scope, workspace ownership and membership are
 * derived and enforced by Postgres.
 */
export const individualOnboardingService = {
  async completePublicIndividualRegistration(
    input: CompletePublicIndividualInput,
  ): Promise<BootstrapPublicIndividualResult> {
    const fullName = input.fullName.trim().replace(/\s+/g, " ");

    if (!input.authUserId || !fullName) {
      throw new Error("INDIVIDUAL_REGISTRATION_IDENTITY_REQUIRED");
    }

    const { data, error } = await supabase.rpc("bootstrap_public_individual", {
      p_full_name: fullName,
      p_account_type: input.accountType,
    });

    if (error) {
      throw new Error(`INDIVIDUAL_BOOTSTRAP_FAILED: ${error.message}`);
    }

    const result = data as BootstrapPublicIndividualResult | null;
    if (
      !result ||
      result.success !== true ||
      result.user_id !== input.authUserId ||
      !result.profile_id ||
      !result.actor_id ||
      !result.workspace_id ||
      !result.membership_id ||
      !result.individual_account_id ||
      result.role !== "individual" ||
      result.account_type !== input.accountType ||
      result.institution_id !== null ||
      result.school_id !== null
    ) {
      throw new Error("INDIVIDUAL_BOOTSTRAP_CONTRACT_MISMATCH");
    }

    return result;
  },
};
