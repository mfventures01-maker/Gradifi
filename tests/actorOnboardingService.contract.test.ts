import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from "../src/lib/supabase";
import {
  actorOnboardingService,
  type CreateActorInput,
} from "../src/services/actorOnboardingService";

const invoke = vi.mocked(supabase.functions.invoke);

const input: CreateActorInput = {
  actor_type: "teacher",
  institution_id: "institution-1",
  school_id: "school-1",
  full_name: "Ada Example",
};

const newProvisioning = {
  success: true,
  actor_type: "teacher",
  user_id: "auth-user-1",
  profile_id: "profile-1",
  login_id: "TCH-0001",
  full_name: "Ada Example",
  institution_id: "institution-1",
  school_id: "school-1",
  pin: "123456",
  pin_not_reissued: false,
  provisioning: {
    job_id: "job-1",
    status: "active",
    recovered: false,
  },
};

const recoveredProvisioning = {
  success: true,
  actor_type: "teacher",
  user_id: "auth-user-1",
  profile_id: "profile-1",
  login_id: "TCH-0001",
  full_name: "Ada Example",
  pin: null,
  pin_not_reissued: true,
  provisioning: {
    job_id: "job-1",
    status: "active",
    recovered: true,
  },
};

const resolveInvoke = (data: unknown, error: unknown = null) => {
  invoke.mockResolvedValue({ data, error } as never);
};

describe("actorOnboardingService.create Gate A contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("A01 accepts a newly provisioned identity with a non-empty PIN", async () => {
    resolveInvoke(newProvisioning);

    const result = await actorOnboardingService.create(input);

    expect(result.pin).toBe("123456");
    expect(result.pin_not_reissued).toBe(false);
    expect(result.provisioning.recovered).toBe(false);
  });

  it("A02 accepts a verified recovered identity with pin set to null", async () => {
    resolveInvoke(recoveredProvisioning);

    const result = await actorOnboardingService.create(input);

    expect(result.success).toBe(true);
    expect(result.pin).toBeNull();
    expect(result.login_id).toBe("TCH-0001");
  });

  it("A03 requires the explicit no-PIN-reissue flag and recovered provisioning state", async () => {
    resolveInvoke(recoveredProvisioning);

    const result = await actorOnboardingService.create(input);

    expect(result.pin_not_reissued).toBe(true);
    expect(result.provisioning).toEqual({
      job_id: "job-1",
      status: "active",
      recovered: true,
    });
  });

  it("A04 rejects a success response missing login_id", async () => {
    const { login_id: _omitted, ...data } = newProvisioning;
    resolveInvoke(data);

    await expect(actorOnboardingService.create(input)).rejects.toThrow(
      "Onboarding returned an incomplete identity",
    );
  });

  it("A05 rejects a success response missing user_id", async () => {
    const { user_id: _omitted, ...data } = newProvisioning;
    resolveInvoke(data);

    await expect(actorOnboardingService.create(input)).rejects.toThrow(
      "Onboarding returned an incomplete identity",
    );
  });

  it("A06 rejects a success response missing profile_id", async () => {
    const { profile_id: _omitted, ...data } = newProvisioning;
    resolveInvoke(data);

    await expect(actorOnboardingService.create(input)).rejects.toThrow(
      "Onboarding returned an incomplete identity",
    );
  });

  it("A07 rejects a new-provisioning response with a null PIN", async () => {
    resolveInvoke({ ...newProvisioning, pin: null });

    await expect(actorOnboardingService.create(input)).rejects.toThrow(
      "Onboarding returned an incomplete identity",
    );
  });

  it("A08 rejects contradictory recovery flags and credential state", async () => {
    resolveInvoke({
      ...recoveredProvisioning,
      pin: "654321",
      pin_not_reissued: false,
    });

    await expect(actorOnboardingService.create(input)).rejects.toThrow(
      "Onboarding returned an incomplete identity",
    );
  });

  it("A09 rejects a provisioning status other than active", async () => {
    resolveInvoke({
      ...recoveredProvisioning,
      provisioning: { ...recoveredProvisioning.provisioning, status: "pending" },
    });

    await expect(actorOnboardingService.create(input)).rejects.toThrow(
      "Onboarding returned an incomplete identity",
    );
  });

  it("A10 safely rejects a malformed non-JSON function error response", async () => {
    resolveInvoke(null, {
      message: "FunctionsFetchError",
      context: {
        clone: () => ({
          json: async () => {
            throw new Error("Invalid JSON");
          },
        }),
      },
    });

    await expect(actorOnboardingService.create(input)).rejects.toThrow(
      "FunctionsFetchError",
    );
  });
});
