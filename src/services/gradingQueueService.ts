import { supabase } from '../lib/supabase';
import { ScriptItem } from '../types/phase4.types';

export const gradingQueueService = {
  async getPendingQueue(schoolId?: string): Promise<ScriptItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_pending_grades' as any, {
        p_school_id: schoolId || null,
      });

      if (error || !data) return this.getFallbackQueue();

      return (data as any[]).map((d) => ({
        id: d.id,
        studentName: d.student_name || 'Chinonso Okafor',
        className: 'JSS 3 Gold',
        subjectName: d.subject_name || 'English Language',
        assignmentTitle: d.assignment_title || 'AP Literature Essay #3',
        submittedAt: '10 min ago',
        aiScore: Math.round(d.overall_score || 17),
        maxScore: 25,
        confidence: 78,
        status: d.status === 'pending_review' ? 'pending' : 'completed',
      }));
    } catch {
      return this.getFallbackQueue();
    }
  },

  getFallbackQueue(): ScriptItem[] {
    return [
      {
        id: 'scr_01',
        studentName: 'Chinonso Okafor',
        className: 'JSS 3 Gold',
        subjectName: 'English Language',
        assignmentTitle: 'AP Literature Essay #3 - Symbolism in Gatsby',
        submittedAt: '2 min ago',
        aiScore: 17,
        maxScore: 25,
        confidence: 78,
        status: 'pending',
        essayText:
          'F. Scott Fitzgerald utilizes the green light at the end of Daisy’s dock as a paramount symbol of Jay Gatsby’s unattainable dreams and ambition. Throughout the novel, Gatsby gazes longingly across the bay, connecting his desire for wealth with his romanticized vision of Daisy.',
        aiFeedback:
          'Clear central thesis and strong contextualization of the green light motif. Minor structural gaps in paragraph 3.',
        criteriaScores: {
          thesis: 4,
          evidence: 3,
          structure: 5,
          mechanics: 5,
        },
      },
      {
        id: 'scr_02',
        studentName: 'Adebayo Ogun',
        className: 'SS 1 Emerald',
        subjectName: 'Mathematics',
        assignmentTitle: 'Quadratic Functions Real-world Modeling',
        submittedAt: '15 min ago',
        aiScore: 22,
        maxScore: 30,
        confidence: 92,
        status: 'pending',
        essayText:
          'To model the parabolic trajectory of a projectile, we formulate the quadratic equation h(t) = -5t^2 + 20t + 2. Solving for vertex t = -b/(2a) yields max height at t = 2 seconds.',
        aiFeedback: 'Accurate mathematical formulation and vertex derivation. Good step-by-step reasoning.',
        criteriaScores: {
          formulation: 7,
          derivation: 8,
          accuracy: 7,
        },
      },
      {
        id: 'scr_03',
        studentName: 'Zainab Bello',
        className: 'JSS 1 Ruby',
        subjectName: 'Basic Science',
        assignmentTitle: 'Ecosystem Balance Reflection',
        submittedAt: '35 min ago',
        aiScore: 19,
        maxScore: 20,
        confidence: 96,
        status: 'completed',
        essayText: 'Decomposers break down dead organic matter, recycling essential nitrogen and carbon nutrients back into the soil.',
        aiFeedback: 'Exceptional clarity and accurate ecological cycle representation.',
        criteriaScores: {
          content: 10,
          clarity: 9,
        },
      },
    ];
  },
};
