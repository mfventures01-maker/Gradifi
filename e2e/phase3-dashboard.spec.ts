import { test, expect } from '@playwright/test';

/**
 * PHASE 3: Multi-Role Dashboard System - E2E Test Suite
 * Tests all 6 role-specific dashboards
 */

test.describe('Phase 3: Multi-Role Dashboards', () => {
  
  test.describe('Principal Dashboard', () => {
    test('should load principal dashboard', async ({ page }) => {
      await page.goto('/portal/principal');
      
      // Wait for dashboard to load
      await expect(page.locator('text=Executive Overview')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=TOTAL STUDENTS')).toBeVisible();
    });

    test('should display total students metric', async ({ page }) => {
      await page.goto('/portal/principal');
      await expect(page.locator('text=TOTAL STUDENTS')).toBeVisible();
    });

    test('should display total teachers metric', async ({ page }) => {
      await page.goto('/portal/principal');
      await expect(page.locator('text=TOTAL TEACHERS')).toBeVisible();
    });

    test('should display attendance rate', async ({ page }) => {
      await page.goto('/portal/principal');
      await expect(page.locator('text=ATTENDANCE RATE')).toBeVisible();
    });

    test('should display term average score', async ({ page }) => {
      await page.goto('/portal/principal');
      await expect(page.locator('text=TERM AVERAGE SCORE')).toBeVisible();
    });

    test('should display anomaly reports', async ({ page }) => {
      await page.goto('/portal/principal');
      await expect(page.locator('text=Anomaly & Early Warning Reports')).toBeVisible();
    });
  });

  test.describe('Teacher Dashboard', () => {
    test('should load teacher dashboard', async ({ page }) => {
      await page.goto('/portal/teacher');
      
      // Wait for dashboard to load
      await expect(page.locator('text=QUICK ACTIONS')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Good Morning')).toBeVisible();
    });

    test('should display quick actions', async ({ page }) => {
      await page.goto('/portal/teacher');
      await expect(page.locator('text=Create Test')).toBeVisible();
      await expect(page.locator('text=Review Grades')).toBeVisible();
      await expect(page.locator('text=Mark Attendance')).toBeVisible();
    });

    test('should display pending grades count', async ({ page }) => {
      await page.goto('/portal/teacher');
      await expect(page.locator('text=PENDING AI GRADES')).toBeVisible();
    });
  });

  test.describe('Student Dashboard', () => {
    test('should load student dashboard', async ({ page }) => {
      await page.goto('/portal/student');
      
      // Wait for dashboard to load
      await expect(page.locator('text=Student Portal')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=My Subject Performance')).toBeVisible();
    });

    test('should display practice streak', async ({ page }) => {
      await page.goto('/portal/student');
      await expect(page.locator('text=Day Practice Streak')).toBeVisible();
    });

    test('should display active exams', async ({ page }) => {
      await page.goto('/portal/student');
      await expect(page.locator('text=Upcoming & Active CBT Exams')).toBeVisible();
    });
  });

  test.describe('Parent Dashboard', () => {
    test('should load parent dashboard', async ({ page }) => {
      await page.goto('/portal/parent');
      
      // Wait for dashboard to load
      await expect(page.locator('text=OFFICIAL TERM REPORT CARD SUMMARY')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=SCHOOL FEES STATUS')).toBeVisible();
    });

    test('should display WhatsApp share button', async ({ page }) => {
      await page.goto('/portal/parent');
      await expect(page.locator('text=Share Broadsheet via WhatsApp')).toBeVisible();
    });
  });

  test.describe('Bursar Dashboard', () => {
    test('should load bursar dashboard', async ({ page }) => {
      await page.goto('/portal/bursar');
      
      // Wait for dashboard to load
      await expect(page.locator('text=BURSAR FINANCIAL TERMINAL')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=TOTAL REVENUE COLLECTED')).toBeVisible();
    });
  });

  test.describe('VP Dashboard', () => {
    test('should load VP dashboard', async ({ page }) => {
      await page.goto('/portal/vp');
      
      // Wait for dashboard to load
      await expect(page.locator('text=VP ACADEMIC SUPERVISION TERMINAL')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Academic Anomaly & Early Warning Feed')).toBeVisible();
    });
  });

  test.describe('RPC Functions', () => {
    test('should call get_principal_dashboard_stats RPC', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { supabase } = await import('../src/lib/supabase');
        const { data, error } = await supabase.rpc('get_principal_dashboard_stats' as any);
        return { data, error };
      });
      
      expect(result.data).toBeDefined();
    });

    test('should call get_teacher_dashboard_stats RPC', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { supabase } = await import('../src/lib/supabase');
        const { data, error } = await supabase.rpc('get_teacher_dashboard_stats' as any);
        return { data, error };
      });
      
      expect(result.data).toBeDefined();
    });

    test('should call get_student_dashboard_stats RPC', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { supabase } = await import('../src/lib/supabase');
        const { data, error } = await supabase.rpc('get_student_dashboard_stats' as any);
        return { data, error };
      });
      
      expect(result.data).toBeDefined();
    });
  });
});
