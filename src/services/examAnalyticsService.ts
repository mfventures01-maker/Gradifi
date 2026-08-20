import { CBTExam, ExamResult } from '../types/phase4.types';

export const examAnalyticsService = {
  async getExamResults(examId: string): Promise<{
    exam: CBTExam;
    results: ExamResult[];
    summary: {
      averageScore: number;
      passRate: number;
      topScore: number;
      totalStudents: number;
      gradeDistribution: Record<string, number>;
    };
  }> {
    return {
      exam: {
        id: examId,
        title: 'WAEC Mathematics Mock Examination 2026',
        subjectName: 'Mathematics',
        className: 'JSS 3 Gold',
        durationMinutes: 60,
        passMarkPercentage: 50,
        examDate: '2026-08-25',
        status: 'Completed',
        totalQuestions: 50,
        totalMarks: 100,
        totalStudents: 42,
        averageScore: 72.4,
      },
      summary: {
        averageScore: 72.4,
        passRate: 85.7,
        topScore: 98,
        totalStudents: 42,
        gradeDistribution: {
          A1: 15,
          B2: 12,
          B3: 8,
          C4: 4,
          F9: 3,
        },
      },
      results: [
        { id: 'res_1', studentName: 'Chinonso Okafor', studentId: 'std_01', score: 98, maxScore: 100, percentage: 98, grade: 'A1', position: '1st 🏆', submittedAt: 'Yesterday 10:45 AM', status: 'Passed' },
        { id: 'res_2', studentName: 'Kemi Adeyemi', studentId: 'std_02', score: 92, maxScore: 100, percentage: 92, grade: 'A1', position: '2nd 🥈', submittedAt: 'Yesterday 10:40 AM', status: 'Passed' },
        { id: 'res_3', studentName: 'Oluwaseun Bello', studentId: 'std_03', score: 88, maxScore: 100, percentage: 88, grade: 'B2', position: '3rd 🥉', submittedAt: 'Yesterday 10:42 AM', status: 'Passed' },
        { id: 'res_4', studentName: 'Grace Nwosu', studentId: 'std_04', score: 79, maxScore: 100, percentage: 79, grade: 'B3', position: '4th', submittedAt: 'Yesterday 10:48 AM', status: 'Passed' },
        { id: 'res_5', studentName: 'Tunde Folorunsho', studentId: 'std_05', score: 42, maxScore: 100, percentage: 42, grade: 'F9', position: '42nd', submittedAt: 'Yesterday 10:50 AM', status: 'Failed' },
      ],
    };
  },
};
