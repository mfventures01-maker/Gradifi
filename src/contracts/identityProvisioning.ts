/**
 * Canonical frontend/backend identity contract.
 *
 * The browser sends intent only. School, institution, actor authority, IDs,
 * PINs, Auth user IDs and role assignments are authoritative on the server.
 */

export type SchoolActorType =
  | 'vice_principal'
  | 'bursar'
  | 'teacher'
  | 'student';

export interface ProvisionTeacherDetails {
  class_subject_ids?: string[];
}

export interface ProvisionStudentDetails {
  class_id: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female';
  date_of_birth?: string | null;
}

export interface ProvisionIdentityRequest {
  operation: 'create';
  request_id: string;
  actor_type: SchoolActorType;
  school_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  teacher?: ProvisionTeacherDetails;
  student?: ProvisionStudentDetails;
}

export interface BulkProvisionStudentsRequest {
  operation: 'bulk_students';
  request_id: string;
  school_id: string;
  students: Array<{
    row_id: string;
    first_name: string;
    last_name: string;
    gender: 'male' | 'female';
    date_of_birth?: string | null;
    class_name: string;
  }>;
}

export interface ProvisionedCredential {
  actor_type: SchoolActorType;
  actor_id: string;
  profile_id: string;
  auth_user_id: string;
  login_identifier: string;
  temporary_pin: string;
  requires_pin_change: true;
  created_at: string;
}

export interface ProvisionIdentityResponse {
  success: true;
  request_id: string;
  credential: ProvisionedCredential;
}

export interface BulkProvisionStudentResult {
  row_id: string;
  success: boolean;
  credential?: ProvisionedCredential;
  error_code?: string;
  error_message?: string;
}

export interface BulkProvisionStudentsResponse {
  success: boolean;
  request_id: string;
  total_submitted: number;
  success_count: number;
  failed_count: number;
  results: BulkProvisionStudentResult[];
}

export interface PinLoginRequest {
  identifier: string;
  pin: string;
}

export interface PinLoginResponse {
  success: true;
  token_hash: string;
  token_type: 'magiclink';
  expires_at: string;
  requires_pin_change: boolean;
}

export interface ChangePinRequest {
  new_pin: string;
}

export interface IdentityContractError {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export function isProvisionIdentityResponse(
  value: unknown,
): value is ProvisionIdentityResponse {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<ProvisionIdentityResponse>;
  const credential = result.credential;
  return result.success === true
    && typeof result.request_id === 'string'
    && !!credential
    && typeof credential.actor_id === 'string'
    && typeof credential.profile_id === 'string'
    && typeof credential.auth_user_id === 'string'
    && typeof credential.login_identifier === 'string'
    && typeof credential.created_at === 'string'
    && /^(?:\d{4}|\d{6})$/.test(credential.temporary_pin || '')
    && credential.requires_pin_change === true;
}

export function isPinLoginResponse(value: unknown): value is PinLoginResponse {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<PinLoginResponse>;
  return result.success === true
    && typeof result.token_hash === 'string'
    && result.token_type === 'magiclink'
    && typeof result.expires_at === 'string';
}
