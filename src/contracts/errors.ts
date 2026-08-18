/**
 * GRADIFI DETERMINISTIC ERROR MODEL
 */

export type ErrorCode =
  | 'CONTRACT_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'CONFLICT_ERROR'
  | 'NOT_FOUND'
  | 'BACKEND_ERROR'
  | 'NETWORK_UNCERTAIN'
  | 'VERIFICATION_FAILED'
  | 'PREREQUISITE_NOT_MET';

export interface AppError {
  code: ErrorCode;
  message: string;
  field?: string;
  details?: unknown;
}

export function createError(code: ErrorCode, message: string, field?: string, details?: unknown): AppError {
  return { code, message, field, details };
}
