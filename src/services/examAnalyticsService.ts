import { CBTExam, ExamResult } from '../types/phase4.types';
import { cbtService } from './cbtService';

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
    const report = await cbtService.getExamResults(examId);
    return {
      exam: {
        id: report.exam.id,
        title: report.exam.title,
        subjectName: report.exam.subjectName,
        className: report.exam.className,
        durationMinutes: report.exam.durationMinutes,
        passMarkPercentage: report.exam.passMark,
        examDate: report.exam.examDate || '',
        status: report.exam.status === 'published' ? 'Published' : 'Completed',
        totalQuestions: report.results.length,
        totalMarks: report.exam.totalMarks,
        totalStudents: report.summary.totalStudents,
        averageScore: report.summary.averageScore,
      },
      results: report.results.map(row => ({
        id: row.id,
        studentName: row.studentName,
        studentId: row.studentId,
        score: row.score,
        maxScore: row.maxScore,
        percentage: row.percentage,
        grade: row.grade,
        position: row.position,
        submittedAt: row.submittedAt || '',
        status: row.status,
      })),
      summary: report.summary,
    };
  },
};
