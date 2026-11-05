import { supabase } from '../lib/supabase';

export interface CbtExamRecord {
  id: string; school_id: string; class_id: string; subject_id: string; term_id: string | null;
  title: string; description: string | null; duration_minutes: number; total_marks: number;
  pass_mark: number | null; status: string | null; current_state: string;
  exam_date: string | null; start_time: string | null; end_time: string | null; created_at: string | null;
}
export interface CbtOptionRecord {
  id: string; question_id: string; option_letter: string; option_text: string; is_correct: boolean | null;
}
export interface CbtQuestionRecord {
  id: string; exam_id: string; question_number: number; question_text: string;
  question_type: string | null; difficulty: string | null; marks: number;
  image_url: string | null; options: CbtOptionRecord[];
}
export interface CbtPublicOffer {
  offer_id: string; exam_id: string; title: string; description: string | null;
  duration_minutes: number; total_marks: number; exam_date: string | null;
  start_time: string | null; end_time: string | null; school_name: string;
  subject_name: string; class_name: string; price_minor: number; currency: string;
}
export interface CbtAttemptStart {
  success: boolean; attempt_id: string; attempt_number: number; session_id: string;
  start_time: string; deadline_at: string; status: string; snapshot_questions: number;
}
export interface CbtSnapshotQuestion {
  question_id: string; text: string; marks: number; number: number; type: string;
  image_url: string | null; options: Array<{ id: string; text: string; letter: string }>;
}
export interface CbtExamResults {
  exam: { id: string; title: string; subjectName: string; className: string; durationMinutes: number;
    passMark: number; examDate: string | null; totalMarks: number; status: string };
  results: Array<{ id: string; studentName: string; studentId: string; score: number; maxScore: number;
    percentage: number; grade: string; position: string; submittedAt: string | null; status: 'Passed' | 'Failed' }>;
  summary: { averageScore: number; passRate: number; topScore: number; totalStudents: number; gradeDistribution: Record<string, number> };
}
function unwrap<T>(data: unknown, error: { message?: string } | null): T {
  if (error) throw new Error(error.message || 'CBT operation failed');
  if (data === null || data === undefined) throw new Error('CBT operation returned no data');
  return data as T;
}

