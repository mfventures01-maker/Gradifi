/**
 * Canonical higher-institution onboarding contract.
 *
 * Boundary: browser -> actor-onboarding Edge Function -> live PostgreSQL RPC.
 * The authenticated Auth UID is intentionally not part of the browser request;
 * actor-onboarding derives it from the verified session.
 *
 * School onboarding remains on its existing contract and RPC.
 */
import type { Database, Json } from '../types/database.types';

type PublicFunctions = Database['public']['Functions'];

export type HigherInstitutionType =
  | 'university'
  | 'polytechnic'
  | 'college_of_education';

/** Request accepted by actor-onboarding for action=bootstrap_higher_institution. */
export interface HigherInstitutionBootstrapRequest {
  action: 'bootstrap_higher_institution';
  institution_name: string;
  institution_type: HigherInstitutionType;
  registration_number?: string | null;
  country?: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  dean_name: string;
  /** Must equal the verified email on the caller's Supabase Auth user. */
  dean_email: string;
  dean_phone?: string | null;
}

/** Exact deployed PostgreSQL RPC argument contract, including server-derived UID. */
export type BootstrapHigherInstitutionRpcArgs =
  PublicFunctions['bootstrap_higher_institution']['Args'];

/** Response shape returned by the bootstrap RPC/Edge Function on success. */
export interface HigherInstitutionBootstrapResult {
  success: true;
  institution_id: string;
  school_id: string;
  profile_id: string;
  auth_user_id: string;
  actor_type: 'dean';
  url_slug?: string;
  [key: string]: Json | undefined;
}

/** Higher-ed actors accepted by the deployed actor-onboarding Edge Function. */
export type HigherInstitutionActorType = 'hod' | 'adviser' | 'lecturer' | 'student';

/** Browser payload for action=create_actor under a Dean authority. */
export interface HigherInstitutionActorOnboardingRequest {
  action: 'create_actor';
  actor_type: HigherInstitutionActorType;
  institution_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  school_id?: string;
  faculty_id?: string;
  department_id?: string;
  title?: string;
  rank?: string;
  specialization?: string;
  is_graduate_student_supervisor?: boolean;
  max_students?: number;
  student_id?: string;
  class_id?: string;
  gender?: string;
  date_of_birth?: string;
}

/** Exact deployed RPC signature. Note p_school_id is required by live schema types. */
export type CompleteActorOnboardingRpcArgs =
  PublicFunctions['complete_actor_onboarding']['Args'];

export type HigherInstitutionOnboardingRequest =
  | HigherInstitutionBootstrapRequest
  | HigherInstitutionActorOnboardingRequest;

export type HigherInstitutionOnboardingResult =
  | HigherInstitutionBootstrapResult
  | (Record<string, Json | undefined> & { success: true });

/**
 * Contract facts:
 * - Bootstrap Auth UID is server-derived, never client-supplied.
 * - Dean email must match a verified Auth email.
 * - Live bootstrap RPC accepts the three HigherInstitutionType values above.
 * - The current actor Edge Function requires a campus/school_id for lecturers.
 *   This is a known higher-ed modelling constraint, not hidden by this type.
 * - Do not route school onboarding through this contract.
 */
