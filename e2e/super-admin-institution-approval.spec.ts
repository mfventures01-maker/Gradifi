import { expect, test } from "@playwright/test";

const authUser = {
  id: "a0000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "platform.admin@example.test",
  email_confirmed_at: "2026-11-20T10:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-11-20T09:00:00.000Z",
};

const pendingInstitution = {
  institution_id: "b0000000-0000-4000-8000-000000000001",
  institution_name: "Example Polytechnic",
  institution_type: "polytechnic",
  institution_category: "polytechnic",
  registration_number: "NBTE-DEMO-001",
  country: "Nigeria",
  institution_address: "Example Road, Minna",
  institution_phone: "+2348000000000",
  website_url: "https://example.test",
  institution_slug: "example-polytechnic",
  submitted_at: "2026-11-20T10:00:00.000Z",
  authority_user_id: "c0000000-0000-4000-8000-000000000001",
  authority_name: "Demo Rector",
  authority_email: "rector@example.test",
  authority_role: "rector",
  authority_membership_status: "active",
  authority_actor_status: "active",
  dean_user_id: "d0000000-0000-4000-8000-000000000001",
  dean_name: "Demo Dean",
  dean_status: "active",
  dean_job_status: "active",
  campus_id: "e0000000-0000-4000-8000-000000000001",
  campus_name: "Example Polytechnic Main Campus",
  can_approve: true,
  readiness_reason: "Ready for approval",
};

test.describe("Super Admin higher-education institution approval", () => {
  test("unauthenticated visitors cannot enter the approval workspace", async ({ page }) => {
    await page.route("**/auth/v1/user", route => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "No authenticated session" }),
    }));
    await page.goto("/super-admin/institutions");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("verified Super Admin can review and approve a ready institution", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("gradifi-sefaes-auth-session", JSON.stringify({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "a0000000-0000-4000-8000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          email: "platform.admin@example.test",
          email_confirmed_at: "2026-11-20T10:00:00.000Z",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          created_at: "2026-11-20T09:00:00.000Z",
        },
      }));
    });

    await page.route("**/auth/v1/user", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(authUser),
    }));
    await page.route("**/rest/v1/rpc/is_current_user_super_admin", route => route.fulfill({
      status: 200, contentType: "application/json", body: "true",
    }));

    let reviewed = false;
    await page.route("**/rest/v1/rpc/get_pending_higher_ed_institution_approvals", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(reviewed ? [] : [pendingInstitution]),
    }));
    await page.route("**/rest/v1/rpc/review_higher_ed_institution", async route => {
      const body = route.request().postDataJSON();
      expect(body.p_institution_id).toBe(pendingInstitution.institution_id);
      expect(body.p_decision).toBe("approved");
      expect(body.p_reason).toBe("Verified registration and authority records.");
      reviewed = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          institution_id: pendingInstitution.institution_id,
          decision: "approved",
          previous_status: "pending",
          status: "active",
          reviewed_at: "2026-11-20T11:00:00.000Z",
        }),
      });
    });

    await page.goto("/super-admin/institutions");
    await expect(page.getByRole("heading", { name: "Institution approvals" })).toBeVisible();
    await expect(page.getByText("Example Polytechnic")).toBeVisible();
    await expect(page.getByText("Ready for approval")).toBeVisible();

    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByLabel("Decision reason").fill("Verified registration and authority records.");
    await page.getByRole("button", { name: "Confirm approval" }).click();

    await expect(page.getByRole("status")).toContainText("Example Polytechnic is now active");
    await expect(page.getByText("No pending institutions")).toBeVisible();
  });

  test("approval stays disabled when the Dean provisioning contract is incomplete", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("gradifi-sefaes-auth-session", JSON.stringify({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "a0000000-0000-4000-8000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          email: "platform.admin@example.test",
          email_confirmed_at: "2026-11-20T10:00:00.000Z",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          created_at: "2026-11-20T09:00:00.000Z",
        },
      }));
    });
    await page.route("**/auth/v1/user", route => route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify(authUser),
    }));
    await page.route("**/rest/v1/rpc/is_current_user_super_admin", route => route.fulfill({
      status: 200, contentType: "application/json", body: "true",
    }));
    await page.route("**/rest/v1/rpc/get_pending_higher_ed_institution_approvals", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        ...pendingInstitution,
        can_approve: false,
        dean_job_status: "recovery_required",
        readiness_reason: "Initial Dean provisioning job is not complete",
      }]),
    }));

    await page.goto("/super-admin/institutions");
    await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
    await expect(page.getByText("Initial Dean provisioning job is not complete")).toBeVisible();
  });
});
