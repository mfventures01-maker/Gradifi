import { expect, test } from "@playwright/test";

const AUTH_USER_ID = "9a3c4a3e-4db6-4d6a-9a2b-3c47f39e4a11";
const PROFILE_ID = "5e4e9e47-b4f0-43a0-a0b8-bb8a1d65e102";
const ACTOR_ID = "d19a15a2-6d5b-4c6d-a9f0-7e9f5d8f1b21";
const EMAIL = "amina.freelancer@example.test";

const authUser = (metadata: Record<string, unknown> = {}) => ({
  id: AUTH_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: EMAIL,
  email_confirmed_at: "2026-11-22T10:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: metadata,
  created_at: "2026-11-22T10:00:00.000Z",
});

const mockAuthenticatedSupabase = async (
  page: import("@playwright/test").Page,
  options: { withSession?: boolean } = {},
) => {
  let bootstrapPayload: Record<string, unknown> | null = null;
  const user = authUser({
    full_name: "Amina Okafor",
    requested_account_type: "freelancer",
    account_path: "public_individual",
  });

  await page.route("**/auth/v1/signup**", async route => {
    const body = route.request().postDataJSON() as { data?: Record<string, unknown> };
    const response: Record<string, unknown> = { user };
    if (options.withSession !== false) {
      response.access_token = "test-access-token";
      response.token_type = "bearer";
      response.expires_in = 3600;
      response.refresh_token = "test-refresh-token";
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...response,
        user: { ...user, user_metadata: body.data || user.user_metadata },
      }),
    });
  });

  await page.route("**/auth/v1/user**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(user),
  }));

  await page.route("**/rest/v1/rpc/bootstrap_public_individual", async route => {
    bootstrapPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user_id: AUTH_USER_ID,
        profile_id: PROFILE_ID,
        actor_id: ACTOR_ID,
        role: "individual",
        account_type: "freelancer",
        institution_id: null,
        school_id: null,
      }),
    });
  });

  await page.route("**/rest/v1/profiles**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      id: PROFILE_ID,
      user_id: AUTH_USER_ID,
      institution_id: null,
      school_id: null,
      full_name: "Amina Okafor",
      role: "individual",
      email: EMAIL,
      phone: null,
      account_type: "freelancer",
      authority_user_id: null,
      created_at: "2026-11-22T10:00:00.000Z",
    }),
  }));

  await page.route("**/rest/v1/identity_actors**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      id: ACTOR_ID,
      auth_user_id: AUTH_USER_ID,
      institution_id: null,
      school_id: null,
      actor_type: "individual",
      actor_record_id: null,
      login_identifier: EMAIL,
      auth_method: "email",
      status: "active",
      authority_user_id: null,
      pin_changed_at: "2026-11-22T10:00:00.000Z",
      created_at: "2026-11-22T10:00:00.000Z",
      updated_at: "2026-11-22T10:00:00.000Z",
      last_login_at: null,
    }),
  }));

  return {
    getBootstrapPayload: () => bootstrapPayload,
  };
};

test.describe("Freelancer and independent-user onboarding wizard", () => {
  test("completes the three-step freelancer wizard against the canonical bootstrap contract", async ({ page }) => {
    const supabase = await mockAuthenticatedSupabase(page);
    await page.goto("/onboarding/individual/register");

    await expect(page.getByRole("heading", { name: "Create your Gradifi account" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Onboarding progress" })).toBeVisible();
    await expect(page.getByLabel("I am joining as")).toHaveValue("freelancer");

    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name").fill("Amina Okafor");
    await page.getByLabel("Email address").fill(" AMINA.FREELANCER@example.test ");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel("Password").fill("a-secure-test-password");
    await page.getByLabel("Confirm password").fill("a-secure-test-password");
    await expect(page.getByText("Amina Okafor").last()).toBeVisible();
    await page.getByRole("button", { name: "Create independent account" }).click();

    await expect(page.getByRole("heading", { name: "Welcome, Amina Okafor" })).toBeVisible();
    expect(supabase.getBootstrapPayload()).toEqual({
      p_full_name: "Amina Okafor",
      p_account_type: "freelancer",
    });
  });

  test("does not provision an identity before email confirmation", async ({ page }) => {
    const supabase = await mockAuthenticatedSupabase(page, { withSession: false });
    await page.goto("/onboarding/individual/register");

    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name").fill("Amina Okafor");
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Password").fill("a-secure-test-password");
    await page.getByLabel("Confirm password").fill("a-secure-test-password");
    await page.getByRole("button", { name: "Create independent account" }).click();

    await expect(page.getByRole("status")).toContainText("confirm your address");
    expect(supabase.getBootstrapPayload()).toBeNull();
  });

  test("blocks mismatched passwords before calling Supabase Auth", async ({ page }) => {
    let signupRequests = 0;
    await page.route("**/auth/v1/signup**", async route => {
      signupRequests += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await page.goto("/onboarding/individual/register");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name").fill("Amina Okafor");
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Password").fill("a-secure-test-password");
    await page.getByLabel("Confirm password").fill("a-different-test-password");

    await page.getByRole("button", { name: "Create independent account" }).click();
    await expect(page.getByRole("alert")).toContainText("passwords do not match");
    expect(signupRequests).toBe(0);
  });
});
