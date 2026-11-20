import { supabase } from "../lib/supabase";

export type InstitutionDecision = "approved" | "rejected";

export interface PendingHigherEdInstitution {
  institution_id: string;
  institution_name: string;
  institution_type: "university" | "polytechnic" | "college_of_education" | string;
  institution_category: string | null;
  registration_number: string | null;
  country: string;
  institution_address: string | null;
  institution_phone: string | null;
  website_url: string | null;
  institution_slug: string;
  submitted_at: string;
  authority_user_id: string | null;
  authority_name: string | null;
  authority_email: string | null;
  authority_role: "vice_chancellor" | "rector" | null;
  authority_membership_status: string | null;
  authority_actor_status: string | null;
  dean_user_id: string | null;
  dean_name: string | null;
  dean_status: string | null;
  dean_membership_status: string | null;
  dean_job_status: string | null;
  campus_id: string | null;
  campus_name: string | null;
  can_approve: boolean;
  readiness_reason: string;
}

export interface InstitutionDecisionReceipt {
  success: true;
  institution_id: string;
  decision: InstitutionDecision;
  previous_status: "pending";
  status: "active" | "rejected";
  reviewed_at: string;
}

export const superAdminInstitutionApprovalService = {
  async isCurrentUserSuperAdmin(): Promise<boolean> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return false;

    const { data, error } = await supabase.rpc("is_current_user_super_admin");
    if (error) throw error;
    return data === true;
  },

  async listPending(): Promise<PendingHigherEdInstitution[]> {
    const { data, error } = await supabase.rpc("get_pending_higher_ed_institution_approvals");
    if (error) throw error;
    return (data || []) as PendingHigherEdInstitution[];
  },

  async review(
    institutionId: string,
    decision: InstitutionDecision,
    reason: string,
  ): Promise<InstitutionDecisionReceipt> {
    if (!institutionId) throw new Error("INSTITUTION_ID_REQUIRED");
    if (reason.trim().length < 10) throw new Error("INSTITUTION_DECISION_REASON_REQUIRED");

    const { data, error } = await supabase.rpc("review_higher_ed_institution", {
      p_institution_id: institutionId,
      p_decision: decision,
      p_reason: reason.trim(),
    });
    if (error) throw error;
    if (!data?.success || data.institution_id !== institutionId || data.decision !== decision) {
      throw new Error("INSTITUTION_DECISION_RECEIPT_INVALID");
    }
    return data as InstitutionDecisionReceipt;
  },
};
