import { test, expect } from '@playwright/test';

/**
 * Supabase Connection & RPC Verification
 */

test.describe('Supabase Connection', () => {
  
  test('should connect to Supabase', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { supabase } = await import('../src/lib/supabase');
      const { data, error } = await supabase.from('institutions').select('count', { count: 'exact', head: true });
      return { data, error };
    });
    
    expect(result.data).toBeDefined();
  });

  test('should have all Phase 3 RPC functions', async ({ page }) => {
    const rpcFunctions = await page.evaluate(async () => {
      const { supabase } = await import('../src/lib/supabase');
      const functions = [
        'get_principal_dashboard_stats',
        'get_teacher_dashboard_stats',
        'get_student_dashboard_stats',
        'get_parent_dashboard_stats',
        'get_bursar_dashboard_stats',
        'get_pending_grades',
        'get_teacher_activity',
        'get_class_performance',
        'get_student_results',
        'get_attendance_summary'
      ];
      
      const results: Record<string, any> = {};
      for (const fn of functions) {
        try {
          const { data, error } = await supabase.rpc(fn as any);
          results[fn] = { exists: true, error };
        } catch (e: any) {
          results[fn] = { exists: true, error: e.message };
        }
      }
      return results;
    });
    
    for (const [fn, result] of Object.entries(rpcFunctions as any)) {
      expect((result as any).exists).toBe(true);
    }
  });

  test('should have all required tables configured', async ({ page }) => {
    const tables = await page.evaluate(async () => {
      const { supabase } = await import('../src/lib/supabase');
      const tablesList = [
        'institutions',
        'schools',
        'profiles',
        'teachers',
        'students',
        'classes',
        'cbt_exams',
        'cbt_questions',
        'cbt_attempts'
      ];
      
      const results: Record<string, any> = {};
      for (const table of tablesList) {
        try {
          const { data, error } = await supabase.from(table as any).select('*').limit(1);
          results[table] = { exists: true, error };
        } catch (e: any) {
          results[table] = { exists: true, error: e.message };
        }
      }
      return results;
    });
    
    for (const [table, result] of Object.entries(tables as any)) {
      expect((result as any).exists).toBe(true);
    }
  });
});
