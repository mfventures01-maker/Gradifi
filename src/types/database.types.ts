/**
 * AUTO-GENERATED FROM LIVE SUPABASE PROJECT ehkmfnaqkdgkjmdxxbwj.
 * Source: public schema introspection, generated 2026-11-16.
 * Do not hand-edit. Extend application-specific contracts in src/contracts.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_sessions: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          institution_id: string
          is_current: boolean | null
          name: string
          semester: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          institution_id: string
          is_current?: boolean | null
          name: string
          semester?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          institution_id?: string
          is_current?: boolean | null
          name?: string
          semester?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_staff: {
        Row: {
          coe_rank: string | null
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string
          faculty_id: string | null
          first_name: string
          gender: string | null
          id: string
          institution_id: string
          is_student_supervisor: boolean | null
          last_name: string
          max_students: number | null
          metadata: Json | null
          middle_name: string | null
          phone: string | null
          polytechnic_rank: string | null
          position_type: string | null
          qualification: string | null
          research_interests: string[] | null
          specialization: string | null
          staff_number: string
          title: string | null
          university_rank: string | null
          updated_at: string | null
        }
        Insert: {
          coe_rank?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email: string
          faculty_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          institution_id: string
          is_student_supervisor?: boolean | null
          last_name: string
          max_students?: number | null
          metadata?: Json | null
          middle_name?: string | null
          phone?: string | null
          polytechnic_rank?: string | null
          position_type?: string | null
          qualification?: string | null
          research_interests?: string[] | null
          specialization?: string | null
          staff_number: string
          title?: string | null
          university_rank?: string | null
          updated_at?: string | null
        }
        Update: {
          coe_rank?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string
          faculty_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          institution_id?: string
          is_student_supervisor?: boolean | null
          last_name?: string
          max_students?: number | null
          metadata?: Json | null
          middle_name?: string | null
          phone?: string | null
          polytechnic_rank?: string | null
          position_type?: string | null
          qualification?: string | null
          research_interests?: string[] | null
          specialization?: string | null
          staff_number?: string
          title?: string | null
          university_rank?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_staff_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_staff_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          institution_id: string
          metadata: Json
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          metadata?: Json
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_queue_status: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          exam_id: string | null
          id: string
          institution_id: string | null
          retry_count: number | null
          school_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          exam_id?: string | null
          id?: string
          institution_id?: string | null
          retry_count?: number | null
          school_id?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          exam_id?: string | null
          id?: string
          institution_id?: string | null
          retry_count?: number | null
          school_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_queue_status_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queue_status_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queue_status_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_scripts: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          assignment_title: string | null
          confidence: number | null
          created_at: string | null
          exam_id: string | null
          file_url: string | null
          final_score: number | null
          grading_status: string | null
          id: string
          ocr_text: string | null
          override_justification: string | null
          released_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rubric_scores: Json | null
          school_id: string | null
          score: number | null
          status: string | null
          student_id: string | null
          subject_id: string | null
          teacher_feedback: string | null
          teacher_id: string | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          assignment_title?: string | null
          confidence?: number | null
          created_at?: string | null
          exam_id?: string | null
          file_url?: string | null
          final_score?: number | null
          grading_status?: string | null
          id?: string
          ocr_text?: string | null
          override_justification?: string | null
          released_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric_scores?: Json | null
          school_id?: string | null
          score?: number | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_feedback?: string | null
          teacher_id?: string | null
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          assignment_title?: string | null
          confidence?: number | null
          created_at?: string | null
          exam_id?: string | null
          file_url?: string | null
          final_score?: number | null
          grading_status?: string | null
          id?: string
          ocr_text?: string | null
          override_justification?: string | null
          released_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric_scores?: Json | null
          school_id?: string | null
          score?: number | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_feedback?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_scripts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_scripts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_scripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "answer_scripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "answer_scripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_scripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "answer_scripts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "answer_scripts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_states: {
        Row: {
          adviser_approved: boolean | null
          adviser_approved_at: string | null
          adviser_comments: string | null
          created_at: string | null
          current_state: string
          dean_approved: boolean | null
          dean_approved_at: string | null
          dean_comments: string | null
          hod_approved: boolean | null
          hod_approved_at: string | null
          hod_comments: string | null
          id: string
          similarity_threshold: number | null
          submission_id: string | null
        }
        Insert: {
          adviser_approved?: boolean | null
          adviser_approved_at?: string | null
          adviser_comments?: string | null
          created_at?: string | null
          current_state?: string
          dean_approved?: boolean | null
          dean_approved_at?: string | null
          dean_comments?: string | null
          hod_approved?: boolean | null
          hod_approved_at?: string | null
          hod_comments?: string | null
          id?: string
          similarity_threshold?: number | null
          submission_id?: string | null
        }
        Update: {
          adviser_approved?: boolean | null
          adviser_approved_at?: string | null
          adviser_comments?: string | null
          created_at?: string | null
          current_state?: string
          dean_approved?: boolean | null
          dean_approved_at?: string | null
          dean_comments?: string | null
          hod_approved?: boolean | null
          hod_approved_at?: string | null
          hod_comments?: string | null
          id?: string
          similarity_threshold?: number | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_states_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string | null
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      billable_events: {
        Row: {
          actor_user_id: string | null
          confirmed_at: string | null
          created_at: string
          currency: string | null
          id: string
          idempotency_key: string
          institution_id: string
          metadata: Json
          price_version_id: string | null
          quantity: number
          request_fingerprint: string | null
          school_id: string | null
          service_version_id: string
          status: string
          total_amount: number | null
          unit_amount: number | null
        }
        Insert: {
          actor_user_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          idempotency_key: string
          institution_id: string
          metadata?: Json
          price_version_id?: string | null
          quantity?: number
          request_fingerprint?: string | null
          school_id?: string | null
          service_version_id: string
          status?: string
          total_amount?: number | null
          unit_amount?: number | null
        }
        Update: {
          actor_user_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          idempotency_key?: string
          institution_id?: string
          metadata?: Json
          price_version_id?: string | null
          quantity?: number
          request_fingerprint?: string | null
          school_id?: string | null
          service_version_id?: string
          status?: string
          total_amount?: number | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billable_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_events_price_version_id_fkey"
            columns: ["price_version_id"]
            isOneToOne: false
            referencedRelation: "price_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_events_service_version_id_fkey"
            columns: ["service_version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      bursars: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          profile_id: string | null
          school_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          profile_id?: string | null
          school_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          profile_id?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bursars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursars_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_answers: {
        Row: {
          attempt_id: string
          created_at: string | null
          id: string
          is_correct: boolean | null
          marked_by_teacher: boolean | null
          marks_awarded: number | null
          question_id: string
          selected_option_id: string | null
          theory_answer: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          marked_by_teacher?: boolean | null
          marks_awarded?: number | null
          question_id: string
          selected_option_id?: string | null
          theory_answer?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          marked_by_teacher?: boolean | null
          marks_awarded?: number | null
          question_id?: string
          selected_option_id?: string | null
          theory_answer?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "cbt_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "cbt_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "cbt_options"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_attempts: {
        Row: {
          attempt_number: number
          candidate_id: string
          created_at: string | null
          deadline_at: string
          end_time: string | null
          exam_id: string
          id: string
          percentage: number | null
          score: number | null
          start_time: string
          status: string | null
          student_id: string | null
          submitted_at: string | null
          total_marks: number | null
        }
        Insert: {
          attempt_number: number
          candidate_id: string
          created_at?: string | null
          deadline_at: string
          end_time?: string | null
          exam_id: string
          id?: string
          percentage?: number | null
          score?: number | null
          start_time?: string
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          total_marks?: number | null
        }
        Update: {
          attempt_number?: number
          candidate_id?: string
          created_at?: string | null
          deadline_at?: string
          end_time?: string | null
          exam_id?: string
          id?: string
          percentage?: number | null
          score?: number | null
          start_time?: string
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_attempts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "cbt_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "cbt_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "v_cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "cbt_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "cbt_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      cbt_candidates: {
        Row: {
          candidate_type: string
          created_at: string
          id: string
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          candidate_type: string
          created_at?: string
          id?: string
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          candidate_type?: string
          created_at?: string
          id?: string
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_candidates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "cbt_candidates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "cbt_candidates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_candidates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      cbt_exams: {
        Row: {
          class_id: string
          created_at: string | null
          created_by: string | null
          current_state: string
          description: string | null
          duration_minutes: number
          end_time: string | null
          exam_date: string | null
          id: string
          pass_mark: number | null
          previous_state: string | null
          school_id: string
          start_time: string | null
          status: string | null
          subject_id: string
          term_id: string | null
          title: string
          total_marks: number
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          created_by?: string | null
          current_state?: string
          description?: string | null
          duration_minutes: number
          end_time?: string | null
          exam_date?: string | null
          id?: string
          pass_mark?: number | null
          previous_state?: string | null
          school_id: string
          start_time?: string | null
          status?: string | null
          subject_id: string
          term_id?: string | null
          title: string
          total_marks?: number
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          current_state?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          exam_date?: string | null
          id?: string
          pass_mark?: number | null
          previous_state?: string | null
          school_id?: string
          start_time?: string | null
          status?: string | null
          subject_id?: string
          term_id?: string | null
          title?: string
          total_marks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cbt_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_options: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          option_letter: string
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_letter: string
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_letter?: string
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "cbt_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_questions: {
        Row: {
          created_at: string | null
          difficulty: string | null
          exam_id: string
          id: string
          image_url: string | null
          marks: number
          question_number: number
          question_text: string
          question_type: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: string | null
          exam_id: string
          id?: string
          image_url?: string | null
          marks?: number
          question_number: number
          question_text: string
          question_type?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: string | null
          exam_id?: string
          id?: string
          image_url?: string | null
          marks?: number
          question_number?: number
          question_text?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "cbt_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "v_cbt_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_results_summary: {
        Row: {
          attempt_id: string
          candidate_id: string
          created_at: string | null
          exam_id: string
          grade: string | null
          id: string
          percentage: number | null
          position: number | null
          score: number
          student_id: string | null
          total_marks: number
        }
        Insert: {
          attempt_id: string
          candidate_id: string
          created_at?: string | null
          exam_id: string
          grade?: string | null
          id?: string
          percentage?: number | null
          position?: number | null
          score: number
          student_id?: string | null
          total_marks?: number
        }
        Update: {
          attempt_id?: string
          candidate_id?: string
          created_at?: string | null
          exam_id?: string
          grade?: string | null
          id?: string
          percentage?: number | null
          position?: number | null
          score?: number
          student_id?: string | null
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "cbt_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "cbt_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_results_summary_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "cbt_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_results_summary_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_results_summary_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "cbt_results_summary_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "v_cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_results_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "cbt_results_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "cbt_results_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_results_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      cbt_session_snapshots: {
        Row: {
          created_at: string
          current_question: number
          id: string
          remaining_time: number
          session_id: string
          state: string
        }
        Insert: {
          created_at?: string
          current_question: number
          id?: string
          remaining_time: number
          session_id: string
          state: string
        }
        Update: {
          created_at?: string
          current_question?: number
          id?: string
          remaining_time?: number
          session_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_session_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cbt_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_sessions: {
        Row: {
          attempt_id: string
          candidate_id: string
          created_at: string
          current_question: number
          exam_id: string
          id: string
          is_synced: boolean
          remaining_time: number
          state: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_id: string
          candidate_id: string
          created_at?: string
          current_question?: number
          exam_id: string
          id?: string
          is_synced?: boolean
          remaining_time?: number
          state?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          candidate_id?: string
          created_at?: string
          current_question?: number
          exam_id?: string
          id?: string
          is_synced?: boolean
          remaining_time?: number
          state?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_sessions_attempt_candidate_fkey"
            columns: ["attempt_id", "exam_id", "candidate_id"]
            isOneToOne: false
            referencedRelation: "cbt_attempts"
            referencedColumns: ["id", "exam_id", "candidate_id"]
          },
          {
            foreignKeyName: "cbt_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "cbt_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          blockchain_anchored: boolean | null
          blockchain_network: string | null
          blockchain_tx_hash: string | null
          certificate_hash: string
          certificate_number: string
          created_at: string | null
          expires_at: string | null
          id: string
          institution_id: string
          is_revoked: boolean | null
          issue_date: string | null
          issued_at: string | null
          matriculation_number: string
          metadata: Json | null
          plagiarism_check_id: string | null
          project_title: string | null
          qr_code_url: string | null
          similarity_score: number | null
          student_id: string
          student_name: string
          updated_at: string | null
          verification_url: string | null
        }
        Insert: {
          blockchain_anchored?: boolean | null
          blockchain_network?: string | null
          blockchain_tx_hash?: string | null
          certificate_hash: string
          certificate_number: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution_id: string
          is_revoked?: boolean | null
          issue_date?: string | null
          issued_at?: string | null
          matriculation_number: string
          metadata?: Json | null
          plagiarism_check_id?: string | null
          project_title?: string | null
          qr_code_url?: string | null
          similarity_score?: number | null
          student_id: string
          student_name: string
          updated_at?: string | null
          verification_url?: string | null
        }
        Update: {
          blockchain_anchored?: boolean | null
          blockchain_network?: string | null
          blockchain_tx_hash?: string | null
          certificate_hash?: string
          certificate_number?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string
          is_revoked?: boolean | null
          issue_date?: string | null
          issued_at?: string | null
          matriculation_number?: string
          metadata?: Json | null
          plagiarism_check_id?: string | null
          project_title?: string | null
          qr_code_url?: string | null
          similarity_score?: number | null
          student_id?: string
          student_name?: string
          updated_at?: string | null
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          school_id: string
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          school_id: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          school_id?: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      context_resolver_state: {
        Row: {
          context_type: string
          created_at: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          metadata: Json | null
          resolved_entity_id: string
          user_id: string
        }
        Insert: {
          context_type: string
          created_at?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          metadata?: Json | null
          resolved_entity_id: string
          user_id: string
        }
        Update: {
          context_type?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          metadata?: Json | null
          resolved_entity_id?: string
          user_id?: string
        }
        Relationships: []
      }
      course_registrations: {
        Row: {
          academic_session_id: string | null
          course_code: string
          course_title: string
          created_at: string | null
          credit_units: number
          grade: string | null
          grade_points: number | null
          id: string
          registration_date: string | null
          semester: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          academic_session_id?: string | null
          course_code: string
          course_title: string
          created_at?: string | null
          credit_units: number
          grade?: string | null
          grade_points?: number | null
          id?: string
          registration_date?: string | null
          semester?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          academic_session_id?: string | null
          course_code?: string
          course_title?: string
          created_at?: string | null
          credit_units?: number
          grade?: string | null
          grade_points?: number | null
          id?: string
          registration_date?: string | null
          semester?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "course_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "course_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          department_type: string | null
          description: string | null
          faculty_id: string
          hod_email: string | null
          hod_name: string | null
          id: string
          institution_id: string
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          department_type?: string | null
          description?: string | null
          faculty_id: string
          hod_email?: string | null
          hod_name?: string | null
          id?: string
          institution_id: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          department_type?: string | null
          description?: string | null
          faculty_id?: string
          hod_email?: string | null
          hod_name?: string | null
          id?: string
          institution_id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          student_name: string
          tenant_id: string
          uploaded_at: string | null
        }
        Insert: {
          id?: string
          student_name: string
          tenant_id: string
          uploaded_at?: string | null
        }
        Update: {
          id?: string
          student_name?: string
          tenant_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string | null
          created_at: string | null
          exam_date: string | null
          exam_title: string
          id: string
          school_id: string | null
          subject_id: string | null
          teacher_id: string | null
          term: string | null
          total_marks: number | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          exam_date?: string | null
          exam_title: string
          id?: string
          school_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          total_marks?: number | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          exam_date?: string | null
          exam_title?: string
          id?: string
          school_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "exams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          code: string
          created_at: string | null
          dean_email: string | null
          dean_name: string | null
          description: string | null
          faculty_type: string | null
          id: string
          institution_id: string | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          dean_email?: string | null
          dean_name?: string | null
          description?: string | null
          faculty_type?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          dean_email?: string | null
          dean_name?: string | null
          description?: string | null
          faculty_type?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculties_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          full_name: string
          id: string
          institution_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          institution_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          institution_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      fsm_entity_state: {
        Row: {
          context: Json | null
          current_state: string
          entity_id: string
          entity_type: string
          id: string
          institution_id: string
          previous_state: string | null
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          current_state: string
          entity_id: string
          entity_type: string
          id?: string
          institution_id: string
          previous_state?: string | null
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          current_state?: string
          entity_id?: string
          entity_type?: string
          id?: string
          institution_id?: string
          previous_state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fsm_events: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          from_state: string | null
          id: string
          institution_id: string | null
          metadata: Json | null
          to_state: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          from_state?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          to_state?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          from_state?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          to_state?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      fsm_transitions: {
        Row: {
          action: string | null
          allowed_roles: string[] | null
          entity_type: string | null
          from_state: string | null
          id: string
          to_state: string | null
        }
        Insert: {
          action?: string | null
          allowed_roles?: string[] | null
          entity_type?: string | null
          from_state?: string | null
          id?: string
          to_state?: string | null
        }
        Update: {
          action?: string | null
          allowed_roles?: string[] | null
          entity_type?: string | null
          from_state?: string | null
          id?: string
          to_state?: string | null
        }
        Relationships: []
      }
      gradifi_exam_bodies: {
        Row: {
          code: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      gradifi_exam_programmes: {
        Row: {
          code: string
          created_at: string
          exam_body_id: string
          id: string
          is_active: boolean
          level: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          exam_body_id: string
          id?: string
          is_active?: boolean
          level: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          exam_body_id?: string
          id?: string
          is_active?: boolean
          level?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_exam_programmes_exam_body_id_fkey"
            columns: ["exam_body_id"]
            isOneToOne: false
            referencedRelation: "gradifi_exam_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_exam_question_map: {
        Row: {
          created_at: string
          display_order: number
          exam_id: string
          id: string
          marks: number
          question_version_id: string
        }
        Insert: {
          created_at?: string
          display_order: number
          exam_id: string
          id?: string
          marks?: number
          question_version_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          exam_id?: string
          id?: string
          marks?: number
          question_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_exam_question_map_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_exam_question_map_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "gradifi_exam_question_map_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "v_cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_exam_question_map_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_bank_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_exam_question_snapshots: {
        Row: {
          answer_key_payload: Json
          content_sha256: string
          created_at: string
          display_order: number
          exam_id: string
          id: string
          question_payload: Json
          source_question_version_id: string | null
        }
        Insert: {
          answer_key_payload: Json
          content_sha256: string
          created_at?: string
          display_order: number
          exam_id: string
          id?: string
          question_payload: Json
          source_question_version_id?: string | null
        }
        Update: {
          answer_key_payload?: Json
          content_sha256?: string
          created_at?: string
          display_order?: number
          exam_id?: string
          id?: string
          question_payload?: Json
          source_question_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_exam_question_snapshots_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_exam_question_snapshots_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "gradifi_exam_question_snapshots_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "v_cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_exam_question_snapshots_source_question_version_id_fkey"
            columns: ["source_question_version_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_bank_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_exam_sessions: {
        Row: {
          created_at: string
          id: string
          programme_id: string
          session_label: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          programme_id: string
          session_label?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          programme_id?: string
          session_label?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_exam_sessions_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "gradifi_exam_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_question_bank_answer_keys: {
        Row: {
          correct_option_id: string
          created_at: string
          explanation_math_latex: string | null
          explanation_text: string | null
          question_version_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          correct_option_id: string
          created_at?: string
          explanation_math_latex?: string | null
          explanation_text?: string | null
          question_version_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          correct_option_id?: string
          created_at?: string
          explanation_math_latex?: string | null
          explanation_text?: string | null
          question_version_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_answer_key_option_same_version_fk"
            columns: ["correct_option_id", "question_version_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_bank_options"
            referencedColumns: ["id", "question_version_id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_answer_keys_correct_option_id_fkey"
            columns: ["correct_option_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_bank_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_answer_keys_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: true
            referencedRelation: "gradifi_question_bank_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_question_bank_items: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          exam_session_id: string
          id: string
          paper_code: string | null
          programme_id: string
          question_number: string
          source_page_asset_id: string | null
          subject_id: string
          subtopic: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          exam_session_id: string
          id?: string
          paper_code?: string | null
          programme_id: string
          question_number: string
          source_page_asset_id?: string | null
          subject_id: string
          subtopic?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          exam_session_id?: string
          id?: string
          paper_code?: string | null
          programme_id?: string
          question_number?: string
          source_page_asset_id?: string | null
          subject_id?: string
          subtopic?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_bank_item_session_programme_fk"
            columns: ["exam_session_id", "programme_id"]
            isOneToOne: false
            referencedRelation: "gradifi_exam_sessions"
            referencedColumns: ["id", "programme_id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_items_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "gradifi_exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_items_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "gradifi_exam_programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_items_source_page_asset_id_fkey"
            columns: ["source_page_asset_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_page_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_question_bank_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          option_image_asset_id: string | null
          option_label: string
          option_math_latex: string | null
          option_text: string
          question_version_id: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          option_image_asset_id?: string | null
          option_label: string
          option_math_latex?: string | null
          option_text: string
          question_version_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          option_image_asset_id?: string | null
          option_label?: string
          option_math_latex?: string | null
          option_text?: string
          question_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_question_bank_options_option_image_asset_id_fkey"
            columns: ["option_image_asset_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_page_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_options_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_bank_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_question_bank_versions: {
        Row: {
          created_at: string
          created_by: string | null
          explanation_math_latex: string | null
          explanation_text: string | null
          extraction_confidence: number | null
          extraction_method: string
          id: string
          question_image_asset_id: string | null
          question_item_id: string
          question_math_latex: string | null
          question_text: string
          question_type: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          explanation_math_latex?: string | null
          explanation_text?: string | null
          extraction_confidence?: number | null
          extraction_method?: string
          id?: string
          question_image_asset_id?: string | null
          question_item_id: string
          question_math_latex?: string | null
          question_text: string
          question_type?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          explanation_math_latex?: string | null
          explanation_text?: string | null
          extraction_confidence?: number | null
          extraction_method?: string
          id?: string
          question_image_asset_id?: string | null
          question_item_id?: string
          question_math_latex?: string | null
          question_text?: string
          question_type?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_question_bank_versions_question_image_asset_id_fkey"
            columns: ["question_image_asset_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_page_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_bank_versions_question_item_id_fkey"
            columns: ["question_item_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_bank_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_question_capture_batches: {
        Row: {
          capture_method: string
          created_at: string
          exam_session_id: string | null
          id: string
          notes: string | null
          status: string
          subject_id: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          capture_method?: string
          created_at?: string
          exam_session_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          subject_id: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          capture_method?: string
          created_at?: string
          exam_session_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          subject_id?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_question_capture_batches_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "gradifi_exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_capture_batches_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_question_ocr_jobs: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string
          engine_name: string | null
          engine_version: string | null
          error_code: string | null
          error_message: string | null
          extracted_payload: Json | null
          id: string
          page_asset_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string
          engine_name?: string | null
          engine_version?: string | null
          error_code?: string | null
          error_message?: string | null
          extracted_payload?: Json | null
          id?: string
          page_asset_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          engine_name?: string | null
          engine_version?: string | null
          error_code?: string | null
          error_message?: string | null
          extracted_payload?: Json | null
          id?: string
          page_asset_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_question_ocr_jobs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_capture_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_question_ocr_jobs_page_asset_id_fkey"
            columns: ["page_asset_id"]
            isOneToOne: true
            referencedRelation: "gradifi_question_page_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_question_page_assets: {
        Row: {
          batch_id: string
          created_at: string
          file_size_bytes: number | null
          id: string
          image_height: number | null
          image_width: number | null
          mime_type: string
          original_filename: string | null
          page_number: number | null
          sha256_hex: string | null
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          mime_type: string
          original_filename?: string | null
          page_number?: number | null
          sha256_hex?: string | null
          storage_bucket?: string
          storage_path: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          mime_type?: string
          original_filename?: string | null
          page_number?: number | null
          sha256_hex?: string | null
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_question_page_assets_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "gradifi_question_capture_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_school_memberships: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          invited_by: string | null
          member_role: string
          school_id: string
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          member_role: string
          school_id: string
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          member_role?: string
          school_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      gradifi_school_onboarding_requests: {
        Row: {
          address: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          country_code: string
          created_at: string
          id: string
          institution_category: string
          institution_id: string | null
          institution_name: string
          lga: string | null
          registration_number: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          school_type: string | null
          state: string | null
          status: string
          submitted_by: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          id?: string
          institution_category: string
          institution_id?: string | null
          institution_name: string
          lga?: string | null
          registration_number?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          school_type?: string | null
          state?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          id?: string
          institution_category?: string
          institution_id?: string | null
          institution_name?: string
          lga?: string | null
          registration_number?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          school_type?: string | null
          state?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gradifi_school_onboarding_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradifi_school_onboarding_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_jobs: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          script_id: string
          status: string | null
          worker_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          script_id: string
          status?: string | null
          worker_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          script_id?: string
          status?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_jobs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "answer_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_results: {
        Row: {
          ai_feedback: string | null
          answer_script_id: string
          confidence: number | null
          created_at: string | null
          grading_status: string | null
          id: string
          score: number | null
        }
        Insert: {
          ai_feedback?: string | null
          answer_script_id: string
          confidence?: number | null
          created_at?: string | null
          grading_status?: string | null
          id?: string
          score?: number | null
        }
        Update: {
          ai_feedback?: string | null
          answer_script_id?: string
          confidence?: number | null
          created_at?: string | null
          grading_status?: string | null
          id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_results_answer_script_id_fkey"
            columns: ["answer_script_id"]
            isOneToOne: true
            referencedRelation: "answer_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          classification: string | null
          created_at: string | null
          description: string | null
          grade_letter: string
          grade_point: number
          id: string
          institution_id: string
          max_score: number
          metadata: Json | null
          min_score: number
          scale_type: string | null
          updated_at: string | null
        }
        Insert: {
          classification?: string | null
          created_at?: string | null
          description?: string | null
          grade_letter: string
          grade_point: number
          id?: string
          institution_id: string
          max_score: number
          metadata?: Json | null
          min_score: number
          scale_type?: string | null
          updated_at?: string | null
        }
        Update: {
          classification?: string | null
          created_at?: string | null
          description?: string | null
          grade_letter?: string
          grade_point?: number
          id?: string
          institution_id?: string
          max_score?: number
          metadata?: Json | null
          min_score?: number
          scale_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_scales_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_submissions: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          error_message: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          institution_id: string
          ocr_confidence: number | null
          ocr_processing_time: number | null
          ocr_status: string | null
          ocr_text: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          institution_id: string
          ocr_confidence?: number | null
          ocr_processing_time?: number | null
          ocr_status?: string | null
          ocr_text?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          institution_id?: string
          ocr_confidence?: number | null
          ocr_processing_time?: number | null
          ocr_status?: string | null
          ocr_text?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_submissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grading_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grading_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      identity_actors: {
        Row: {
          actor_record_id: string | null
          actor_type: string
          auth_method: string
          auth_user_id: string
          authority_user_id: string | null
          created_at: string | null
          failed_attempts: number | null
          id: string
          institution_id: string
          last_login_at: string | null
          locked_until: string | null
          login_identifier: string
          pin_changed_at: string | null
          pin_hash: string | null
          school_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actor_record_id?: string | null
          actor_type: string
          auth_method?: string
          auth_user_id: string
          authority_user_id?: string | null
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          institution_id: string
          last_login_at?: string | null
          locked_until?: string | null
          login_identifier: string
          pin_changed_at?: string | null
          pin_hash?: string | null
          school_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actor_record_id?: string | null
          actor_type?: string
          auth_method?: string
          auth_user_id?: string
          authority_user_id?: string | null
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          institution_id?: string
          last_login_at?: string | null
          locked_until?: string | null
          login_identifier?: string
          pin_changed_at?: string | null
          pin_hash?: string | null
          school_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_actors_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_actors_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_health_metrics: {
        Row: {
          active_users_count: number | null
          ai_grading_consumption: number | null
          exams_created_this_month: number | null
          id: string
          institution_id: string | null
          last_calculated_at: string | null
          storage_used_bytes: number | null
        }
        Insert: {
          active_users_count?: number | null
          ai_grading_consumption?: number | null
          exams_created_this_month?: number | null
          id?: string
          institution_id?: string | null
          last_calculated_at?: string | null
          storage_used_bytes?: number | null
        }
        Update: {
          active_users_count?: number | null
          ai_grading_consumption?: number | null
          exams_created_this_month?: number | null
          id?: string
          institution_id?: string | null
          last_calculated_at?: string | null
          storage_used_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_health_metrics_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_onboarding: {
        Row: {
          classes_created: boolean | null
          completed: boolean | null
          created_at: string | null
          id: string
          institution_created: boolean | null
          institution_id: string | null
          school_created: boolean | null
          students_created: boolean | null
          subjects_created: boolean | null
          teachers_created: boolean | null
          updated_at: string | null
        }
        Insert: {
          classes_created?: boolean | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          institution_created?: boolean | null
          institution_id?: string | null
          school_created?: boolean | null
          students_created?: boolean | null
          subjects_created?: boolean | null
          teachers_created?: boolean | null
          updated_at?: string | null
        }
        Update: {
          classes_created?: boolean | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          institution_created?: boolean | null
          institution_id?: string | null
          school_created?: boolean | null
          students_created?: boolean | null
          subjects_created?: boolean | null
          teachers_created?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_onboarding_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_plagiarism_checks: {
        Row: {
          ai_probability: number | null
          approval_status: string | null
          checked_at: string | null
          checked_by: string | null
          committee_chairman_signature_url: string | null
          created_at: string | null
          dean_remarks: string | null
          dean_signature_url: string | null
          flagged_sections: Json | null
          hod_remarks: string | null
          hod_signature_url: string | null
          id: string
          institution_id: string
          matriculation_number: string
          plagiarism_report_url: string | null
          project_title: string | null
          secretary_signature_url: string | null
          similarity_score: number | null
          student_id: string
          student_name: string
          submission_date: string | null
          supervisor_name: string | null
          supervisor_remarks: string | null
          supervisor_signature_url: string | null
          updated_at: string | null
        }
        Insert: {
          ai_probability?: number | null
          approval_status?: string | null
          checked_at?: string | null
          checked_by?: string | null
          committee_chairman_signature_url?: string | null
          created_at?: string | null
          dean_remarks?: string | null
          dean_signature_url?: string | null
          flagged_sections?: Json | null
          hod_remarks?: string | null
          hod_signature_url?: string | null
          id?: string
          institution_id: string
          matriculation_number: string
          plagiarism_report_url?: string | null
          project_title?: string | null
          secretary_signature_url?: string | null
          similarity_score?: number | null
          student_id: string
          student_name: string
          submission_date?: string | null
          supervisor_name?: string | null
          supervisor_remarks?: string | null
          supervisor_signature_url?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_probability?: number | null
          approval_status?: string | null
          checked_at?: string | null
          checked_by?: string | null
          committee_chairman_signature_url?: string | null
          created_at?: string | null
          dean_remarks?: string | null
          dean_signature_url?: string | null
          flagged_sections?: Json | null
          hod_remarks?: string | null
          hod_signature_url?: string | null
          id?: string
          institution_id?: string
          matriculation_number?: string
          plagiarism_report_url?: string | null
          project_title?: string | null
          secretary_signature_url?: string | null
          similarity_score?: number | null
          student_id?: string
          student_name?: string
          submission_date?: string | null
          supervisor_name?: string | null
          supervisor_remarks?: string | null
          supervisor_signature_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_plagiarism_checks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "institution_plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "institution_plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          approval_workflow: Json | null
          created_at: string | null
          custom_domain: string | null
          grading_rubric: Json | null
          id: string
          institution_id: string
          logo_url: string | null
          primary_color: string | null
          report_footer_template: string | null
          report_header_template: string | null
          seal_url: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          approval_workflow?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          grading_rubric?: Json | null
          id?: string
          institution_id: string
          logo_url?: string | null
          primary_color?: string | null
          report_footer_template?: string | null
          report_header_template?: string | null
          seal_url?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_workflow?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          grading_rubric?: Json | null
          id?: string
          institution_id?: string
          logo_url?: string | null
          primary_color?: string | null
          report_footer_template?: string | null
          report_header_template?: string | null
          seal_url?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_type_reference: {
        Row: {
          allowed_degree_types: string[] | null
          created_at: string | null
          default_grading_scale: string | null
          description: string | null
          id: string
          regulatory_body: string
          type: string
        }
        Insert: {
          allowed_degree_types?: string[] | null
          created_at?: string | null
          default_grading_scale?: string | null
          description?: string | null
          id?: string
          regulatory_body: string
          type: string
        }
        Update: {
          allowed_degree_types?: string[] | null
          created_at?: string | null
          default_grading_scale?: string | null
          description?: string | null
          id?: string
          regulatory_body?: string
          type?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          address: string | null
          country: string
          created_at: string | null
          established_year: number | null
          id: string
          institution_category: string | null
          lga: string | null
          name: string
          phone: string | null
          registration_number: string | null
          state: string | null
          type: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          country: string
          created_at?: string | null
          established_year?: number | null
          id?: string
          institution_category?: string | null
          lga?: string | null
          name: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          type: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          country?: string
          created_at?: string | null
          established_year?: number | null
          id?: string
          institution_category?: string | null
          lga?: string | null
          name?: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          type?: string
          website_url?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          institution_id: string
          role_id: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          institution_id: string
          role_id?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string
          role_id?: string | null
          status?: string | null
          token?: string | null
        }
        Relationships: []
      }
      lecturers: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          faculty_id: string | null
          first_name: string
          id: string
          is_graduate_student_supervisor: boolean | null
          last_name: string
          max_students: number | null
          phone: string | null
          rank: string | null
          school_id: string
          specialization: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email: string
          faculty_id?: string | null
          first_name: string
          id?: string
          is_graduate_student_supervisor?: boolean | null
          last_name: string
          max_students?: number | null
          phone?: string | null
          rank?: string | null
          school_id: string
          specialization?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string
          faculty_id?: string | null
          first_name?: string
          id?: string
          is_graduate_student_supervisor?: boolean | null
          last_name?: string
          max_students?: number | null
          phone?: string | null
          rank?: string | null
          school_id?: string
          specialization?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecturers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      marking_schemes: {
        Row: {
          created_at: string | null
          criterion: string
          description: string | null
          exam_id: string
          id: string
          points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criterion: string
          description?: string | null
          exam_id: string
          id?: string
          points: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criterion?: string
          description?: string | null
          exam_id?: string
          id?: string
          points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marking_schemes_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      nerd_compliance_log: {
        Row: {
          check_id: string | null
          compliance_status: string | null
          created_at: string | null
          deposited_at: string | null
          id: string
          institution_id: string
          nerd_reference_number: string | null
          nerd_response: Json | null
          originality_score: number | null
          student_id: string
          submission_type: string | null
        }
        Insert: {
          check_id?: string | null
          compliance_status?: string | null
          created_at?: string | null
          deposited_at?: string | null
          id?: string
          institution_id: string
          nerd_reference_number?: string | null
          nerd_response?: Json | null
          originality_score?: number | null
          student_id: string
          submission_type?: string | null
        }
        Update: {
          check_id?: string | null
          compliance_status?: string | null
          created_at?: string | null
          deposited_at?: string | null
          id?: string
          institution_id?: string
          nerd_reference_number?: string | null
          nerd_response?: Json | null
          originality_score?: number | null
          student_id?: string
          submission_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nerd_compliance_log_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "plagiarism_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nerd_compliance_log_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nerd_compliance_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nerd_compliance_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nerd_compliance_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nerd_compliance_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          payload: Json
          profile_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          template_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          payload: Json
          profile_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          template_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          payload?: Json
          profile_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nuc_departments: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          faculty_id: string
          hod_email: string | null
          hod_id: string | null
          hod_name: string | null
          id: string
          institution_id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          faculty_id: string
          hod_email?: string | null
          hod_id?: string | null
          hod_name?: string | null
          id?: string
          institution_id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          faculty_id?: string
          hod_email?: string | null
          hod_id?: string | null
          hod_name?: string | null
          id?: string
          institution_id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuc_departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "nuc_faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuc_departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      nuc_faculties: {
        Row: {
          code: string
          created_at: string | null
          dean_email: string | null
          dean_id: string | null
          dean_name: string | null
          description: string | null
          id: string
          institution_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          dean_email?: string | null
          dean_id?: string | null
          dean_name?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          dean_email?: string | null
          dean_id?: string | null
          dean_name?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuc_faculties_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      nuc_grading_requests: {
        Row: {
          ai_feedback: string | null
          ai_grade: number | null
          assignment_id: string | null
          created_at: string | null
          dean_approved: boolean | null
          dean_remarks: string | null
          final_grade: number | null
          hod_approved: boolean | null
          hod_remarks: string | null
          id: string
          institution_id: string
          plagiarism_score: number | null
          plagiarism_sources: Json | null
          status: string | null
          student_id: string
          submission_date: string | null
          submission_file_url: string | null
          submission_text: string | null
          supervisor_approved: boolean | null
          supervisor_assignment_id: string
          supervisor_remarks: string | null
          updated_at: string | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_grade?: number | null
          assignment_id?: string | null
          created_at?: string | null
          dean_approved?: boolean | null
          dean_remarks?: string | null
          final_grade?: number | null
          hod_approved?: boolean | null
          hod_remarks?: string | null
          id?: string
          institution_id: string
          plagiarism_score?: number | null
          plagiarism_sources?: Json | null
          status?: string | null
          student_id: string
          submission_date?: string | null
          submission_file_url?: string | null
          submission_text?: string | null
          supervisor_approved?: boolean | null
          supervisor_assignment_id: string
          supervisor_remarks?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_feedback?: string | null
          ai_grade?: number | null
          assignment_id?: string | null
          created_at?: string | null
          dean_approved?: boolean | null
          dean_remarks?: string | null
          final_grade?: number | null
          hod_approved?: boolean | null
          hod_remarks?: string | null
          id?: string
          institution_id?: string
          plagiarism_score?: number | null
          plagiarism_sources?: Json | null
          status?: string | null
          student_id?: string
          submission_date?: string | null
          submission_file_url?: string | null
          submission_text?: string | null
          supervisor_approved?: boolean | null
          supervisor_assignment_id?: string
          supervisor_remarks?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuc_grading_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuc_grading_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nuc_grading_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nuc_grading_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuc_grading_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nuc_grading_requests_supervisor_assignment_id_fkey"
            columns: ["supervisor_assignment_id"]
            isOneToOne: false
            referencedRelation: "nuc_supervisor_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      nuc_grading_scales: {
        Row: {
          classification: string | null
          created_at: string | null
          description: string | null
          grade_letter: string | null
          grade_point: number | null
          id: string
          institution_id: string | null
          is_default: boolean | null
          max_cgpa: number | null
          min_cgpa: number | null
          percentage_range: string | null
          scale_name: string | null
          updated_at: string | null
        }
        Insert: {
          classification?: string | null
          created_at?: string | null
          description?: string | null
          grade_letter?: string | null
          grade_point?: number | null
          id?: string
          institution_id?: string | null
          is_default?: boolean | null
          max_cgpa?: number | null
          min_cgpa?: number | null
          percentage_range?: string | null
          scale_name?: string | null
          updated_at?: string | null
        }
        Update: {
          classification?: string | null
          created_at?: string | null
          description?: string | null
          grade_letter?: string | null
          grade_point?: number | null
          id?: string
          institution_id?: string | null
          is_default?: boolean | null
          max_cgpa?: number | null
          min_cgpa?: number | null
          percentage_range?: string | null
          scale_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuc_grading_scales_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      nuc_programs: {
        Row: {
          accreditation_status: string | null
          code: string
          created_at: string | null
          degree_type: string | null
          department_id: string
          duration_years: number | null
          id: string
          institution_id: string
          level: string | null
          name: string
          nuc_approval_number: string | null
          updated_at: string | null
        }
        Insert: {
          accreditation_status?: string | null
          code: string
          created_at?: string | null
          degree_type?: string | null
          department_id: string
          duration_years?: number | null
          id?: string
          institution_id: string
          level?: string | null
          name: string
          nuc_approval_number?: string | null
          updated_at?: string | null
        }
        Update: {
          accreditation_status?: string | null
          code?: string
          created_at?: string | null
          degree_type?: string | null
          department_id?: string
          duration_years?: number | null
          id?: string
          institution_id?: string
          level?: string | null
          name?: string
          nuc_approval_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuc_programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "nuc_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuc_programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      nuc_supervisor_assignments: {
        Row: {
          assigned_date: string | null
          created_at: string | null
          final_grade: number | null
          id: string
          program_id: string | null
          project_title: string | null
          status: string | null
          student_id: string
          supervisor_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_date?: string | null
          created_at?: string | null
          final_grade?: number | null
          id?: string
          program_id?: string | null
          project_title?: string | null
          status?: string | null
          student_id: string
          supervisor_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_date?: string | null
          created_at?: string | null
          final_grade?: number | null
          id?: string
          program_id?: string | null
          project_title?: string | null
          status?: string | null
          student_id?: string
          supervisor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuc_supervisor_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nuc_supervisor_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nuc_supervisor_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuc_supervisor_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "nuc_supervisor_assignments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "nuc_supervisors"
            referencedColumns: ["id"]
          },
        ]
      }
      nuc_supervisors: {
        Row: {
          available: boolean | null
          created_at: string | null
          department_id: string | null
          id: string
          max_students: number | null
          qualification: string | null
          research_area: string | null
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          max_students?: number | null
          qualification?: string | null
          research_area?: string | null
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          max_students?: number | null
          qualification?: string | null
          research_area?: string | null
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuc_supervisors_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "nuc_supervisors_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          institution_id: string
          max_attempts: number | null
          processed_at: string | null
          status: string | null
          submission_id: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution_id: string
          max_attempts?: number | null
          processed_at?: string | null
          status?: string | null
          submission_id: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string
          max_attempts?: number | null
          processed_at?: string | null
          status?: string | null
          submission_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_queue_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "grading_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_variants: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          ocr_confidence: number | null
          ocr_text: string | null
          submission_id: string
          variant_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          ocr_confidence?: number | null
          ocr_text?: string | null
          submission_id: string
          variant_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          ocr_confidence?: number | null
          ocr_text?: string | null
          submission_id?: string
          variant_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_variants_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "grading_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_audit: {
        Row: {
          created_at: string | null
          event_name: string | null
          id: string
          institution_id: string
          payload: Json | null
          trace_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name?: string | null
          id?: string
          institution_id: string
          payload?: Json | null
          trace_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string | null
          id?: string
          institution_id?: string
          payload?: Json | null
          trace_id?: string | null
        }
        Relationships: []
      }
      parents: {
        Row: {
          child_student_id: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          profile_id: string | null
        }
        Insert: {
          child_student_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          profile_id?: string | null
        }
        Update: {
          child_student_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_child_student_id_fkey"
            columns: ["child_student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parents_child_student_id_fkey"
            columns: ["child_student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parents_child_student_id_fkey"
            columns: ["child_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_child_student_id_fkey"
            columns: ["child_student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_checks: {
        Row: {
          academic_similarity: number | null
          canonicalization_version: string | null
          checked_at: string | null
          completed_at: string | null
          config_hash: string | null
          created_at: string | null
          document_hash: string | null
          document_text: string
          engine_version: string | null
          evidence_hash: string | null
          id: string
          institution_id: string
          internet_similarity: number | null
          match_groups: Json | null
          nerd_compliant: boolean | null
          nerd_originality_score: number | null
          nerd_submission_id: string | null
          overall_similarity: number | null
          policy_version: string | null
          result_hash: string | null
          status: string | null
          student_id: string
          student_paper_similarity: number | null
          submission_id: string | null
          terminal_state: string | null
          updated_at: string | null
          verification_id: string | null
          word_count: number | null
        }
        Insert: {
          academic_similarity?: number | null
          canonicalization_version?: string | null
          checked_at?: string | null
          completed_at?: string | null
          config_hash?: string | null
          created_at?: string | null
          document_hash?: string | null
          document_text: string
          engine_version?: string | null
          evidence_hash?: string | null
          id?: string
          institution_id: string
          internet_similarity?: number | null
          match_groups?: Json | null
          nerd_compliant?: boolean | null
          nerd_originality_score?: number | null
          nerd_submission_id?: string | null
          overall_similarity?: number | null
          policy_version?: string | null
          result_hash?: string | null
          status?: string | null
          student_id: string
          student_paper_similarity?: number | null
          submission_id?: string | null
          terminal_state?: string | null
          updated_at?: string | null
          verification_id?: string | null
          word_count?: number | null
        }
        Update: {
          academic_similarity?: number | null
          canonicalization_version?: string | null
          checked_at?: string | null
          completed_at?: string | null
          config_hash?: string | null
          created_at?: string | null
          document_hash?: string | null
          document_text?: string
          engine_version?: string | null
          evidence_hash?: string | null
          id?: string
          institution_id?: string
          internet_similarity?: number | null
          match_groups?: Json | null
          nerd_compliant?: boolean | null
          nerd_originality_score?: number | null
          nerd_submission_id?: string | null
          overall_similarity?: number | null
          policy_version?: string | null
          result_hash?: string | null
          status?: string | null
          student_id?: string
          student_paper_similarity?: number | null
          submission_id?: string | null
          terminal_state?: string | null
          updated_at?: string | null
          verification_id?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_checks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plagiarism_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "plagiarism_checks_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_corrections: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          check_id: string
          created_at: string | null
          id: string
          original_text: string
          source_id: string | null
          suggested_citation: string | null
          suggestion_text: string | null
          suggestion_type: string | null
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          check_id: string
          created_at?: string | null
          id?: string
          original_text: string
          source_id?: string | null
          suggested_citation?: string | null
          suggestion_text?: string | null
          suggestion_type?: string | null
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          check_id?: string
          created_at?: string | null
          id?: string
          original_text?: string
          source_id?: string | null
          suggested_citation?: string | null
          suggestion_text?: string | null
          suggestion_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_corrections_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "plagiarism_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plagiarism_corrections_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "plagiarism_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_matches: {
        Row: {
          check_id: string
          created_at: string | null
          end_position: number | null
          id: string
          match_category: string | null
          matched_length: number | null
          matched_text: string
          similarity: number | null
          source_authors: string[] | null
          source_publisher: string | null
          source_title: string | null
          source_type: string | null
          source_url: string | null
          source_year: number | null
          start_position: number | null
        }
        Insert: {
          check_id: string
          created_at?: string | null
          end_position?: number | null
          id?: string
          match_category?: string | null
          matched_length?: number | null
          matched_text: string
          similarity?: number | null
          source_authors?: string[] | null
          source_publisher?: string | null
          source_title?: string | null
          source_type?: string | null
          source_url?: string | null
          source_year?: number | null
          start_position?: number | null
        }
        Update: {
          check_id?: string
          created_at?: string | null
          end_position?: number | null
          id?: string
          match_category?: string | null
          matched_length?: number | null
          matched_text?: string
          similarity?: number | null
          source_authors?: string[] | null
          source_publisher?: string | null
          source_title?: string | null
          source_type?: string | null
          source_url?: string | null
          source_year?: number | null
          start_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_matches_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "plagiarism_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_reports: {
        Row: {
          checked_at: string | null
          flagged_passages: Json | null
          id: string
          report_url: string | null
          similarity_score: number
          sources_checked: string[] | null
          submission_id: string | null
        }
        Insert: {
          checked_at?: string | null
          flagged_passages?: Json | null
          id?: string
          report_url?: string | null
          similarity_score: number
          sources_checked?: string[] | null
          submission_id?: string | null
        }
        Update: {
          checked_at?: string | null
          flagged_passages?: Json | null
          id?: string
          report_url?: string | null
          similarity_score?: number
          sources_checked?: string[] | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_reports_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_versions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          service_version_id: string
          status: string
          version: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          service_version_id: string
          status?: string
          version: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          service_version_id?: string
          status?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_versions_service_version_id_fkey"
            columns: ["service_version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          features: Json
          id: string
          institution_id: string | null
          max_students: number | null
          plan_name: string
          price_per_student: number
        }
        Insert: {
          features: Json
          id?: string
          institution_id?: string | null
          max_students?: number | null
          plan_name: string
          price_per_student: number
        }
        Update: {
          features?: Json
          id?: string
          institution_id?: string | null
          max_students?: number | null
          plan_name?: string
          price_per_student?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          authentication_method: string | null
          authority_user_id: string | null
          created_at: string | null
          email: string | null
          failed_attempts: number | null
          full_name: string
          id: string
          institution_id: string | null
          last_login_at: string | null
          locked_until: string | null
          phone: string | null
          pin: string | null
          pin_changed_at: string | null
          pin_hash: string | null
          pin_requires_change: boolean | null
          pin_type: string | null
          role: string
          school_id: string | null
          user_id: string | null
        }
        Insert: {
          authentication_method?: string | null
          authority_user_id?: string | null
          created_at?: string | null
          email?: string | null
          failed_attempts?: number | null
          full_name: string
          id?: string
          institution_id?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          phone?: string | null
          pin?: string | null
          pin_changed_at?: string | null
          pin_hash?: string | null
          pin_requires_change?: boolean | null
          pin_type?: string | null
          role: string
          school_id?: string | null
          user_id?: string | null
        }
        Update: {
          authentication_method?: string | null
          authority_user_id?: string | null
          created_at?: string | null
          email?: string | null
          failed_attempts?: number | null
          full_name?: string
          id?: string
          institution_id?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          phone?: string | null
          pin?: string | null
          pin_changed_at?: string | null
          pin_hash?: string | null
          pin_requires_change?: boolean | null
          pin_type?: string | null
          role?: string
          school_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          accreditation_expiry: string | null
          accreditation_number: string | null
          accreditation_status: string | null
          code: string
          created_at: string | null
          credit_units_total: number | null
          degree_type: string | null
          department_id: string
          description: string | null
          duration_months: number | null
          duration_years: number | null
          id: string
          institution_id: string
          level: string | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          accreditation_expiry?: string | null
          accreditation_number?: string | null
          accreditation_status?: string | null
          code: string
          created_at?: string | null
          credit_units_total?: number | null
          degree_type?: string | null
          department_id: string
          description?: string | null
          duration_months?: number | null
          duration_years?: number | null
          id?: string
          institution_id: string
          level?: string | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          accreditation_expiry?: string | null
          accreditation_number?: string | null
          accreditation_status?: string | null
          code?: string
          created_at?: string | null
          credit_units_total?: number | null
          degree_type?: string | null
          department_id?: string
          description?: string | null
          duration_months?: number | null
          duration_years?: number | null
          id?: string
          institution_id?: string
          level?: string | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_students: {
        Row: {
          adviser_id: string | null
          contribution_role: string | null
          created_at: string | null
          id: string
          project_id: string | null
          student_id: string | null
        }
        Insert: {
          adviser_id?: string | null
          contribution_role?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          student_id?: string | null
        }
        Update: {
          adviser_id?: string | null
          contribution_role?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_students_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_students_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "project_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "project_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      projects: {
        Row: {
          academic_session: string
          course_code: string
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          institution_id: string | null
          title: string
        }
        Insert: {
          academic_session: string
          course_code: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          title: string
        }
        Update: {
          academic_session?: string
          course_code?: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          booking: Json | null
          created_at: string | null
          created_by: string | null
          host: Json | null
          id: string
          images: Json | null
          location: string | null
          price: number | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          booking?: Json | null
          created_at?: string | null
          created_by?: string | null
          host?: Json | null
          id?: string
          images?: Json | null
          location?: string | null
          price?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          booking?: Json | null
          created_at?: string | null
          created_by?: string | null
          host?: Json | null
          id?: string
          images?: Json | null
          location?: string | null
          price?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      public_user_trials: {
        Row: {
          checks_remaining: number | null
          created_at: string | null
          device_fingerprint: string
          email: string | null
          first_used_at: string | null
          id: string
          last_used_at: string | null
          updated_at: string | null
          used_checks: number | null
        }
        Insert: {
          checks_remaining?: number | null
          created_at?: string | null
          device_fingerprint: string
          email?: string | null
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string | null
          used_checks?: number | null
        }
        Update: {
          checks_remaining?: number | null
          created_at?: string | null
          device_fingerprint?: string
          email?: string | null
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string | null
          used_checks?: number | null
        }
        Relationships: []
      }
      public_verification_records: {
        Row: {
          created_at: string
          document_hash: string
          engine_version: string
          evidence_envelope: Json
          evidence_hash: string
          id: string
          manifest_hash: string | null
          overall_similarity: number
          policy_version: string
          public_schema_version: string | null
          result_hash: string | null
          status: string | null
          total_sources_found: number
          verification_id: string
          verification_run_id: string | null
        }
        Insert: {
          created_at?: string
          document_hash: string
          engine_version?: string
          evidence_envelope: Json
          evidence_hash: string
          id?: string
          manifest_hash?: string | null
          overall_similarity: number
          policy_version?: string
          public_schema_version?: string | null
          result_hash?: string | null
          status?: string | null
          total_sources_found?: number
          verification_id: string
          verification_run_id?: string | null
        }
        Update: {
          created_at?: string
          document_hash?: string
          engine_version?: string
          evidence_envelope?: Json
          evidence_hash?: string
          id?: string
          manifest_hash?: string | null
          overall_similarity?: number
          policy_version?: string
          public_schema_version?: string | null
          result_hash?: string | null
          status?: string | null
          total_sources_found?: number
          verification_id?: string
          verification_run_id?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          name: string
          permissions: Json | null
          role_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          name: string
          permissions?: Json | null
          role_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          name?: string
          permissions?: Json | null
          role_type?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          applied_at: string | null
          id: number
          name: string
        }
        Insert: {
          applied_at?: string | null
          id?: number
          name: string
        }
        Update: {
          applied_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          address: string | null
          campus_address: string | null
          campus_phone: string | null
          created_at: string | null
          email: string | null
          id: string
          institution_id: string | null
          logo_url: string | null
          phone: string | null
          principal_email: string | null
          principal_name: string | null
          provisioning_status: string
          school_name: string
          school_type: string | null
          slug: string | null
          url_slug: string | null
          vice_principal_name: string | null
        }
        Insert: {
          address?: string | null
          campus_address?: string | null
          campus_phone?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institution_id?: string | null
          logo_url?: string | null
          phone?: string | null
          principal_email?: string | null
          principal_name?: string | null
          provisioning_status?: string
          school_name: string
          school_type?: string | null
          slug?: string | null
          url_slug?: string | null
          vice_principal_name?: string | null
        }
        Update: {
          address?: string | null
          campus_address?: string | null
          campus_phone?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institution_id?: string | null
          logo_url?: string | null
          phone?: string | null
          principal_email?: string | null
          principal_name?: string | null
          provisioning_status?: string
          school_name?: string
          school_type?: string | null
          slug?: string | null
          url_slug?: string | null
          vice_principal_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_institution_fk"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_versions: {
        Row: {
          activated_at: string | null
          canonicalization_version: string | null
          created_at: string
          engine_version: string | null
          id: string
          policy_version: string | null
          service_id: string
          status: string
          version: string
        }
        Insert: {
          activated_at?: string | null
          canonicalization_version?: string | null
          created_at?: string
          engine_version?: string | null
          id?: string
          policy_version?: string | null
          service_id: string
          status?: string
          version: string
        }
        Update: {
          activated_at?: string | null
          canonicalization_version?: string | null
          created_at?: string
          engine_version?: string | null
          id?: string
          policy_version?: string | null
          service_id?: string
          status?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_import_batches: {
        Row: {
          class_id: string | null
          completed_at: string | null
          created_at: string | null
          failed_rows: number | null
          file_name: string | null
          id: string
          institution_id: string | null
          processed_rows: number | null
          school_id: string | null
          status: string | null
          success_rows: number | null
          total_rows: number | null
          uploaded_by: string | null
        }
        Insert: {
          class_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          failed_rows?: number | null
          file_name?: string | null
          id?: string
          institution_id?: string | null
          processed_rows?: number | null
          school_id?: string | null
          status?: string | null
          success_rows?: number | null
          total_rows?: number | null
          uploaded_by?: string | null
        }
        Update: {
          class_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          failed_rows?: number | null
          file_name?: string | null
          id?: string
          institution_id?: string | null
          processed_rows?: number | null
          school_id?: string | null
          status?: string | null
          success_rows?: number | null
          total_rows?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_import_batches_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_import_batches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_import_batches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_import_rows: {
        Row: {
          batch_id: string | null
          created_at: string | null
          date_of_birth: string | null
          error_message: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          status: string | null
          student_number: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          error_message?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          status?: string | null
          student_number?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          error_message?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          status?: string | null
          student_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_progress_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "student_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      student_number_sequences: {
        Row: {
          created_at: string | null
          last_number: number | null
          prefix: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          last_number?: number | null
          prefix?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          last_number?: number | null
          prefix?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_number_sequences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parent_relationships: {
        Row: {
          can_receive_notifications: boolean | null
          can_view_attendance: boolean | null
          can_view_results: boolean | null
          created_at: string | null
          id: string
          institution_id: string
          is_primary: boolean | null
          parent_id: string
          relationship_type: string | null
          school_id: string | null
          student_id: string
        }
        Insert: {
          can_receive_notifications?: boolean | null
          can_view_attendance?: boolean | null
          can_view_results?: boolean | null
          created_at?: string | null
          id?: string
          institution_id: string
          is_primary?: boolean | null
          parent_id: string
          relationship_type?: string | null
          school_id?: string | null
          student_id: string
        }
        Update: {
          can_receive_notifications?: boolean | null
          can_view_attendance?: boolean | null
          can_view_results?: boolean | null
          created_at?: string | null
          id?: string
          institution_id?: string
          is_primary?: boolean | null
          parent_id?: string
          relationship_type?: string | null
          school_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parent_relationships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_relationships_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_relationships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parent_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parent_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_parents: {
        Row: {
          can_view_results: boolean | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          parent_id: string | null
          relationship: string | null
          student_id: string | null
        }
        Insert: {
          can_view_results?: boolean | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          parent_id?: string | null
          relationship?: string | null
          student_id?: string | null
        }
        Update: {
          can_view_results?: boolean | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          parent_id?: string | null
          relationship?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_subject_enrollments: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          school_id: string | null
          student_id: string | null
          subject_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          school_id?: string | null
          student_id?: string | null
          subject_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          school_id?: string | null
          student_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_mode: string | null
          admission_session: string | null
          admission_year: number | null
          cgpa: number | null
          class_id: string | null
          created_at: string | null
          current_level: string | null
          date_of_birth: string | null
          email: string | null
          enrollment_status: string | null
          first_name: string
          gender: string | null
          id: string
          institution_id: string | null
          last_name: string
          lga_of_origin: string | null
          matriculation_number: string | null
          metadata: Json | null
          middle_name: string | null
          nationality: string | null
          phone: string | null
          program_id: string | null
          school_id: string | null
          state_of_origin: string | null
          student_number: string | null
          total_credits_earned: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_mode?: string | null
          admission_session?: string | null
          admission_year?: number | null
          cgpa?: number | null
          class_id?: string | null
          created_at?: string | null
          current_level?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_status?: string | null
          first_name: string
          gender?: string | null
          id?: string
          institution_id?: string | null
          last_name: string
          lga_of_origin?: string | null
          matriculation_number?: string | null
          metadata?: Json | null
          middle_name?: string | null
          nationality?: string | null
          phone?: string | null
          program_id?: string | null
          school_id?: string | null
          state_of_origin?: string | null
          student_number?: string | null
          total_credits_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_mode?: string | null
          admission_session?: string | null
          admission_year?: number | null
          cgpa?: number | null
          class_id?: string | null
          created_at?: string | null
          current_level?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_status?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          institution_id?: string | null
          last_name?: string
          lga_of_origin?: string | null
          matriculation_number?: string | null
          metadata?: Json | null
          middle_name?: string | null
          nationality?: string | null
          phone?: string | null
          program_id?: string | null
          school_id?: string | null
          state_of_origin?: string | null
          student_number?: string | null
          total_credits_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_catalog: {
        Row: {
          created_at: string | null
          id: string
          is_practical: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_practical?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_practical?: boolean | null
          name?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          byte_size: number | null
          canonical_document_hash: string | null
          canonical_object_path: string | null
          canonicalization_version: string | null
          content_type: string | null
          file_url: string
          id: string
          original_object_path: string | null
          project_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          version: number
          word_count: number | null
        }
        Insert: {
          byte_size?: number | null
          canonical_document_hash?: string | null
          canonical_object_path?: string | null
          canonicalization_version?: string | null
          content_type?: string | null
          file_url: string
          id?: string
          original_object_path?: string | null
          project_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          version?: number
          word_count?: number | null
        }
        Update: {
          byte_size?: number | null
          canonical_document_hash?: string | null
          canonical_object_path?: string | null
          canonicalization_version?: string | null
          content_type?: string | null
          file_url?: string
          id?: string
          original_object_path?: string | null
          project_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          version?: number
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "result_sheet_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "student_roster"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          end_date: string
          id: string
          institution_id: string | null
          plan_id: string | null
          start_date: string
          status: string | null
          total_students: number | null
        }
        Insert: {
          amount_paid?: number | null
          end_date: string
          id?: string
          institution_id?: string | null
          plan_id?: string | null
          start_date: string
          status?: string | null
          total_students?: number | null
        }
        Update: {
          amount_paid?: number | null
          end_date?: string
          id?: string
          institution_id?: string | null
          plan_id?: string | null
          start_date?: string
          status?: string | null
          total_students?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          device_info: string | null
          id: string
          institution_id: string | null
          ip_address: string | null
          profile_id: string | null
          resource_id: string | null
          resource_type: string
          school_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          device_info?: string | null
          id?: string
          institution_id?: string | null
          ip_address?: string | null
          profile_id?: string | null
          resource_id?: string | null
          resource_type: string
          school_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          device_info?: string | null
          id?: string
          institution_id?: string | null
          ip_address?: string | null
          profile_id?: string | null
          resource_id?: string | null
          resource_type?: string
          school_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_activity_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classes: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_reviews: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          answer_script_id: string
          final_score: number | null
          id: string
          review_status: string | null
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          answer_script_id: string
          final_score?: number | null
          id?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          answer_script_id?: string
          final_score?: number | null
          id?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string
        }
        Relationships: []
      }
      teacher_subject_assignments: {
        Row: {
          class_subject_id: string
          created_at: string | null
          id: string
          school_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_subject_id: string
          created_at?: string | null
          id?: string
          school_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_subject_id?: string
          created_at?: string | null
          id?: string
          school_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subject_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          institution_id: string | null
          name: string
          phone: string | null
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          institution_id?: string | null
          name: string
          phone?: string | null
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          phone?: string | null
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_identity_map: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          role: string
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          role: string
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          role?: string
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_identity_map_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_identity_map_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          ai_grading_limit_month: number | null
          created_at: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          plan_type: string
          storage_limit_bytes: number | null
          student_limit: number | null
          teacher_limit: number | null
          valid_until: string | null
        }
        Insert: {
          ai_grading_limit_month?: number | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          plan_type?: string
          storage_limit_bytes?: number | null
          student_limit?: number | null
          teacher_limit?: number | null
          valid_until?: string | null
        }
        Update: {
          ai_grading_limit_month?: number | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          plan_type?: string
          storage_limit_bytes?: number | null
          student_limit?: number | null
          teacher_limit?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          id: string
          name: string
          settings: Json | null
          slug: string
        }
        Insert: {
          id?: string
          name: string
          settings?: Json | null
          slug: string
        }
        Update: {
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      terms: {
        Row: {
          academic_year: string
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          start_date: string
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          start_date: string
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      v_school_id: {
        Row: {
          school_id: string | null
        }
        Insert: {
          school_id?: string | null
        }
        Update: {
          school_id?: string | null
        }
        Relationships: []
      }
      verification_runs: {
        Row: {
          attempt: number
          billable_event_id: string | null
          canonical_document_hash: string | null
          completed_at: string | null
          created_at: string
          document_hash: string | null
          engine_version: string | null
          error_code: string | null
          error_message: string | null
          evidence_hash: string | null
          id: string
          institution_id: string
          manifest_hash: string | null
          parent_run_id: string | null
          policy_version: string | null
          result: Json | null
          result_hash: string | null
          school_id: string | null
          service_version_id: string
          source_submission_id: string | null
          started_at: string | null
          status: string
          verification_id: string | null
        }
        Insert: {
          attempt?: number
          billable_event_id?: string | null
          canonical_document_hash?: string | null
          completed_at?: string | null
          created_at?: string
          document_hash?: string | null
          engine_version?: string | null
          error_code?: string | null
          error_message?: string | null
          evidence_hash?: string | null
          id?: string
          institution_id: string
          manifest_hash?: string | null
          parent_run_id?: string | null
          policy_version?: string | null
          result?: Json | null
          result_hash?: string | null
          school_id?: string | null
          service_version_id: string
          source_submission_id?: string | null
          started_at?: string | null
          status?: string
          verification_id?: string | null
        }
        Update: {
          attempt?: number
          billable_event_id?: string | null
          canonical_document_hash?: string | null
          completed_at?: string | null
          created_at?: string
          document_hash?: string | null
          engine_version?: string | null
          error_code?: string | null
          error_message?: string | null
          evidence_hash?: string | null
          id?: string
          institution_id?: string
          manifest_hash?: string | null
          parent_run_id?: string | null
          policy_version?: string | null
          result?: Json | null
          result_hash?: string | null
          school_id?: string | null
          service_version_id?: string
          source_submission_id?: string | null
          started_at?: string | null
          status?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_runs_billable_event_id_fkey"
            columns: ["billable_event_id"]
            isOneToOne: false
            referencedRelation: "billable_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_runs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "verification_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_runs_service_version_id_fkey"
            columns: ["service_version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_runs_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      vice_principals: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          profile_id: string | null
          school_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          profile_id?: string | null
          school_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          profile_id?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vice_principals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vice_principals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vice_principals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vice_principals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vice_principals_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          consent_date: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          is_opted_in: boolean | null
          phone_number: string
          profile_id: string | null
        }
        Insert: {
          consent_date?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_opted_in?: boolean | null
          phone_number: string
          profile_id?: string | null
        }
        Update: {
          consent_date?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_opted_in?: boolean | null
          phone_number?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "principal_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      import_progress_view: {
        Row: {
          failed_rows: number | null
          file_name: string | null
          id: string | null
          processed_rows: number | null
          progress_percent: number | null
          school_id: string | null
          status: string | null
          success_rows: number | null
          total_rows: number | null
        }
        Insert: {
          failed_rows?: number | null
          file_name?: string | null
          id?: string | null
          processed_rows?: number | null
          progress_percent?: never
          school_id?: string | null
          status?: string | null
          success_rows?: number | null
          total_rows?: number | null
        }
        Update: {
          failed_rows?: number | null
          file_name?: string | null
          id?: string | null
          processed_rows?: number | null
          progress_percent?: never
          school_id?: string | null
          status?: string | null
          success_rows?: number | null
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_import_batches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      invites_public: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
        }
        Relationships: []
      }
      mv_ai_queue_summary: {
        Row: {
          institution_id: string | null
          queue_count: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_queue_status_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_daily_active_users: {
        Row: {
          active_users: number | null
          activity_date: string | null
          institution_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_activity_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_monthly_exams: {
        Row: {
          exams_count: number | null
          institution_id: string | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_institution_fk"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_health: {
        Row: {
          count: number | null
          last_activity: string | null
          stage: string | null
        }
        Relationships: []
      }
      principal_dashboard: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          institution_id: string | null
          role: string | null
          school_id: string | null
          total_students: number | null
          total_teachers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_health: {
        Row: {
          job_count: number | null
          newest_job: string | null
          oldest_job: string | null
          status: string | null
        }
        Relationships: []
      }
      result_sheet_view: {
        Row: {
          class_name: string | null
          exam_id: string | null
          exam_title: string | null
          grade: string | null
          percentage: number | null
          position: number | null
          school_name: string | null
          score: number | null
          status: string | null
          student_id: string | null
          student_name: string | null
          student_number: string | null
          subject_name: string | null
          submitted_at: string | null
          term_name: string | null
          total_marks: number | null
        }
        Relationships: []
      }
      student_numbers_view: {
        Row: {
          active_students: number | null
          institution_id: string | null
          school_id: string | null
          total_students: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_roster: {
        Row: {
          created_at: string | null
          full_name: string | null
          institution_id: string | null
          matriculation_number: string | null
          role: string | null
          school_id: string | null
          student_id: string | null
        }
        Relationships: []
      }
      student_sequence_status: {
        Row: {
          actual_students: number | null
          last_number: number | null
          next_sequence: number | null
          next_student_number: string | null
          prefix: string | null
          school_name: string | null
        }
        Relationships: []
      }
      sub_accounts: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          institution_id: string | null
          last_login_at: string | null
          matriculation_number: string | null
          role: string | null
          school_id: string | null
          staff_id: string | null
          staff_name: string | null
          student_full_name: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_accounts_public: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          institution_id: string | null
          role: string | null
          school_id: string | null
          staff_name: string | null
          student_full_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmin_fsm_overview: {
        Row: {
          current_state: string | null
          entity_id: string | null
          entity_type: string | null
          previous_state: string | null
          tenant_name: string | null
          tenant_type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_cbt_exams: {
        Row: {
          class_id: string | null
          created_at: string | null
          created_by: string | null
          current_state: string | null
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          exam_date: string | null
          id: string | null
          pass_mark: number | null
          previous_state: string | null
          school_id: string | null
          start_time: string | null
          subject_id: string | null
          term_id: string | null
          title: string | null
          total_marks: number | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_state?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          exam_date?: string | null
          id?: string | null
          pass_mark?: number | null
          previous_state?: string | null
          school_id?: string | null
          start_time?: string | null
          subject_id?: string | null
          term_id?: string | null
          title?: string | null
          total_marks?: number | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_state?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          exam_date?: string | null
          id?: string | null
          pass_mark?: number | null
          previous_state?: string | null
          school_id?: string | null
          start_time?: string | null
          subject_id?: string | null
          term_id?: string | null
          title?: string | null
          total_marks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cbt_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_cbt_question: {
        Args: {
          p_difficulty?: string
          p_exam_id: string
          p_marks: number
          p_options: Json
          p_question_number: number
          p_question_text: string
        }
        Returns: Json
      }
      apply_fsm_event: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_from_state: string
          p_role: string
          p_to_state: string
        }
        Returns: undefined
      }
      approve_grading: {
        Args: {
          p_final_score: number
          p_reviewer_id: string
          p_script_id: string
          p_teacher_feedback?: string
        }
        Returns: Json
      }
      assert_exam_access: { Args: { p_exam_id: string }; Returns: undefined }
      assign_teacher_to_subject: {
        Args: { p_class_subject_id: string; p_teacher_id: string }
        Returns: string
      }
      auth_pin_login: {
        Args: { p_identifier: string; p_pin: string }
        Returns: Json
      }
      bootstrap_higher_institution: {
        Args: {
          p_address: string
          p_auth_user_id: string
          p_country: string
          p_dean_email: string
          p_dean_name: string
          p_dean_phone: string
          p_institution_name: string
          p_institution_type: string
          p_phone: string
          p_registration_number: string
          p_website: string
        }
        Returns: Json
      }
      bootstrap_institution_full: { Args: { payload: Json }; Returns: Json }
      bootstrap_school_institution: {
        Args: {
          p_address: string
          p_auth_user_id: string
          p_country: string
          p_institution_name: string
          p_institution_type: string
          p_lga: string
          p_phone: string
          p_principal_email: string
          p_principal_name: string
          p_principal_phone: string
          p_registration_number: string
          p_state: string
          p_website: string
        }
        Returns: Json
      }
      bootstrap_tenant_identity: {
        Args: {
          p_institution_id: string
          p_role: string
          p_school_id: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_grade: { Args: { score: number }; Returns: string }
      can_manage_secondary_users: {
        Args: { p_institution_id: string }
        Returns: boolean
      }
      cbt_candidate_is_owner: {
        Args: { p_candidate_id: string }
        Returns: boolean
      }
      cbt_finalize_attempt: { Args: { p_attempt_id: string }; Returns: Json }
      cbt_get_or_create_candidate: { Args: never; Returns: string }
      cbt_is_student: { Args: { p_student_id: string }; Returns: boolean }
      cbt_student_can_access_exam: {
        Args: { p_exam_id: string }
        Returns: boolean
      }
      cbt_teacher_can_access_exam: {
        Args: { p_exam_id: string }
        Returns: boolean
      }
      change_school_member_role: {
        Args: { p_membership_id: string; p_new_role: string }
        Returns: undefined
      }
      complete_actor_onboarding: {
        Args: {
          p_actor_type: string
          p_auth_user_id: string
          p_authority_user_id: string
          p_class_id?: string
          p_class_subject_ids?: string[]
          p_date_of_birth?: string
          p_department_id?: string
          p_email?: string
          p_expected_authority_role: string
          p_faculty_id?: string
          p_full_name: string
          p_gender?: string
          p_institution_id: string
          p_is_graduate_student_supervisor?: boolean
          p_is_primary?: boolean
          p_max_students?: number
          p_phone?: string
          p_pin: string
          p_rank?: string
          p_relationship?: string
          p_school_id: string
          p_specialization?: string
          p_student_id?: string
          p_title?: string
        }
        Returns: Json
      }
      create_answer_script: {
        Args: {
          p_exam_id: string
          p_file_url?: string
          p_ocr_text: string
          p_school_id: string
          p_student_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      create_cbt_attempt: { Args: { p_exam_id: string }; Returns: Json }
      create_cbt_exam: {
        Args: {
          p_class_id: string
          p_description: string
          p_duration_minutes: number
          p_exam_date: string
          p_pass_mark: number
          p_school_id: string
          p_subject_id: string
          p_term_id: string
          p_title: string
        }
        Returns: Json
      }
      create_cbt_exam_v2: {
        Args: {
          p_class_id: string
          p_description: string
          p_duration_minutes: number
          p_exam_date: string
          p_pass_mark: number
          p_school_id: string
          p_subject_id: string
          p_term_id: string
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      create_institution_account: {
        Args: {
          _address: string
          _country: string
          _email: string
          _institution_name: string
          _institution_type: string
          _lga: string
          _phone: string
          _principal_email: string
          _principal_name: string
          _principal_phone: string
          _registration_number: string
          _school_type: string
          _state: string
          _website: string
        }
        Returns: Json
      }
      create_school_with_classes: {
        Args: {
          p_address: string
          p_email: string
          p_institution_id?: string
          p_logo_url: string
          p_phone: string
          p_principal_name: string
          p_school_name: string
          p_school_type: string
          p_vice_principal_name: string
        }
        Returns: Json
      }
      current_school_id: { Args: never; Returns: string }
      current_teacher_id: { Args: never; Returns: string }
      current_tenant: { Args: never; Returns: Json }
      enroll_student_subjects: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      finalize_grading: {
        Args: {
          p_confidence: number
          p_feedback: string
          p_score: number
          p_script_id: string
        }
        Returns: undefined
      }
      fsm_admin_reset_state: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_new_state: string
        }
        Returns: undefined
      }
      fsm_probe_state: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: string
      }
      fsm_transition: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_from_state: string
          p_institution_id: string
          p_metadata: Json
          p_to_state: string
        }
        Returns: undefined
      }
      function_name: { Args: { p_entity_type: string }; Returns: undefined }
      generate_student_number: {
        Args: { p_school_id: string }
        Returns: string
      }
      get_attempt: {
        Args: { p_id: string }
        Returns: {
          end_time: string
          exam_id: string
          id: string
          percentage: number
          score: number
          start_time: string
          status: string
          student_id: string
          submitted_at: string
          total_marks: number
        }[]
      }
      get_attendance_summary: { Args: { p_school_id?: string }; Returns: Json }
      get_bursar_dashboard_stats: {
        Args: { p_school_id?: string }
        Returns: Json
      }
      get_cbt_active_attempt: { Args: { p_exam_id: string }; Returns: Json }
      get_cbt_attempt_state: { Args: { p_attempt_id: string }; Returns: Json }
      get_cbt_exam_questions: { Args: { p_exam_id: string }; Returns: Json }
      get_class_performance:
        | { Args: { p_class_id?: string }; Returns: Json }
        | { Args: { p_class_id: string; p_term_id?: string }; Returns: Json }
      get_course_adviser_stats: {
        Args: { p_adviser_id: string }
        Returns: Json
      }
      get_dean_dashboard_stats: {
        Args: { p_institution_id: string }
        Returns: Json
      }
      get_entity_state: {
        Args: { p_entity_type: string }
        Returns: {
          entity_type: string
          id: string
        }[]
      }
      get_exam_status: { Args: { p_attempt_id: string }; Returns: Json }
      get_hod_dashboard_stats: {
        Args: { p_department_id: string; p_institution_id: string }
        Returns: Json
      }
      get_human_ai_agreement: { Args: { p_teacher_id?: string }; Returns: Json }
      get_parent_children: {
        Args: { p_parent_id?: string }
        Returns: {
          class_name: string
          is_primary: boolean
          relationship: string
          student_id: string
          student_name: string
          student_number: string
        }[]
      }
      get_parent_dashboard_stats: {
        Args: { p_parent_id?: string }
        Returns: Json
      }
      get_pending_grades: {
        Args: { p_school_id?: string }
        Returns: {
          assignment_title: string
          created_at: string
          id: string
          overall_score: number
          status: string
          student_name: string
          subject_name: string
        }[]
      }
      get_pending_review_scripts: {
        Args: { p_school_id?: string; p_teacher_id?: string }
        Returns: {
          ai_score: number
          assignment_title: string
          class_name: string
          confidence: number
          created_at: string
          script_id: string
          status: string
          student_name: string
          subject_name: string
        }[]
      }
      get_pending_scripts: {
        Args: never
        Returns: {
          id: string
          ocr_text: string
        }[]
      }
      get_position_suffix: { Args: { pos: number }; Returns: string }
      get_principal_dashboard_stats: {
        Args: { p_school_id: string }
        Returns: Json
      }
      get_printable_results: { Args: { p_exam_id: string }; Returns: Json }
      get_school_students: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_school_id: string
          p_search?: string
        }
        Returns: Json
      }
      get_school_teachers: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_school_id: string
          p_search?: string
        }
        Returns: Json
      }
      get_student_dashboard_stats: {
        Args: { p_student_id?: string }
        Returns: Json
      }
      get_student_results:
        | { Args: { p_student_id?: string }; Returns: Json }
        | { Args: { p_exam_id?: string; p_student_id: string }; Returns: Json }
      get_teacher_activity: { Args: { p_school_id?: string }; Returns: Json }
      get_teacher_dashboard_stats: {
        Args: { p_school_id?: string; p_teacher_id?: string }
        Returns: Json
      }
      get_teacher_details: { Args: { p_teacher_id: string }; Returns: Json }
      get_teacher_exam_results: { Args: { p_exam_id: string }; Returns: Json }
      get_top_performers: {
        Args: { p_class_id?: string; p_limit?: number; p_school_id: string }
        Returns: Json
      }
      get_vp_dashboard_stats: { Args: { p_school_id?: string }; Returns: Json }
      gradifi_assert_school_principal_invariant: {
        Args: { p_school_id: string }
        Returns: undefined
      }
      has_active_school_role: {
        Args: { p_roles: string[]; p_school_id: string }
        Returns: boolean
      }
      impersonate_user_context: {
        Args: { p_target_user: string }
        Returns: undefined
      }
      initialize_class_subjects: {
        Args: { p_school_id: string }
        Returns: Json
      }
      initialize_secondary_classes: {
        Args: { p_school_id: string }
        Returns: Json
      }
      invite_school_member: {
        Args: { p_member_role: string; p_school_id: string; p_user_id: string }
        Returns: string
      }
      override_grading: {
        Args: {
          p_final_score: number
          p_override_justification: string
          p_reviewer_id: string
          p_script_id: string
          p_teacher_feedback?: string
        }
        Returns: Json
      }
      persist_cbt_session_snapshot: {
        Args: {
          p_current_question: number
          p_remaining_time: number
          p_session_id: string
        }
        Returns: Json
      }
      publish_cbt_exam: { Args: { p_exam_id: string }; Returns: Json }
      recover_stuck_attempts: { Args: never; Returns: number }
      release_grading: {
        Args: { p_reviewer_id: string; p_script_id: string }
        Returns: Json
      }
      reset_stuck_grading_jobs: { Args: never; Returns: number }
      resolve_context: {
        Args: { p_context_type: string; p_user_id: string }
        Returns: string
      }
      resolve_principal_identity: { Args: never; Returns: Json }
      resolve_student_identity: { Args: never; Returns: Json }
      resolve_superadmin_context: { Args: { p_user_id: string }; Returns: Json }
      resolve_teacher_identity: { Args: never; Returns: Json }
      resolve_tenant: { Args: { p_user_id: string }; Returns: Json }
      resolve_tenant_context: { Args: { p_user_id: string }; Returns: Json }
      set_active_tenant_context: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      set_context: {
        Args: { p_context_type: string; p_entity_id: string; p_user_id: string }
        Returns: undefined
      }
      set_pin: { Args: { p_new_pin: string }; Returns: Json }
      set_school_member_status: {
        Args: { p_membership_id: string; p_new_status: string }
        Returns: undefined
      }
      set_tenant_context: { Args: { tenant_id: string }; Returns: undefined }
      start_cbt_exam_v2: {
        Args: { p_exam_id: string; p_user_id: string }
        Returns: undefined
      }
      submit_cbt_answer: {
        Args: {
          p_attempt_id: string
          p_question_id: string
          p_selected_option_id: string
        }
        Returns: Json
      }
      submit_cbt_exam: { Args: { p_attempt_id: string }; Returns: Json }
      test_flag: { Args: never; Returns: undefined }
      transfer_school_principal: {
        Args: { p_school_id: string; p_successor_user_id: string }
        Returns: undefined
      }
      transition_cbt_session: {
        Args: { p_session_id: string; p_to_state: string }
        Returns: Json
      }
      use_public_trial: { Args: { p_fingerprint: string }; Returns: number }
      your_function: { Args: { _entity_type: string }; Returns: undefined }
    }
    Enums: {
      fsm_state:
        | "RECEIVED"
        | "VALIDATED"
        | "PARSED"
        | "SCORED"
        | "ANALYZED"
        | "STORED"
        | "PUBLISHED"
        | "REJECTED"
        | "FAILED_PROCESSING"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fsm_state: [
        "RECEIVED",
        "VALIDATED",
        "PARSED",
        "SCORED",
        "ANALYZED",
        "STORED",
        "PUBLISHED",
        "REJECTED",
        "FAILED_PROCESSING",
      ],
    },
  },
} as const
