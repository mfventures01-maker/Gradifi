/**
 * GRADIFI x SEFAES - CANONICAL SUPABASE DATABASE SCHEMA TYPES
 * Strictly derived from the SEFAES Single Source of Truth (SSoT).
 * Fully compliant with @supabase/supabase-js v2 GenericSchema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GradingStatus = 
  | 'pending' 
  | 'processing' 
  | 'pending_review' 
  | 'approved' 
  | 'overridden' 
  | 'released' 
  | 'failed';

export interface AnswerScript {
  id: string;
  student_id: string;
  exam_id: string;
  teacher_id: string;
  school_id: string;
  ocr_text: string;
  file_url?: string;
  grading_status: string;
  status: GradingStatus;
  score: number;
  ai_score?: number;
  final_score?: number;
  ai_feedback?: string;
  confidence?: number;
  rubric_scores?: Record<string, number>;
  reviewed_by?: string;
  reviewed_at?: string;
  override_justification?: string;
  teacher_feedback?: string;
  released_at?: string;
  assignment_title?: string;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string;
          name: string;
          type: 'secondary' | 'primary' | 'k12' | 'tertiary' | 'group_of_schools';
          country: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: 'secondary' | 'primary' | 'k12' | 'tertiary' | 'group_of_schools';
          country?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'secondary' | 'primary' | 'k12' | 'tertiary' | 'group_of_schools';
          country?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          institution_id: string;
          full_name: string;
          email: string | null;
          role: 'admin' | 'principal' | 'teacher' | 'student' | 'parent';
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          institution_id: string;
          full_name: string;
          email?: string | null;
          role?: 'admin' | 'principal' | 'teacher' | 'student' | 'parent';
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          institution_id?: string;
          full_name?: string;
          email?: string | null;
          role?: 'admin' | 'principal' | 'teacher' | 'student' | 'parent';
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      identity_actors: {
        Row: {
          id: string;
          user_id: string;
          auth_user_id?: string;
          profile_id: string;
          institution_id: string;
          school_id: string | null;
          role: 'admin' | 'principal' | 'teacher' | 'student' | 'parent';
          status: 'active' | 'inactive' | 'suspended';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          auth_user_id?: string;
          profile_id: string;
          institution_id: string;
          school_id?: string | null;
          role: 'admin' | 'principal' | 'teacher' | 'student' | 'parent';
          status?: 'active' | 'inactive' | 'suspended';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          auth_user_id?: string;
          profile_id?: string;
          institution_id?: string;
          school_id?: string | null;
          role?: 'admin' | 'principal' | 'teacher' | 'student' | 'parent';
          status?: 'active' | 'inactive' | 'suspended';
          created_at?: string;
        };
        Relationships: [];
      };
      schools: {
        Row: {
          id: string;
          institution_id: string;
          school_name: string;
          principal_name: string | null;
          vice_principal_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          logo_url: string | null;
          school_type: 'secondary' | 'primary' | 'comprehensive';
          url_slug: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          school_name: string;
          principal_name?: string | null;
          vice_principal_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          logo_url?: string | null;
          school_type?: 'secondary' | 'primary' | 'comprehensive';
          url_slug?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          school_name?: string;
          principal_name?: string | null;
          vice_principal_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          logo_url?: string | null;
          school_type?: 'secondary' | 'primary' | 'comprehensive';
          url_slug?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          arm: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          arm?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          arm?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subject_catalog: {
        Row: {
          id: string;
          code: string | null;
          name: string;
          category: string | null;
          is_practical: boolean;
          curriculum: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string | null;
          name: string;
          category?: string | null;
          is_practical?: boolean;
          curriculum?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string | null;
          name?: string;
          category?: string | null;
          is_practical?: boolean;
          curriculum?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      class_subjects: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          school_id: string;
          institution_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          subject_id: string;
          school_id: string;
          institution_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          subject_id?: string;
          school_id?: string;
          institution_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teachers: {
        Row: {
          id: string;
          profile_id: string | null;
          school_id: string;
          institution_id: string;
          name: string;
          email: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          school_id: string;
          institution_id: string;
          name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          school_id?: string;
          institution_id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      teacher_subject_assignments: {
        Row: {
          id: string;
          teacher_id: string;
          class_subject_id: string;
          school_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          class_subject_id: string;
          school_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          class_subject_id?: string;
          school_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          institution_id: string;
          class_id: string;
          student_number: string;
          first_name: string;
          last_name: string;
          gender: 'male' | 'female';
          date_of_birth: string | null;
          enrolled_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          institution_id: string;
          class_id: string;
          student_number: string;
          first_name: string;
          last_name: string;
          gender?: 'male' | 'female';
          date_of_birth?: string | null;
          enrolled_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          institution_id?: string;
          class_id?: string;
          student_number?: string;
          first_name?: string;
          last_name?: string;
          gender?: 'male' | 'female';
          date_of_birth?: string | null;
          enrolled_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      parents: {
        Row: {
          id: string;
          profile_id: string | null;
          institution_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          institution_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          institution_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      student_parents: {
        Row: {
          id: string;
          student_id: string;
          parent_id: string;
          relationship: 'father' | 'mother' | 'guardian';
          is_primary: boolean;
          can_view_results: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          parent_id: string;
          relationship?: 'father' | 'mother' | 'guardian';
          is_primary?: boolean;
          can_view_results?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          parent_id?: string;
          relationship?: 'father' | 'mother' | 'guardian';
          is_primary?: boolean;
          can_view_results?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      institution_onboarding: {
        Row: {
          id: string;
          institution_id: string;
          current_step: number;
          is_completed: boolean;
          school_created: boolean;
          classes_created: boolean;
          students_created: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          current_step?: number;
          is_completed?: boolean;
          school_created?: boolean;
          classes_created?: boolean;
          students_created?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          current_step?: number;
          is_completed?: boolean;
          school_created?: boolean;
          classes_created?: boolean;
          students_created?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cbt_exams: {
        Row: {
          id: string;
          school_id: string;
          institution_id: string;
          title: string;
          subject_id: string | null;
          class_id: string | null;
          duration_minutes: number;
          total_marks: number;
          pass_mark: number;
          status: 'draft' | 'published' | 'archived';
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          institution_id: string;
          title: string;
          subject_id?: string | null;
          class_id?: string | null;
          duration_minutes?: number;
          total_marks?: number;
          pass_mark?: number;
          status?: 'draft' | 'published' | 'archived';
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          institution_id?: string;
          title?: string;
          subject_id?: string | null;
          class_id?: string | null;
          duration_minutes?: number;
          total_marks?: number;
          pass_mark?: number;
          status?: 'draft' | 'published' | 'archived';
          created_at?: string;
        };
        Relationships: [];
      };
      cbt_questions: {
        Row: {
          id: string;
          exam_id: string;
          question_text: string;
          options: Json;
          correct_option: string;
          explanation: string | null;
          marks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          question_text: string;
          options: Json;
          correct_option: string;
          explanation?: string | null;
          marks?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          question_text?: string;
          options?: Json;
          correct_option?: string;
          explanation?: string | null;
          marks?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cbt_attempts: {
        Row: {
          id: string;
          exam_id: string;
          student_id: string;
          score: number;
          total_marks: number;
          percentage: number;
          passed: boolean;
          started_at: string;
          submitted_at: string | null;
        };
        Insert: {
          id?: string;
          exam_id: string;
          student_id: string;
          score?: number;
          total_marks?: number;
          percentage?: number;
          passed?: boolean;
          started_at?: string;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          exam_id?: string;
          student_id?: string;
          score?: number;
          total_marks?: number;
          percentage?: number;
          passed?: boolean;
          started_at?: string;
          submitted_at?: string | null;
        };
        Relationships: [];
      };
      cbt_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          student_answer: string | null;
          is_correct: boolean;
          marks_obtained: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          student_answer?: string | null;
          is_correct?: boolean;
          marks_obtained?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          student_answer?: string | null;
          is_correct?: boolean;
          marks_obtained?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cbt_results_summary: {
        Row: {
          id: string;
          exam_id: string;
          student_id: string;
          attempt_id: string;
          score: number;
          total_marks: number;
          percentage: number;
          passed: boolean;
          published_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          student_id: string;
          attempt_id: string;
          score: number;
          total_marks: number;
          percentage: number;
          passed: boolean;
          published_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          student_id?: string;
          attempt_id?: string;
          score?: number;
          total_marks?: number;
          percentage?: number;
          passed?: boolean;
          published_at?: string;
        };
        Relationships: [];
      };
      answer_scripts: {
        Row: {
          id: string;
          school_id: string;
          institution_id: string;
          student_id: string | null;
          subject_id: string | null;
          assignment_title: string;
          student_work: string;
          rubric: Json;
          status: 'queued' | 'processing' | 'completed' | 'failed' | 'pending_review' | 'approved';
          ai_score: number | null;
          ai_feedback: string | null;
          criteria_scores: Json | null;
          teacher_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          institution_id: string;
          student_id?: string | null;
          subject_id?: string | null;
          assignment_title: string;
          student_work: string;
          rubric: Json;
          status?: 'queued' | 'processing' | 'completed' | 'failed' | 'pending_review' | 'approved';
          ai_score?: number | null;
          ai_feedback?: string | null;
          criteria_scores?: Json | null;
          teacher_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          institution_id?: string;
          student_id?: string | null;
          subject_id?: string | null;
          assignment_title?: string;
          student_work?: string;
          rubric?: Json;
          status?: 'queued' | 'processing' | 'completed' | 'failed' | 'pending_review' | 'approved';
          ai_score?: number | null;
          ai_feedback?: string | null;
          criteria_scores?: Json | null;
          teacher_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_queue_status: {
        Row: {
          id: string;
          script_id: string;
          status: 'queued' | 'processing' | 'completed' | 'failed';
          queued_at: string;
          processed_at: string | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          script_id: string;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          queued_at?: string;
          processed_at?: string | null;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          script_id?: string;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          queued_at?: string;
          processed_at?: string | null;
          error_message?: string | null;
        };
        Relationships: [];
      };
      institution_health_metrics: {
        Row: {
          id: string;
          institution_id: string;
          student_count: number;
          teacher_count: number;
          class_count: number;
          active_exams_count: number;
          average_score: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_count?: number;
          teacher_count?: number;
          class_count?: number;
          active_exams_count?: number;
          average_score?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          student_count?: number;
          teacher_count?: number;
          class_count?: number;
          active_exams_count?: number;
          average_score?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_institution_account: {
        Args: {
          name?: string;
          type?: string;
          country?: string;
          institution_name?: string;
          institution_type?: string;
          registration_number?: string;
          address?: string;
          state?: string;
          lga?: string;
          phone?: string;
          email?: string;
          website?: string;
          principal_name?: string;
          principal_phone?: string;
          principal_email?: string;
          p_name?: string;
          p_type?: string;
          p_country?: string;
        };
        Returns: {
          institution_id: string;
          school_id?: string;
          name?: string;
          type?: string;
          country?: string;
          created_at?: string;
          success?: boolean;
        };
      };
      initialize_secondary_classes: {
        Args: {
          school_id?: string;
          p_school_id?: string;
        };
        Returns: {
          classes_created?: number;
          classes?: Array<{ id: string; name: string }>;
          success?: boolean;
        };
      };
      create_admin_profile: {
        Args: {
          institution_id: string;
          full_name: string;
          email: string;
          role: string;
          phone?: string;
        };
        Returns: {
          profile_id: string;
          user_id: string;
          institution_id: string;
          full_name: string;
          email: string;
          role: string;
          created_at: string;
        };
      };
      create_school_with_classes: {
        Args: {
          institution_id: string;
          school_name: string;
          school_type: string;
          email?: string;
          phone?: string;
          address?: string;
          principal_name?: string;
          vice_principal_name?: string;
          initial_classes?: string[];
        };
        Returns: {
          school_id: string;
          institution_id: string;
          school_name: string;
          classes_created_count: number;
          classes: Array<{ id: string; name: string }>;
        };
      };
      create_teacher: {
        Args: {
          institution_id?: string;
          school_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          class_subject_ids?: string[];
          p_name?: string;
          p_email?: string;
          p_phone?: string;
          p_school_id?: string;
          p_class_subject_id?: string;
          p_institution_id?: string;
        };
        Returns: {
          teacher_id: string;
          school_id?: string;
          institution_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          success?: boolean;
        };
      };
      enroll_student: {
        Args: {
          institution_id?: string;
          school_id?: string;
          class_id?: string;
          first_name?: string;
          last_name?: string;
          gender?: string;
          date_of_birth?: string;
          p_first_name?: string;
          p_last_name?: string;
          p_class_id?: string;
          p_school_id?: string;
          p_gender?: string;
          p_date_of_birth?: string;
          p_institution_id?: string;
        };
        Returns: {
          student_id: string;
          student_number: string;
          class_id?: string;
          enrolled_at?: string;
          success?: boolean;
        };
      };
      auth_pin_login: {
        Args: {
          pin?: string;
          institution_slug?: string;
          identifier?: string;
          p_identifier?: string;
          p_pin?: string;
        };
        Returns: {
          user_id: string;
          profile_id: string;
          institution_id: string;
          school_id?: string;
          role: string;
          token?: string;
          access_token?: string;
          refresh_token?: string;
        };
      };
      reconcile_and_launch: {
        Args: {
          institution_id: string;
          school_id: string;
          parent_access?: boolean;
          cbt_activated?: boolean;
          ai_grading_activated?: boolean;
        };
        Returns: {
          institution_id: string;
          institution_name: string;
          school_id: string;
          school_name: string;
          classes_count: number;
          subjects_count: number;
          teachers_count: number;
          students_count: number;
          cbt_ready: boolean;
          ai_grading_ready: boolean;
          is_valid_for_launch: boolean;
          validation_errors: string[];
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
