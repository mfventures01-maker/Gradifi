import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScriptItem, RubricCriterion, OverrideData } from '../../types/phase4.types';
import { gradingReviewService } from '../../services/gradingReviewService';
import { rubricService } from '../../services/rubricService';
import { ConfidenceIndicator } from '../../components/grading/ConfidenceIndicator';
import { RubricCriteria } from '../../components/grading/RubricCriteria';
import { GradeOverride } from '../../components/grading/GradeOverride';
import { 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Printer, 
  UserCheck 
} from 'lucide-react';

export const GradingReview: React.FC = () => {
  const { scriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();

  const [script, setScript] = useState<ScriptItem | null>(null);
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [teacherScores, setTeacherScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [scriptId]);

  async function loadData() {
    setLoading(true);
    const item = await gradingReviewService.getScriptById(scriptId || 'scr_01');
    const rub = rubricService.getDefaultLiteratureRubric();

    setScript(item);
    setRubric(rub);

    if (item.criteriaScores) {
      setTeacherScores(item.criteriaScores);
    } else {
      const initial: Record<string, number> = {};
      rub.forEach((r) => {
        initial[r.id] = Math.round(r.maxScore * 0.8);
      });
      setTeacherScores(initial);
    }

    setLoading(false);
  }

  const handleScoreChange = (criterionId: string, score: number) => {
    setTeacherScores((prev) => ({
      ...prev,
      [criterionId]: score,
    }));
  };

  const calculatedTotal = Object.values(teacherScores).reduce((a, b) => a + b, 0);

  const handleApprove = async (overrideData: OverrideData) => {
    setSaving(true);
    await gradingReviewService.overrideGrade(overrideData);
    setSaving(false);
    alert(`Grade approved and released for ${script?.studentName}.`);
    navigate('/grading/queue');
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this AI draft and send for re-evaluation?')) {
      navigate('/grading/queue');
    }
  };

  if (loading || !script) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-8 h-8 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-6xl mx-auto space-y-6">
      {/* Top Header Navigation */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/grading/queue')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> ← Back to Queue
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Review: {script.studentName} — <span className="text-indigo-600">{script.assignmentTitle}</span>
          </h1>
          <p className="text-xs text-slate-500">Class: {script.className} • Subject: {script.subjectName}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Audit</span>
          </button>
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Essay (OCR Text) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Student Work (OCR Extracted Text)</span>
            </h3>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Submitted {script.submittedAt}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 font-serif text-sm leading-relaxed text-slate-800 space-y-3 min-h-[300px] whitespace-pre-line">
            {script.essayText}
          </div>

          {script.aiFeedback && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-1.5">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Qualitative Synthesis</span>
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">{script.aiFeedback}</p>
            </div>
          )}
        </div>

        {/* Right Column: AI Rubric Scores & Teacher Override */}
        <div className="lg:col-span-6 space-y-5">
          {/* AI Confidence Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Calibration Metric</span>
              <p className="text-xs font-semibold text-slate-800">SEFAES Confidence Metric</p>
            </div>
            <ConfidenceIndicator confidence={script.confidence} size="md" />
          </div>

          {/* Interactive Rubric Criteria Breakdown */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Interactive Rubric Breakdown</h3>
            <RubricCriteria
              criteria={rubric}
              aiScores={script.criteriaScores || { crit_1: 28, crit_2: 32, crit_3: 28 }}
              teacherScores={teacherScores}
              onScoreChange={handleScoreChange}
              isEditable={true}
              showAuditTrail={true}
            />
          </div>

          {/* Grade Override & Release Bar */}
          <GradeOverride
            scriptId={script.id}
            studentName={script.studentName}
            aiScore={script.aiScore}
            maxScore={100}
            currentGrade={calculatedTotal >= 75 ? 'A1' : calculatedTotal >= 65 ? 'B2' : 'C4'}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={saving}
          />
        </div>
      </div>
    </div>
  );
};