export const cbtService = {
  async getAuthoringCatalog(schoolId: string): Promise<{
    classes: Array<{ id: string; name: string }>;
    subjects: Array<{ id: string; name: string }>;
  }> {
    const { data, error } = await supabase.rpc('get_cbt_authoring_catalog' as any, {
      p_school_id: schoolId,
    } as any);
    return unwrap(data, error);
  },

  async getExams(schoolId: string): Promise<CbtExamRecord[]> {
    if (!schoolId) return [];
    const { data, error } = await supabase.from('cbt_exams').select('*')
      .eq('school_id', schoolId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as CbtExamRecord[];
  },

  async getExamWithQuestions(examId: string): Promise<{ exam: CbtExamRecord; questions: CbtQuestionRecord[] }> {
    const { data: exam, error: examError } = await supabase.from('cbt_exams')
      .select('*').eq('id', examId).single();
    if (examError || !exam) throw examError || new Error('Exam not found');

    const { data: questions, error: questionError } = await supabase.from('cbt_questions')
      .select('*').eq('exam_id', examId).order('question_number', { ascending: true });
    if (questionError) throw questionError;

    const questionIds = (questions || []).map((q: any) => q.id);
    let options: CbtOptionRecord[] = [];
    if (questionIds.length) {
      const { data: optionRows, error: optionError } = await supabase.from('cbt_options')
        .select('*').in('question_id', questionIds).order('option_letter', { ascending: true });
      if (optionError) throw optionError;
      options = (optionRows || []) as unknown as CbtOptionRecord[];
    }
    const mapped = (questions || []).map((question: any) => ({
      ...question, options: options.filter(option => option.question_id === question.id),
    })) as CbtQuestionRecord[];
    return { exam: exam as unknown as CbtExamRecord, questions: mapped };
  },

  async createExam(input: {
    schoolId: string; classId: string; subjectId: string; termId?: string | null;
    title: string; description?: string | null; durationMinutes: number; passMark: number; startTime: string;
  }): Promise<{ exam_id: string }> {
    const { data, error } = await supabase.rpc('create_cbt_exam_v3' as any, {
      p_school_id: input.schoolId, p_class_id: input.classId, p_subject_id: input.subjectId,
      p_term_id: input.termId || null, p_title: input.title.trim(),
      p_description: input.description?.trim() || null, p_duration_minutes: input.durationMinutes,
      p_pass_mark: input.passMark, p_start_time: input.startTime,
    } as any);
    const result = unwrap<{ success: boolean; exam_id: string }>(data, error);
    if (!result.success || !result.exam_id) throw new Error('Exam creation was not confirmed');
    return { exam_id: result.exam_id };
  },

  async addQuestion(input: {
    examId: string; questionText: string; marks: number; questionNumber: number;
    difficulty: 'easy' | 'medium' | 'hard';
    options: Array<{ letter: string; text: string; is_correct: boolean }>;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('add_cbt_question' as any, {
      p_exam_id: input.examId, p_question_text: input.questionText, p_marks: input.marks,
      p_question_number: input.questionNumber, p_options: input.options, p_difficulty: input.difficulty,
    } as any);
    const result = unwrap<{ success: boolean; question_id: string }>(data, error);
    if (!result.success || !result.question_id) throw new Error('Question ' + input.questionNumber + ' was not saved');
    return result.question_id;
  },

  async updateQuestion(input: {
    questionId: string; questionText: string; marks: number; questionNumber: number;
    difficulty: 'easy' | 'medium' | 'hard';
    options: Array<{ letter: string; text: string; is_correct: boolean }>;
  }): Promise<void> {
    const { data, error } = await supabase.rpc('update_cbt_question' as any, {
      p_question_id: input.questionId, p_question_text: input.questionText, p_marks: input.marks,
      p_question_number: input.questionNumber, p_options: input.options, p_difficulty: input.difficulty,
    } as any);
    const result = unwrap<{ success: boolean }>(data, error);
    if (!result.success) throw new Error('Question update was not confirmed');
  },

  async deleteQuestion(questionId: string): Promise<void> {
    const { data, error } = await supabase.rpc('delete_cbt_question' as any, { p_question_id: questionId } as any);
    const result = unwrap<{ success: boolean }>(data, error);
    if (!result.success) throw new Error('Question deletion was not confirmed');
  },

  async publishExam(examId: string): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc('publish_cbt_exam' as any, { p_exam_id: examId } as any);
    return unwrap<Record<string, unknown>>(data, error);
  },

  async getPublishedQuestions(examId: string): Promise<CbtSnapshotQuestion[]> {
    const { data, error } = await supabase.rpc('get_cbt_exam_questions' as any, { p_exam_id: examId } as any);
    const result = unwrap<{ success: boolean; questions: CbtSnapshotQuestion[] }>(data, error);
    if (!result.success || !Array.isArray(result.questions)) throw new Error('Published exam paper is unavailable');
    return result.questions;
  },

  async getCandidateExam(examId: string): Promise<{
    id: string; title: string; description: string | null; duration_minutes: number;
    total_marks: number; pass_mark: number | null; start_time: string | null; end_time: string | null; status: string | null;
  }> {
    const { data, error } = await supabase.from('cbt_exams').select(
      'id,title,description,duration_minutes,total_marks,pass_mark,start_time,end_time,status'
    ).eq('id', examId).single();
    return unwrap(data, error);
  },

  async getActiveAttempt(examId: string): Promise<{
    active: boolean; attempt_id?: string; attempt_number?: number; session_id?: string;
    start_time?: string; deadline_at?: string; status?: string; session_state?: string; current_question?: number;
  }> {
    const { data, error } = await supabase.rpc('get_cbt_active_attempt' as any, {
      p_exam_id: examId,
    } as any);
    return unwrap(data, error);
  },

  async saveSessionSnapshot(sessionId: string, currentQuestion: number, remainingTime: number, state: string): Promise<void> {
    const { error } = await (supabase as any).from('cbt_session_snapshots').insert({
      session_id: sessionId,
      current_question: currentQuestion,
      remaining_time: Math.max(0, Math.floor(remainingTime)),
      state,
    });
    if (error) throw error;
  },

  async getAttemptState(attemptId: string): Promise<{
    success: boolean; attempt_id: string; exam_id: string; deadline_at: string;
    status: string; session_id: string; session_state: string; current_question: number;
    answers: Record<string, string>;
  }> {
    const { data, error } = await supabase.rpc('get_cbt_attempt_state' as any, {
      p_attempt_id: attemptId,
    } as any);
    return unwrap(data, error);
  },

  async createAttempt(examId: string): Promise<CbtAttemptStart> {
    const { data, error } = await supabase.rpc('create_cbt_attempt' as any, { p_exam_id: examId } as any);
    return unwrap<CbtAttemptStart>(data, error);
  },

  async transitionSession(sessionId: string, toState: string): Promise<void> {
    const { data, error } = await supabase.rpc('transition_cbt_session' as any, {
      p_session_id: sessionId, p_to_state: toState,
    } as any);
    const result = unwrap<{ success: boolean; state: string }>(data, error);
    if (!result.success || result.state !== toState) throw new Error('Session transition to ' + toState + ' was not confirmed');
  },

  async submitAnswer(attemptId: string, questionId: string, optionId: string): Promise<void> {
    const { data, error } = await supabase.rpc('submit_cbt_answer' as any, {
      p_attempt_id: attemptId, p_question_id: questionId, p_selected_option_id: optionId,
    } as any);
    const result = unwrap<{ success: boolean; saved?: boolean; error?: string }>(data, error);
    if (!result.success || result.saved === false) throw new Error(result.error || 'Answer was not saved');
  },

  async submitAttempt(attemptId: string): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc('submit_cbt_exam' as any, { p_attempt_id: attemptId } as any);
    const result = unwrap<Record<string, unknown>>(data, error);
    if (result.success !== true) throw new Error('Attempt finalization was not confirmed');
    return result;
  },

  async getExamResults(examId: string): Promise<CbtExamResults> {
    const { data, error } = await supabase.rpc('get_cbt_exam_results' as any, { p_exam_id: examId } as any);
    return unwrap<CbtExamResults>(data, error);
  },

  async getPublicOffers(): Promise<CbtPublicOffer[]> {
    const { data, error } = await supabase.rpc('cbt_public_get_offers' as any);
    const offers = unwrap<CbtPublicOffer[]>(data, error);
    return Array.isArray(offers) ? offers : [];
  },

  async registerPublicCandidate(firstName?: string, lastName?: string): Promise<{ student_id: string; email: string }> {
    const { data, error } = await supabase.rpc('cbt_public_register_candidate' as any, {
      p_first_name: firstName || null, p_last_name: lastName || null,
    } as any);
    return unwrap<{ success: boolean; student_id: string; email: string }>(data, error);
  },

  async createPublicOffer(input: {
    examId: string; priceMinor: number; currency?: string; listed?: boolean;
    availableFrom?: string | null; availableUntil?: string | null;
  }): Promise<void> {
    const { data, error } = await supabase.rpc('cbt_public_create_offer' as any, {
      p_exam_id: input.examId, p_price_minor: input.priceMinor, p_currency: input.currency || 'NGN',
      p_is_listed: input.listed ?? true, p_available_from: input.availableFrom || null,
      p_available_until: input.availableUntil || null,
    } as any);
    const result = unwrap<{ success: boolean }>(data, error);
    if (!result.success) throw new Error('Public exam offer was not saved');
  },
};
