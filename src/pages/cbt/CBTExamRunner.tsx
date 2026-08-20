import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CBTQuestion } from '../../types/phase4.types';
import { ExamTimer } from '../../components/cbt/ExamTimer';
import { QuestionNavigator } from '../../components/cbt/QuestionNavigator';
import { AnswerOptions } from '../../components/cbt/AnswerOptions';
import { OfflineSyncStatus } from '../../components/cbt/OfflineSyncStatus';
import { ExamProgress } from '../../components/cbt/ExamProgress';
import { offlineSyncService } from '../../services/offlineSyncService';
import { 
  Flag, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export const CBTExamRunner: React.FC = () => {
  const { examId } = useParams<{ examId?: string }>();
  const navigate = useNavigate();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

  const sampleQuestions: CBTQuestion[] = [
    {
      id: 'q_1',
      questionNumber: 1,
      text: 'Which of the following processes is responsible for the formation of waterfalls in West African river courses?',
      options: [
        { id: 'opt_1a', letter: 'A', text: 'Weathering and soil creep' },
        { id: 'opt_1b', letter: 'B', text: 'Differential river erosion of hard and soft rock layers' },
        { id: 'opt_1c', letter: 'C', text: 'Deforestation and surface runoff' },
        { id: 'opt_1d', letter: 'D', text: 'Urbanization and river damming' },
      ],
      correctOptionId: 'opt_1b',
      marks: 5,
    },
    {
      id: 'q_2',
      questionNumber: 2,
      text: 'Solve for x in the linear algebraic equation: 2x + 5 = 15.',
      options: [
        { id: 'opt_2a', letter: 'A', text: 'x = 5' },
        { id: 'opt_2b', letter: 'B', text: 'x = 10' },
        { id: 'opt_2c', letter: 'C', text: 'x = 15' },
        { id: 'opt_2d', letter: 'D', text: 'x = 20' },
      ],
      correctOptionId: 'opt_2a',
      marks: 5,
    },
    {
      id: 'q_3',
      questionNumber: 3,
      text: 'What is the primary function of decomposers in an ecosystem?',
      options: [
        { id: 'opt_3a', letter: 'A', text: 'To produce oxygen for animals' },
        { id: 'opt_3b', letter: 'B', text: 'To recycle essential nutrients back into the soil' },
        { id: 'opt_3c', letter: 'C', text: 'To generate solar energy for plants' },
        { id: 'opt_3d', letter: 'D', text: 'To prevent soil erosion' },
      ],
      correctOptionId: 'opt_3b',
      marks: 5,
    },
    {
      id: 'q_4',
      questionNumber: 4,
      text: 'Which organelle is known as the powerhouse of the cell?',
      options: [
        { id: 'opt_4a', letter: 'A', text: 'Nucleus' },
        { id: 'opt_4b', letter: 'B', text: 'Ribosome' },
        { id: 'opt_4c', letter: 'C', text: 'Mitochondrion' },
        { id: 'opt_4d', letter: 'D', text: 'Golgi Apparatus' },
      ],
      correctOptionId: 'opt_4c',
      marks: 5,
    },
    {
      id: 'q_5',
      questionNumber: 5,
      text: 'Which arm of government is responsible for interpreting laws in Nigeria?',
      options: [
        { id: 'opt_5a', letter: 'A', text: 'Executive' },
        { id: 'opt_5b', letter: 'B', text: 'Legislature' },
        { id: 'opt_5c', letter: 'C', text: 'Judiciary' },
        { id: 'opt_5d', letter: 'D', text: 'Press' },
      ],
      correctOptionId: 'opt_5c',
      marks: 5,
    },
  ];

  const currentQ = sampleQuestions[currentQuestionIndex];
  const totalQ = sampleQuestions.length;

  // Auto-save timer every 30 seconds
  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      offlineSyncService.queueForSync('auto_save_answers', selectedAnswers);
      setPendingSyncCount(offlineSyncService.getPendingSyncCount());
    }, 30000);

    return () => clearInterval(autoSaveTimer);
  }, [selectedAnswers]);

  const handleSelectOption = (optionId: string) => {
    const qNum = currentQuestionIndex + 1;
    const updated = { ...selectedAnswers, [qNum]: optionId };
    setSelectedAnswers(updated);
    offlineSyncService.queueForSync('save_answer', { questionNumber: qNum, optionId });
    setPendingSyncCount(offlineSyncService.getPendingSyncCount());
  };

  const toggleFlag = () => {
    const qNum = currentQuestionIndex + 1;
    const updated = new Set(flaggedQuestions);
    if (updated.has(qNum)) updated.delete(qNum);
    else updated.add(qNum);
    setFlaggedQuestions(updated);
  };

  const handleTimeUp = () => {
    alert('Time has expired! Submitting CBT exam automatically.');
    navigate(`/cbt/results/${examId || 'ex_demo'}`);
  };

  const handleConfirmSubmit = () => {
    navigate(`/cbt/results/${examId || 'ex_demo'}`);
  };

  const answeredSet = new Set(Object.keys(selectedAnswers).map(Number));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-3 sm:p-6 font-sans max-w-md mx-auto space-y-4 pb-12">
      {/* Top Fixed Runner Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-xl flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            WAEC CBT Simulation
          </span>
          <h2 className="text-sm font-extrabold text-white leading-tight">Mathematics CBT</h2>
        </div>

        <div className="flex items-center gap-2">
          <ExamTimer duration={60} onTimeUp={handleTimeUp} />
          <button
            type="button"
            onClick={toggleFlag}
            className={`p-2 rounded-xl border transition-colors ${
              flaggedQuestions.has(currentQuestionIndex + 1)
                ? 'bg-amber-400 text-slate-950 border-amber-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Flag question for review"
          >
            <Flag className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Progress Counter */}
      <ExamProgress current={currentQuestionIndex + 1} total={totalQ} title="Mathematics Test" />

      {/* Main Question Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            Question {currentQuestionIndex + 1} of {totalQ}
          </span>
          <span className="text-xs font-semibold text-slate-400 font-mono">{currentQ.marks} Marks</span>
        </div>

        <h3 className="text-sm font-bold text-slate-900 leading-relaxed">{currentQ.text}</h3>

        <AnswerOptions
          options={currentQ.options}
          selectedOptionId={selectedAnswers[currentQuestionIndex + 1]}
          onSelect={handleSelectOption}
        />
      </div>

      {/* Prev / Next Navigation (Thumb-zone optimized 360px) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 bg-white text-slate-800 text-xs font-bold shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {currentQuestionIndex < totalQ - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQ - 1, prev + 1))}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowConfirmSubmit(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Exam</span>
          </button>
        )}
      </div>

      {/* Question Palette */}
      <QuestionNavigator
        totalQuestions={totalQ}
        currentQuestion={currentQuestionIndex + 1}
        answeredQuestions={answeredSet}
        flaggedQuestions={flaggedQuestions}
        onQuestionSelect={(qNum) => setCurrentQuestionIndex(qNum - 1)}
        isMobile={true}
      />

      {/* Offline Sync Status */}
      <OfflineSyncStatus pendingCount={pendingSyncCount} isOnline={true} />

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl animate-scaleUp">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Submit Exam Now?</h3>
              <p className="text-xs text-slate-500 mt-1">
                You have answered <strong>{answeredSet.size}</strong> out of <strong>{totalQ}</strong> questions.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
