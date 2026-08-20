export interface ConfidenceIndicatorProps {
  confidence: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  loading?: boolean;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight?: number;
}

export interface RubricCriteriaProps {
  criteria: RubricCriterion[];
  aiScores: Record<string, number>;
  teacherScores?: Record<string, number>;
  onScoreChange?: (criterionId: string, score: number) => void;
  isEditable?: boolean;
  showAuditTrail?: boolean;
}

export interface OverrideData {
  scriptId: string;
  teacherScore: number;
  reason: string;
  approvedAt: string;
  approvedBy: string;
}

export interface GradeOverrideProps {
  scriptId: string;
  studentName: string;
  aiScore: number;
  maxScore: number;
  currentGrade: string;
  onApprove: (data: OverrideData) => Promise<void>;
  onReject: () => void;
  loading?: boolean;
}

export interface HumanAIAgreementProps {
  teacherId?: string;
  stats: {
    totalGraded: number;
    agreed: number;
    overridden: number;
    rejected: number;
    agreementRate: number;
    trend: number;
    criteriaBreakdown: Record<string, number>;
  };
  loading?: boolean;
}

export interface ExamTimerProps {
  duration: number; // in minutes
  onTimeUp?: () => void;
  onTick?: (remaining: number) => void;
  autoSubmit?: boolean;
}

export interface QuestionNavigatorProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: Set<number>;
  flaggedQuestions: Set<number>;
  onQuestionSelect: (questionNumber: number) => void;
  isMobile?: boolean;
}

export interface AnswerOptionsProps {
  options: Array<{ id: string; text: string; letter: string }>;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  multiple?: boolean;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

export interface OfflineSyncStatusProps {
  pendingCount?: number;
  lastSyncAt?: string;
  isOnline?: boolean;
  onSync?: () => Promise<void>;
  syncing?: boolean;
  autoSync?: boolean;
}

export interface ExamProgressProps {
  current: number;
  total: number;
  title?: string;
  timeRemaining?: number;
}

export interface ScriptItem {
  id: string;
  studentName: string;
  studentId?: string;
  className: string;
  subjectName: string;
  assignmentTitle: string;
  submittedAt: string;
  aiScore: number;
  maxScore: number;
  confidence: number;
  status: 'pending' | 'processing' | 'completed' | 'overridden' | 'flagged';
  essayText?: string;
  aiFeedback?: string;
  criteriaScores?: Record<string, number>;
  teacherScore?: number;
  overrideReason?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CBTQuestion {
  id: string;
  questionNumber: number;
  text: string;
  options: Array<{ id: string; letter: string; text: string }>;
  correctOptionId: string;
  marks: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  category?: string;
}

export interface CBTExam {
  id: string;
  title: string;
  subjectName: string;
  className: string;
  durationMinutes: number;
  passMarkPercentage: number;
  examDate: string;
  status: 'Draft' | 'Published' | 'Active' | 'Completed';
  totalQuestions: number;
  totalMarks: number;
  totalStudents?: number;
  averageScore?: number;
  questions?: CBTQuestion[];
}

export interface ExamResult {
  id: string;
  studentName: string;
  studentId: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  position: string;
  submittedAt: string;
  status: 'Passed' | 'Failed';
}
