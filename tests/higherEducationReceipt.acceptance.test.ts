import { describe, expect, it } from "vitest";
import { getHigherEducationReceiptState } from "../src/services/higherEducationReceipt";
import type { CreateActorResult } from "../src/services/actorOnboardingService";

const newIdentity: CreateActorResult = {
  success: true,
  login_id: "STU-0001",
  user_id: "user-1",
  profile_id: "profile-1",
  actor_type: "student",
  institution_id: "institution-1",
  pin: "1234",
  pin_not_reissued: false,
  provisioning: { job_id: "job-new", status: "active", recovered: false },
  full_name: "Ada Example",
};

const recoveredIdentity: CreateActorResult = {
  ...newIdentity,
  pin: null,
  pin_not_reissued: true,
  provisioning: { job_id: "job-recovered", status: "active", recovered: true },
};

describe("B05 Higher Education receipt acceptance", () => {
  it("B05-HE-01 exposes Login ID, PIN and Copy PIN for a new identity", () => {
    expect(getHigherEducationReceiptState(newIdentity)).toEqual({
      valid: true,
      showLoginId: true,
      showPin: true,
      showCopyPin: true,
      showRecoveredNotice: false,
    });
  });

  it("B05-HE-02 exposes Login ID but never PIN or Copy PIN for a recovered identity", () => {
    expect(getHigherEducationReceiptState(recoveredIdentity)).toEqual({
      valid: true,
      showLoginId: true,
      showPin: false,
      showCopyPin: false,
      showRecoveredNotice: true,
    });
  });

  it("B05-HE-03 preserves the recovered restrictions when reopened from session history", () => {
    const sessionHistory = [recoveredIdentity];
    const reopenedAccount = sessionHistory[0];
    expect(getHigherEducationReceiptState(reopenedAccount)).toEqual({
      valid: true,
      showLoginId: true,
      showPin: false,
      showCopyPin: false,
      showRecoveredNotice: true,
    });
  });

  it.each([
    ["recovered response contains a PIN", { ...recoveredIdentity, pin: "9999" }],
    ["recovered response omits the no-reissue flag", { ...recoveredIdentity, pin_not_reissued: false }],
    ["new response has no PIN", { ...newIdentity, pin: null }],
    ["response has no Login ID", { ...newIdentity, login_id: "" }],
  ])("B05-HE-04 fails closed when %s", (_case, invalidAccount) => {
    expect(getHigherEducationReceiptState(invalidAccount)).toEqual({
      valid: false,
      showLoginId: false,
      showPin: false,
      showCopyPin: false,
      showRecoveredNotice: false,
    });
  });
});
