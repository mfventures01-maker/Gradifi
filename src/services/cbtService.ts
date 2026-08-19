/**
 * GRADIFI x SEFAES - CBT EXAMINATION SERVICE
 * Canonical SSoT interaction with cbt_exams, cbt_questions, cbt_attempts, cbt_answers, and cbt_results_summary.
 */

import { supabase } from '../lib/supabase';
import { CbtExam, CbtQuestion, CbtAttempt } from '../contracts/schema';

export const cbtService = {
  /**
   * Fetch all exams for a school
   */
  async getExams(schoolId: string): Promise<(CbtExam & { questions_count?: number; attempts_count?: number })[]> {
    const { data: exams, error } = await supabase
      .from('cbt_exams')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!exams) return [];

    return (exams as CbtExam[]).map(e => ({
      ...e,
      questions_count: 0,
      attempts_count: 0,
    }));
  },

  /**
   * Fetch published exams for students
   */
  async getPublishedExams(schoolId: string): Promise<(CbtExam & { questions_count?: number; attempts_count?: number })[]> {
    const { data: exams, error } = await supabase
      .from('cbt_exams')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!exams) return [];

    return (exams as CbtExam[]).map(e => ({
      ...e,
      questions_count: 0,
      attempts_count: 0,
    }));
  },

  /**
   * Fetch single exam with all nested questions
   */
  async getExamWithQuestions(examId: string): Promise<{ exam: CbtExam; questions: CbtQuestion[] }> {
    const { data: exam, error: examErr } = await supabase
      .from('cbt_exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examErr || !exam) throw (examErr || new Error('Exam not found'));

    const { data: questions, error: qErr } = await supabase
      .from('cbt_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true });

    if (qErr) throw qErr;

    return {
      exam: exam as CbtExam,
      questions: (questions as CbtQuestion[]) || [],
    };
  },

  /**
   * Create CBT Exam along with questions
   */
  async createExam(
    examData: DatabaseInsert<'cbt_exams'>,
    questions: Array<Omit<DatabaseInsert<'cbt_questions'>, 'exam_id'>> = []
  ): Promise<CbtExam> {
    const { data: exam, error: examErr } = await supabase
      .from('cbt_exams')
      .insert(examData as any)
      .select()
      .single();

    if (examErr || !exam) throw (examErr || new Error('Failed to create exam'));

    if (questions.length > 0) {
      const qInserts = questions.map(q => ({
        ...q,
        exam_id: (exam as CbtExam).id,
      }));
      const { error: qErr } = await supabase.from('cbt_questions').insert(qInserts as any);
      if (qErr) throw qErr;
    }

    return exam as CbtExam;
  },

  /**
   * Submit an attempt, store answers, and compute deterministic score
   */
  async submitAttempt(
    examId: string,
    studentId: string,
    answers: Record<string, string>,
    questions: CbtQuestion[]
  ): Promise<{ attempt: CbtAttempt; detailed_results: any[] }> {
    let totalScore = 0;
    const detailedResults: any[] = [];

    for (const q of questions) {
      const studentAnswer = answers[q.id] || null;
      const isCorrect = studentAnswer === q.correct_option;
      const marksObtained = isCorrect ? q.marks : 0;
      totalScore += marksObtained;

      detailedResults.push({
        question_id: q.id,
        question_text: q.question_text,
        options: q.options,
        student_answer: studentAnswer,
        correct_answer: q.correct_option,
        is_correct: isCorrect,
        marks_obtained: marksObtained,
        max_marks: q.marks,
        explanation: q.explanation,
      });
    }

    const totalPossible = questions.reduce((acc, q) => acc + q.marks, 0) || 1;
    const percentage = Math.round((totalScore / totalPossible) * 100);
    const passed = percentage >= 50;

    // 1. Create Attempt Record
    const { data: attempt, error: attemptErr } = await supabase
      .from('cbt_attempts')
      .insert({
        exam_id: examId,
        student_id: studentId,
        score: totalScore,
        total_marks: totalPossible,
        percentage,
        passed,
        submitted_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (attemptErr || !attempt) throw (attemptErr || new Error('Failed to save attempt'));

    // 2. Insert Answers
    const typedAttempt = attempt as CbtAttempt;
    const answerInserts = questions.map(q => ({
      attempt_id: typedAttempt.id,
      question_id: q.id,
      student_answer: answers[q.id] || null,
      is_correct: answers[q.id] === q.correct_option,
      marks_obtained: answers[q.id] === q.correct_option ? q.marks : 0,
    }));

    await supabase.from('cbt_answers').insert(answerInserts as any);

    // 3. Upsert Results Summary
    await supabase.from('cbt_results_summary').insert({
      exam_id: examId,
      student_id: studentId,
      attempt_id: typedAttempt.id,
      score: totalScore,
      total_marks: totalPossible,
      percentage,
      passed,
      published_at: new Date().toISOString(),
    } as any);

    return {
      attempt: typedAttempt,
      detailed_results: detailedResults,
    };
  },

  /**
   * Get all attempts for an exam
   */
  async getAttempts(examId: string): Promise<CbtAttempt[]> {
    const { data, error } = await supabase
      .from('cbt_attempts')
      .select('*')
      .eq('exam_id', examId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return (data as CbtAttempt[]) || [];
  },
};

type DatabaseInsert<T extends keyof import('../types/database.types').Database['public']['Tables']> =
  import('../types/database.types').Database['public']['Tables'][T]['Insert'];
