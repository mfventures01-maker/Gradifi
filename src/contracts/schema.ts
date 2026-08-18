/**
 * GRADIFI SINGLE SOURCE OF TRUTH (SSOT) - CANONICAL SEFAES SCHEMA
 * Fully aligned with Supabase PostgreSQL public schema definition.
 */

import { Database } from '../types/database.types';

export type Institution = Database['public']['Tables']['institutions']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type IdentityActor = Database['public']['Tables']['identity_actors']['Row'];
export type School = Database['public']['Tables']['schools']['Row'];
export type ClassEntity = Database['public']['Tables']['classes']['Row'];
export type SubjectCatalogItem = Database['public']['Tables']['subject_catalog']['Row'];
export type ClassSubject = Database['public']['Tables']['class_subjects']['Row'];
export type Teacher = Database['public']['Tables']['teachers']['Row'];
export type TeacherSubjectAssignment = Database['public']['Tables']['teacher_subject_assignments']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Parent = Database['public']['Tables']['parents']['Row'];
export type StudentParent = Database['public']['Tables']['student_parents']['Row'];
export type InstitutionOnboarding = Database['public']['Tables']['institution_onboarding']['Row'];
export type CbtExam = Database['public']['Tables']['cbt_exams']['Row'];
export type CbtQuestion = Database['public']['Tables']['cbt_questions']['Row'];
export type CbtAttempt = Database['public']['Tables']['cbt_attempts']['Row'];
export type CbtAnswer = Database['public']['Tables']['cbt_answers']['Row'];
export type CbtResultsSummary = Database['public']['Tables']['cbt_results_summary']['Row'];
export type AnswerScript = Database['public']['Tables']['answer_scripts']['Row'];
export type AIQueueStatus = Database['public']['Tables']['ai_queue_status']['Row'];
export type InstitutionHealthMetrics = Database['public']['Tables']['institution_health_metrics']['Row'];

// UI Rubric & Assessment helper interfaces for AnswerScripts
export interface GradingRubric {
  title: string;
  total_score: number;
  criteria: {
    name: string;
    max_score: number;
    description: string;
  }[];
}

export interface CriterionScore {
  criterion: string;
  max_score: number;
  score: number;
  feedback: string;
}

// Backward compatibility alias for UI components
export type GradingSubmission = AnswerScript;
