import type { CreateActorResult } from "./actorOnboardingService";

export interface HigherEducationReceiptState {
  valid: boolean;
  showLoginId: boolean;
  showPin: boolean;
  showCopyPin: boolean;
  showRecoveredNotice: boolean;
}

/**
 * Shared receipt policy for the Higher Education receipt and session-history reopen path.
 * Invalid or contradictory provisioning responses fail closed: no credential is displayed.
 */
export const getHigherEducationReceiptState = (
  account: Pick<CreateActorResult, "login_id" | "pin" | "pin_not_reissued" | "provisioning">,
): HigherEducationReceiptState => {
  const hasLoginId = typeof account.login_id === "string" && account.login_id.trim().length > 0;
  const recovered = account.provisioning?.recovered === true;
  const isNew = account.provisioning?.recovered === false;

  if (!hasLoginId || (!recovered && !isNew)) {
    return { valid: false, showLoginId: false, showPin: false, showCopyPin: false, showRecoveredNotice: false };
  }

  if (recovered) {
    const valid = account.pin === null && account.pin_not_reissued === true;
    return {
      valid,
      showLoginId: valid,
      showPin: false,
      showCopyPin: false,
      showRecoveredNotice: valid,
    };
  }

  const valid = typeof account.pin === "string" &&
    account.pin.trim().length > 0 &&
    account.pin_not_reissued === false;

  return {
    valid,
    showLoginId: valid,
    showPin: valid,
    showCopyPin: valid,
    showRecoveredNotice: false,
  };
};
