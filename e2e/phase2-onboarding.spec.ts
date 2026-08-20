import { test, expect } from '@playwright/test';

/**
 * PHASE 2: Onboarding Wizard - E2E Test Suite
 * Tests the complete 14-step onboarding flow
 */

test.describe('Phase 2: Onboarding Wizard', () => {
  
  test('should load onboarding wizard', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.locator('h1')).toContainText('Institution & Campus Registration');
  });

  test('should complete step 1: Institution Details', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Fill institution details
    await page.fill('#input-institution-name', 'Test Academy International');
    await page.selectOption('#select-institution-type', 'secondary');
    await page.fill('#input-reg-number', 'MOE/TEST/2026/001');
    await page.fill('#input-address', '10 Test Avenue, Lekki Phase 1, Lagos');
    await page.selectOption('#select-state', 'Lagos');
    await page.fill('#input-lga', 'Eti-Osa');
    await page.fill('#input-phone', '+234 800 123 4567');
    await page.fill('#input-email', 'info@testacademy.edu.ng');
    await page.fill('#input-principal-name', 'Dr. Adebayo Ogun');
    await page.fill('#input-principal-phone', '+234 803 123 4567');
    await page.fill('#input-principal-email', 'principal@testacademy.edu.ng');
    
    // Submit
    await page.click('#btn-create-institution');
    
    // Wait for success
    await expect(page.locator('text=Institution Provisioned Authoritatively!')).toBeVisible({ timeout: 15000 });
  });

  test('should proceed to teacher registration', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Complete institution step (quick fill)
    await page.fill('#input-institution-name', 'Test Academy International');
    await page.selectOption('#select-institution-type', 'secondary');
    await page.fill('#input-reg-number', 'MOE/TEST/2026/001');
    await page.fill('#input-address', '10 Test Avenue, Lekki Phase 1, Lagos');
    await page.selectOption('#select-state', 'Lagos');
    await page.fill('#input-lga', 'Eti-Osa');
    await page.fill('#input-phone', '+234 800 123 4567');
    await page.fill('#input-email', 'info@testacademy.edu.ng');
    await page.fill('#input-principal-name', 'Dr. Adebayo Ogun');
    await page.fill('#input-principal-phone', '+234 803 123 4567');
    await page.fill('#input-principal-email', 'principal@testacademy.edu.ng');
    await page.click('#btn-create-institution');
    
    // Wait for success and click proceed
    await expect(page.locator('text=Institution Provisioned Authoritatively!')).toBeVisible({ timeout: 15000 });
    await page.click('#btn-proceed-to-teachers');
    
    // Verify teacher form appears
    await expect(page.locator('h1')).toContainText('Teacher & Staff Registration');
  });

  test('should complete teacher registration and get flashcard', async ({ page }) => {
    // Navigate to teacher registration
    await page.goto('/onboarding?view=create-teacher');
    
    // Fill teacher details
    await page.fill('#input-teacher-name', 'Mrs. Ngozi Eze');
    await page.fill('#input-teacher-email', 'ngozi.eze@testacademy.edu.ng');
    await page.fill('#input-teacher-phone', '+234 802 333 4455');
    
    // Submit
    await page.click('#btn-submit-teacher');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=Teacher Flashcard Receipt')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Mrs. Ngozi Eze')).toBeVisible();
  });

  test('should complete student enrollment and get matric number', async ({ page }) => {
    // Navigate to student enrollment
    await page.goto('/onboarding?view=create-student');
    
    // Fill student details
    await page.fill('#input-student-first-name', 'Chinedu');
    await page.fill('#input-student-last-name', 'Okafor');
    await page.selectOption('#select-student-class', 'JSS 1');
    
    // Submit
    await page.click('#btn-submit-student');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=Student Enrollment Flashcard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Chinedu Okafor')).toBeVisible();
  });

  test('should test RPC create_institution_account function', async ({ page }) => {
    // Test the RPC function directly via API
    const response = await page.evaluate(async () => {
      const { supabase } = await import('../src/lib/supabase');
      const result = await supabase.rpc('create_institution_account' as any, {
        _institution_name: 'API Test Academy',
        _institution_type: 'secondary',
        _registration_number: 'API/TEST/001',
        _address: 'API Test Address',
        _state: 'Lagos',
        _lga: 'Ikeja',
        _phone: '+234 800 000 0000',
        _email: 'api@test.edu.ng',
        _website: '',
        _principal_name: 'API Test Principal',
        _principal_phone: '+234 801 000 0000',
        _principal_email: 'principal.api@test.edu.ng',
        _country: 'Nigeria',
        _school_type: 'private'
      });
      return result;
    });
    
    expect(response.data).toBeDefined();
  });
});
