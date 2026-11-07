import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Flag, Loader2, Send, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { ExamTimer } from '../../components/cbt/ExamTimer';
import { QuestionNavigator } from '../../components/cbt/QuestionNavigator';
import { AnswerOptions } from '../../components/cbt/AnswerOptions';
import { ExamProgress } from '../../components/cbt/ExamProgress';
import { cbtService, CbtAttemptStart, CbtSnapshotQuestion } from '../../services/cbtService';

type CandidateExam = {
  id: string; title: string; description: string | null; duration_minutes: number;
  total_marks: number; pass_mark: number | null; start_time: string | null;
  end_time: string | null; status: string | null;
};

export const CBTExamRunner: React.FC = () => {
  const navigate = useNavigate();
  const { examId = '' } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<CandidateExam | null>(null);
  const [questions, setQuestions] = useState<CbtSnapshotQuestion[]>([]);
  const [attempt, setAttempt] = useState<CbtAttemptStart | null>(null);
  const [sessionState, setSessionState] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [remainingTime, setRemainingTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [error, setError] = useState('');
  const submitLock = useRef(false);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (!examId) throw new Error('Exam identifier is missing.');
        const [examRecord, active] = await Promise.all([
          cbtService.getCandidateExam(examId),
          cbtService.getActiveAttempt(examId),
        ]);
        let attemptId = '';
        let sessionId = '';
        let deadlineAt = '';
        let startTime = new Date().toISOString();
        let attemptNumber = active.attempt_number || 1;
        let state = '';

        if (active.active && active.attempt_id && active.session_id) {
          attemptId = active.attempt_id;
          sessionId = active.session_id;
          deadlineAt = active.deadline_at || '';
          startTime = active.start_time || startTime;
          state = active.session_state || '';
        } else {
          const created = await cbtService.createAttempt(examId);
          attemptId = created.attempt_id;
          sessionId = created.session_id;
          deadlineAt = created.deadline_at;
          startTime = created.start_time;
          attemptNumber = created.attempt_number;
          state = 'INITIALIZING';
          await cbtService.transitionSession(sessionId, 'AUTHENTICATED');
          state = 'AUTHENTICATED';
          await cbtService.transitionSession(sessionId, 'LOADING_EXAM');
          state = 'LOADING_EXAM';
          await cbtService.transitionSession(sessionId, 'INSTRUCTIONS_VIEW');
          state = 'INSTRUCTIONS_VIEW';
        }

        const [paper, saved] = await Promise.all([
          cbtService.getPublishedQuestions(examId),
          cbtService.getAttemptState(attemptId),
        ]);
        if (!alive) return;

        if (saved.session_state === 'INITIALIZING') {
          await cbtService.transitionSession(sessionId, 'AUTHENTICATED');
          await cbtService.transitionSession(sessionId, 'LOADING_EXAM');
          await cbtService.transitionSession(sessionId, 'INSTRUCTIONS_VIEW');
          state = 'INSTRUCTIONS_VIEW';
        } else if (saved.session_state === 'AUTHENTICATED') {
          await cbtService.transitionSession(sessionId, 'LOADING_EXAM');
          await cbtService.transitionSession(sessionId, 'INSTRUCTIONS_VIEW');
          state = 'INSTRUCTIONS_VIEW';
        } else if (saved.session_state === 'LOADING_EXAM') {
          await cbtService.transitionSession(sessionId, 'INSTRUCTIONS_VIEW');
          state = 'INSTRUCTIONS_VIEW';
        } else {
          state = saved.session_state;
        }

        if (state === 'PAUSED') {
          await cbtService.transitionSession(sessionId, 'ACTIVE_EXAM');
          state = 'ACTIVE_EXAM';
        }
        if (state === 'SUBMITTED' || state === 'SCORED') {
          navigate('/cbt/results/' + examId, { replace: true });
          return;
        }

        setExam(examRecord);
        setQuestions(paper);
        setAttempt({
          success: true,
          attempt_id: attemptId,
          attempt_number: attemptNumber,
          session_id: sessionId,
          start_time: startTime,
          deadline_at: deadlineAt,
          status: active.status || 'in_progress',
          snapshot_questions: paper.length,
        });
        setSessionState(state);
        setAnswers(saved.answers || {});
        setCurrentIndex(Math.max(0, Math.min(saved.current_question || 0, paper.length - 1)));
        setHasStarted(state === 'ACTIVE_EXAM');
        setRemainingTime(Math.max(0, Math.ceil((Date.parse(deadlineAt) - Date.now()) / 1000)));
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Unable to start this CBT exam.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [examId, navigate]);

  const persistSnapshot = useCallback(async (questionIndex: number) => {
    if (!attempt || !isOnline) return;
    const seconds = attempt.deadline_at
      ? Math.max(0, Math.ceil((Date.parse(attempt.deadline_at) - Date.now()) / 1000))
      : remainingTime;
    await cbtService.saveSessionSnapshot(attempt.session_id, questionIndex, seconds);
  }, [attempt, isOnline, remainingTime]);

  const finalize = useCallback(async () => {
    if (!attempt || submitLock.current) return;
    if (!isOnline) {
      setError('Reconnect to the internet to submit. Your previously saved answers remain on the server.');
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setError('');
    try {
      await cbtService.submitAttempt(attempt.attempt_id);
      const state = await cbtService.getAttemptState(attempt.attempt_id);
      if (state.session_state === 'ACTIVE_EXAM' || state.session_state === 'PAUSED') {
        await cbtService.transitionSession(attempt.session_id, 'SUBMITTED');
        await cbtService.transitionSession(attempt.session_id, 'SCORED');
      } else if (state.session_state === 'SUBMITTED') {
        await cbtService.transitionSession(attempt.session_id, 'SCORED');
      }
      navigate('/cbt/results/' + examId, { replace: true });
    } catch (cause) {
      submitLock.current = false;
      setSubmitting(false);
      setError(cause instanceof Error ? cause.message : 'Submission failed. Retry when connected.');
    }
  }, [attempt, examId, isOnline, navigate]);

  const onTimeUp = useCallback(() => { void finalize(); }, [finalize]);

  const currentQuestion = questions[currentIndex];
  const answeredQuestions = new Set<number>(
    questions.map((question, index) => answers[question.question_id] ? index : -1).filter((index: number) => index >= 0)
  );

  const selectAnswer = async (optionId: string) => {
    if (!attempt || !currentQuestion || !hasStarted || savingAnswer || submitting) return;
    if (!isOnline) {
      setError('You are offline. Reconnect before changing an answer.');
      return;
    }
    setSavingAnswer(true);
    setError('');
    try {
      await cbtService.submitAnswer(attempt.attempt_id, currentQuestion.question_id, optionId);
      setAnswers(current => ({ ...current, [currentQuestion.question_id]: optionId }));
      try { await persistSnapshot(currentIndex); } catch { /* The answer itself is already durably saved by the answer RPC. */ }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Answer was not saved. Please retry.');
    } finally {
      setSavingAnswer(false);
    }
  };

  const goToQuestion = async (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    try { await persistSnapshot(index); } catch { /* Navigation does not invalidate the server-saved answers. */ }
  };

  const startExam = async () => {
    if (!attempt || !isOnline) return;
    setError('');
    try {
      await cbtService.transitionSession(attempt.session_id, 'ACTIVE_EXAM');
      setSessionState('ACTIVE_EXAM');
      setHasStarted(true);
      await persistSnapshot(currentIndex);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to activate exam session.');
    }
  };

  const toggleFlag = () => setFlagged(current => {
    const next = new Set(current);
    if (next.has(currentIndex)) next.delete(currentIndex);
    else next.add(currentIndex);
    return next;
  });

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500"><Loader2 className="animate-spin mr-2" /> Preparing secure exam session…</div>;

  if (error && !exam) {
    return <main className="min-h-screen grid place-items-center bg-slate-50 p-5">
      <section className="max-w-lg w-full rounded-2xl border border-rose-200 bg-white p-6 space-y-3">
        <AlertCircle className="text-rose-600" size={28} />
        <h1 className="text-xl font-bold">Unable to start exam</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <button onClick={() => navigate(-1)} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm">Go back</button>
      </section>
    </main>;
  }

  if (!exam || !attempt || !currentQuestion) return <main className="min-h-screen grid place-items-center p-5 text-slate-600">No published questions are available for this exam.</main>;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="rounded-2xl bg-slate-950 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={() => navigate('/portal/student')} className="text-xs text-slate-300 flex items-center gap-1 mb-2">
              <ArrowLeft size={13} /> Student portal
            </button>
            <h1 className="font-extrabold text-lg">{exam.title}</h1>
            <p className="text-xs text-slate-400">Attempt {attempt.attempt_number} · Server-timed session</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={'text-xs flex items-center gap-1 ' + (isOnline ? 'text-emerald-300' : 'text-amber-300')}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Connected' : 'Offline'}
            </span>
            <ExamTimer duration={exam.duration_minutes} deadlineAt={attempt.deadline_at} onTimeUp={onTimeUp} onTick={setRemainingTime} />
          </div>
        </header>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {!hasStarted && (
          <section className="rounded-2xl border border-indigo-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2 text-indigo-700"><ShieldCheck size={20} /><h2 className="font-bold text-lg">Exam instructions</h2></div>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li>Your attempt has already been created and its deadline is controlled by the server.</li>
              <li>Each answer is checked and saved by the server when you select it.</li>
              <li>Correct answers are not sent to this browser during the exam.</li>
              <li>Reconnect before changing answers or submitting if your connection drops.</li>
              <li>When the server deadline expires, submission is finalized automatically on the next valid request.</li>
            </ul>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span>{questions.length} questions</span><span>{exam.total_marks} marks</span><span>{exam.duration_minutes} minutes</span>
            </div>
            <button disabled={!isOnline} onClick={() => void startExam()} className="rounded-xl bg-indigo-600 px-5 py-3 text-white font-bold disabled:opacity-50">
              Start examination
            </button>
          </section>
        )}

        {hasStarted && (
          <>
            <div className="rounded-xl bg-white border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
              <ExamProgress current={currentIndex + 1} total={questions.length} title="Examination progress" timeRemaining={remainingTime} />
              <div className="text-xs text-slate-500 flex items-center gap-2">
                {savingAnswer ? <><Loader2 size={14} className="animate-spin" /> Saving answer…</> : <><CheckCircle2 size={14} className="text-emerald-600" /> Answers save to server</>}
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_260px] gap-4">
              <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 space-y-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                  <span>{currentQuestion.marks} mark(s)</span>
                </div>
                <h2 className="text-lg sm:text-xl font-semibold leading-relaxed">{currentQuestion.text}</h2>
                {currentQuestion.image_url && <img src={currentQuestion.image_url} alt="Question illustration" className="max-h-72 rounded-xl object-contain" />}
                <AnswerOptions
                  options={currentQuestion.options}
                  selectedOptionId={answers[currentQuestion.question_id]}
                  onSelect={selectAnswer}
                  disabled={!isOnline || savingAnswer || submitting}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button disabled={currentIndex === 0 || savingAnswer} onClick={() => void goToQuestion(currentIndex - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">
                    Previous
                  </button>
                  <button onClick={toggleFlag} className={'rounded-lg px-3 py-2 text-sm font-semibold flex items-center gap-2 ' + (flagged.has(currentIndex) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>
                    <Flag size={14} /> {flagged.has(currentIndex) ? 'Flagged' : 'Flag question'}
                  </button>
                  {currentIndex < questions.length - 1
                    ? <button disabled={savingAnswer} onClick={() => void goToQuestion(currentIndex + 1)} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-40">Next <ArrowRight size={15} /></button>
                    : <button disabled={savingAnswer || submitting || !isOnline} onClick={() => {
                        if (window.confirm('Submit this examination now? You cannot change answers after submission.')) void finalize();
                      }} className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-40">
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Submit exam
                      </button>}
                </div>
              </section>

              <aside className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
                <h3 className="font-bold text-sm">Question navigator</h3>
                <QuestionNavigator
                  totalQuestions={questions.length}
                  currentQuestion={currentIndex + 1}
                  answeredQuestions={new Set<number>(Array.from(answeredQuestions).map((index: number) => index + 1))}
                  flaggedQuestions={new Set<number>(Array.from(flagged).map((index: number) => index + 1))}
                  onQuestionSelect={number => void goToQuestion(number - 1)}
                />
                <div className="text-xs text-slate-500">
                  {answeredQuestions.size} of {questions.length} answered
                </div>
                <button disabled={submitting || savingAnswer || !isOnline} onClick={() => {
                  if (window.confirm('Submit this examination now?')) void finalize();
                }} className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-bold disabled:opacity-40">
                  Submit examination
                </button>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
};
