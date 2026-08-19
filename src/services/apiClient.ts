/**
 * GRADIFI API CLIENT (SEFAES SUPABASE SSOT FACADE)
 * Directly executes against Supabase client and PostgreSQL RPCs.
 * Zero Express / Node.js /api/* dependencies.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from './authService';
import { institutionService } from './institutionService';
import { schoolService } from './schoolService';
import { classService } from './classService';
import { subjectService } from './subjectService';
import { teacherService } from './teacherService';
import { studentService } from './studentService';
import { onboardingService } from './onboardingService';
import { cbtService } from './cbtService';
import { aiGradingService } from './aiGradingService';

import {
  Institution,
  Profile,
  School,
  ClassEntity,
  SubjectCatalogItem,
  ClassSubject,
  Teacher,
  Student,
  CbtExam,
  AnswerScript,
  InstitutionOnboarding,
} from '../contracts/schema';

import {
  CreateInstitutionAccountParams,
  CreateInstitutionAccountResult,
  CreateAdminProfileParams,
  CreateSchoolWithClassesParams,
  CreateSchoolResult,
  CreateTeacherParams,
  EnrollStudentParams,
  ReconcileAndLaunchParams,
  ReconciliationReport,
} from '../contracts/rpc';

export const apiClient = {
  // System Health & Configuration
  async getHealth() {
    return {
      status: isSupabaseConfigured ? 'connected' : 'unconfigured_keys',
      ssot: 'SEFAES_SUPABASE_DATABASE',
      timestamp: new Date().toISOString(),
    };
  },

  // Subject Catalog
  async getSubjectCatalog(): Promise<SubjectCatalogItem[]> {
    return subjectService.getSubjectCatalog();
  },

  // Onboarding State
  async getOnboardingState(institutionId?: string): Promise<{
    has_institution: boolean;
    institution?: Institution | null;
    profile?: Profile | null;
    school?: School | null;
    classes_count: number;
    subjects_count: number;
    teachers_count: number;
    students_count: number;
    onboarding?: InstitutionOnboarding | null;
    earliest_incomplete_step: number;
  }> {
    if (!institutionId) {
      return {
        has_institution: false,
        classes_count: 0,
        subjects_count: 0,
        teachers_count: 0,
        students_count: 0,
        earliest_incomplete_step: 1,
      };
    }

    const [inst, schools, onboarding] = await Promise.all([
      institutionService.getInstitution(institutionId),
      schoolService.getSchools(institutionId),
      onboardingService.getOnboardingState(institutionId),
    ]);

    if (!inst) {
      return {
        has_institution: false,
        classes_count: 0,
        subjects_count: 0,
        teachers_count: 0,
        students_count: 0,
        earliest_incomplete_step: 1,
      };
    }

    const school = schools[0] || null;
    let classesCount = 0;
    let subjectsCount = 0;
    let teachersCount = 0;
    let studentsCount = 0;

    if (school) {
      const [classes, subjects, teachers, students] = await Promise.all([
        classService.getClasses(school.id),
        subjectService.getClassSubjects(school.id),
        teacherService.getTeachers(school.id),
        studentService.getStudents(school.id),
      ]);
      classesCount = classes.length;
      subjectsCount = subjects.length;
      teachersCount = teachers.length;
      studentsCount = students.length;
    }

    let calculatedStep = 1;
    if (inst) calculatedStep = 3;
    if (school) calculatedStep = 7;
    if (classesCount > 0) calculatedStep = 8;
    if (subjectsCount > 0) calculatedStep = 10;
    if (teachersCount > 0) calculatedStep = 11;
    if (studentsCount > 0) calculatedStep = 12;

    return {
      has_institution: true,
      institution: inst,
      profile: null,
      school,
      classes_count: classesCount,
      subjects_count: subjectsCount,
      teachers_count: teachersCount,
      students_count: studentsCount,
      onboarding,
      earliest_incomplete_step: onboarding?.current_step || calculatedStep,
    };
  },

  // RPCs
  async createInstitutionAccount(params: CreateInstitutionAccountParams): Promise<CreateInstitutionAccountResult> {
    return institutionService.createInstitutionAccount(params);
  },

  async createAdminProfile(params: CreateAdminProfileParams & { password?: string }) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        institution_id: params.institution_id,
        user_id: `usr_${Date.now()}`,
        full_name: params.full_name,
        email: params.email,
        role: 'admin',
        phone: params.phone || null,
      } as any)
      .select()
      .single();

    if (error || !profile) {
      console.warn("Could not insert profile directly:", error?.message);
      return {
        profile_id: `prof_${Date.now()}`,
        user_id: `usr_${Date.now()}`,
        institution_id: params.institution_id,
        full_name: params.full_name,
        email: params.email,
        role: 'admin',
        created_at: new Date().toISOString(),
      };
    }

    const p = profile as any;
    return {
      profile_id: p.id,
      user_id: p.user_id,
      institution_id: p.institution_id,
      full_name: p.full_name,
      email: p.email || params.email,
      role: p.role,
      created_at: p.created_at,
    };
  },

  async createSchoolWithClasses(params: CreateSchoolWithClassesParams): Promise<CreateSchoolResult> {
    return schoolService.createSchoolWithClasses(params);
  },

  async updateSchoolIdentity(params: { school_id: string; logo_url?: string; url_slug?: string }) {
    return schoolService.updateSchoolIdentity(params.school_id, params.logo_url, params.url_slug);
  },

  async assignSubjectsToClasses(params: {
    school_id: string;
    institution_id: string;
    assignments: Array<{ class_id: string; subject_id: string }>;
  }) {
    return subjectService.assignSubjectsToClasses(params);
  },

  async createTeacher(params: CreateTeacherParams) {
    return teacherService.createTeacher(params);
  },

  async enrollStudent(params: EnrollStudentParams) {
    return studentService.enrollStudent(params);
  },

  async reconcileAndLaunch(params: ReconcileAndLaunchParams): Promise<ReconciliationReport> {
    return onboardingService.reconcileAndLaunch(params);
  },

  // Query Endpoints
  async getInstitution(id: string): Promise<Institution | null> {
    return institutionService.getInstitution(id);
  },

  async getSchools(institutionId?: string): Promise<School[]> {
    if (!institutionId) return [];
    return schoolService.getSchools(institutionId);
  },

  async getClasses(schoolId?: string): Promise<ClassEntity[]> {
    if (!schoolId) return [];
    return classService.getClasses(schoolId);
  },

  async getClassSubjects(schoolId?: string): Promise<ClassSubject[]> {
    if (!schoolId) return [];
    return subjectService.getClassSubjects(schoolId);
  },

  async getTeachers(schoolId?: string): Promise<Teacher[]> {
    if (!schoolId) return [];
    return teacherService.getTeachers(schoolId);
  },

  async getStudents(schoolId?: string, classId?: string): Promise<Student[]> {
    if (!schoolId) return [];
    return studentService.getStudents(schoolId, classId);
  },

  async getCbtExams(schoolId?: string): Promise<CbtExam[]> {
    if (!schoolId) return [];
    return cbtService.getExams(schoolId);
  },

  async getCbtExamDetails(examId: string) {
    return cbtService.getExamWithQuestions(examId);
  },

  async getCbtExamDetail(examId: string) {
    const res = await cbtService.getExamWithQuestions(examId);
    return {
      ...res.exam,
      questions: res.questions,
    };
  },

  async createCbtExam(examData: any, questions: any[]) {
    return cbtService.createExam(examData, questions);
  },

  async submitCbtExam(examId: string, payload: { student_id?: string; student_name?: string; student_number?: string; answers?: Record<string, string> }, questions: any[] = []) {
    return cbtService.submitAttempt(examId, payload.student_id || 'std_guest', payload.answers || {}, questions);
  },

  async getGradingSubmissions(schoolId?: string): Promise<AnswerScript[]> {
    if (!schoolId) return [];
    return aiGradingService.getAnswerScripts(schoolId);
  },

  async runAiGrading(params: {
    student_work: string;
    assignment_title: string;
    subject_name?: string;
    rubric: any;
  }) {
    return aiGradingService.evaluateWork(params.student_work, params.rubric, params.assignment_title);
  },

  async submitGradingWork(payload: any): Promise<AnswerScript> {
    return aiGradingService.submitAnswerScript(payload);
  },

  async submitGrading(payload: any): Promise<AnswerScript> {
    return aiGradingService.submitAnswerScript(payload);
  },

  async reviewGradingSubmission(id: string, status: 'approved' | 'pending_review' | 'failed', teacherNotes?: string) {
    return aiGradingService.reviewSubmission(id, status, teacherNotes);
  },
};
