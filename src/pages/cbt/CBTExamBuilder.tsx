import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { classService } from '../../services/classService';
import { subjectService } from '../../services/subjectService';
import { cbtService, CbtExamRecord } from '../../services/cbtService';

type BuilderOption = { id: string; letter: string; text: string };
type BuilderQuestion = {
  id: string;
  persistedId?: string;
  text: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  options: BuilderOption[];
  correctOptionId: string;
};

const makeQuestion = (number: number): BuilderQuestion => ({
  id: 'local-' + crypto.randomUUID(),
  text: '',
  marks: 1,
  difficulty: 'medium',
  options: ['A', 'B', 'C', 'D'].map(letter => ({
    id: 'local-' + crypto.randomUUID(), letter, text: '',
  })),
  correctOptionId: '',
});

export const CBTExamBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId?: string }>();
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [exam, setExam] = useState<CbtExamRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passMark, setPassMark] = useState(40);
  const [startTime, setStartTime] = useState(() => {
    const value = new Date(Date.now() + 15 * 60 * 1000);
    value.setSeconds(0, 0);
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const identity = await authService.resolveCurrentIdentity();
        if (!identity.schoolId) throw new Error('Your authenticated account is not linked to a school.');
        const [classRows, subjectRows] = await Promise.all([
          classService.getClasses(identity.schoolId),
          subjectService.getSubjectCatalog(),
        ]);
        if (!alive) return;
        setSchoolId(identity.schoolId);
        setClasses(classRows.map(row => ({ id: row.id, name: row.name })));
        setSubjects(subjectRows.map(row => ({ id: row.id, name: row.name })));
        if (classRows[0]) setClassId(classRows[0].id);
        if (subjectRows[0]) setSubjectId(subjectRows[0].id);

        if (examId) {
          const loaded = await cbtService.getExamWithQuestions(examId);
          if (!alive) return;
          setExam(loaded.exam);
          setTitle(loaded.exam.title);
          setDescription(loaded.exam.description || '');
          setClassId(loaded.exam.class_id);
          setSubjectId(loaded.exam.subject_id);
          setDurationMinutes(loaded.exam.duration_minutes);
          setPassMark(loaded.exam.pass_mark || 0);
          if (loaded.exam.start_time) {
            const date = new Date(loaded.exam.start_time);
            setStartTime(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
          setQuestions(loaded.questions.map(question => ({
            id: question.id,
            persistedId: question.id,
            text: question.question_text,
            marks: question.marks,
            difficulty: (question.difficulty || 'medium').toLowerCase() as BuilderQuestion['difficulty'],
            options: question.options.map(option => ({
              id: option.id, letter: option.option_letter, text: option.option_text,
            })),
            correctOptionId: question.options.find(option => option.is_correct)?.id || '',
          })));
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Unable to load CBT authoring data');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [examId]);

  const totalMarks = useMemo(() => questions.reduce((sum, question) => sum + Number(question.marks || 0), 0), [questions]);
  const isDraft = !exam || exam.status === 'draft';

  const updateQuestion = (id: string, patch: Partial<BuilderQuestion>) => {
    setQuestions(current => current.map(question => question.id === id ? { ...question, ...patch } : question));
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    setQuestions(current => current.map(question => question.id === questionId
      ? { ...question, options: question.options.map(option => option.id === optionId ? { ...option, text } : option) }
      : question));
  };

  const addQuestion = () => setQuestions(current => [...current, makeQuestion(current.length + 1)]);
  const removeQuestion = (id: string) => setQuestions(current => current.filter(question => question.id !== id));

  const validate = () => {
    if (!schoolId || !classId || !subjectId) throw new Error('Select a school class and subject.');
    if (!title.trim()) throw new Error('Exam title is required.');
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) throw new Error('Duration must be between 1 and 600 minutes.');
    if (!Number.isInteger(passMark) || passMark < 0 || passMark > totalMarks) {
      if (questions.length) throw new Error('Pass mark cannot exceed the total question marks.');
    }
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];
      if (!question.text.trim()) throw new Error('Question ' + (index + 1) + ' requires text.');
      if (!Number.isInteger(Number(question.marks)) || Number(question.marks) <= 0) throw new Error('Question ' + (index + 1) + ' must have positive marks.');
      if (question.options.length < 2 || question.options.some(option => !option.text.trim())) {
        throw new Error('Question ' + (index + 1) + ' requires at least two completed options.');
      }
      if (!question.correctOptionId || !question.options.some(option => option.id === question.correctOptionId)) {
        throw new Error('Select exactly one correct option for question ' + (index + 1) + '.');
      }
    }
  };

  const save = async (publish: boolean) => {
    setError('');
    try {
      validate();
      if (publish && questions.length === 0) throw new Error('Add at least one question before publishing.');
      setSaving(true);

      let currentExamId = exam?.id || examId || '';
      if (!currentExamId) {
        const created = await cbtService.createExam({
          schoolId, classId, subjectId, title, description, durationMinutes,
          passMark, startTime: new Date(startTime).toISOString(),
        });
        currentExamId = created.exam_id;
        navigate('/cbt/builder/' + currentExamId, { replace: true });
      }

      for (let index = 0; index < questions.length; index++) {
        const question = questions[index];
        const payload = {
          examId: currentExamId,
          questionText: question.text.trim(),
          marks: Number(question.marks),
          questionNumber: index + 1,
          difficulty: question.difficulty,
          options: question.options.map(option => ({
            letter: option.letter,
            text: option.text.trim(),
            is_correct: option.id === question.correctOptionId,
          })),
        };
        if (question.persistedId) {
          await cbtService.updateQuestion({
            questionId: question.persistedId,
            questionText: payload.questionText,
            marks: payload.marks,
            questionNumber: payload.questionNumber,
            difficulty: payload.difficulty,
            options: payload.options,
          });
        } else {
          const persistedId = await cbtService.addQuestion(payload);
          setQuestions(current => current.map(item => item.id === question.id
            ? { ...item, persistedId, id: persistedId, options: item.options.map(option => ({ ...option, id: option.id })) }
            : item));
          questions[index].persistedId = persistedId;
        }
      }

      if (publish) {
        await cbtService.publishExam(currentExamId);
        navigate('/cbt/manager', { replace: true });
      } else {
        navigate('/cbt/manager', { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save exam');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Loading CBT authoring workspace…</div>;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-7 max-w-5xl mx-auto space-y-5">
      <header className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/cbt/manager')} className="text-xs text-slate-500 flex items-center gap-2 mb-2">
            <ArrowLeft size={14} /> Exam manager
          </button>
          <h1 className="text-2xl font-extrabold">{examId ? 'Edit draft exam' : 'Create CBT exam'}</h1>
          <p className="text-sm text-slate-500">Questions, answers and publishing are persisted through protected database functions.</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>{questions.length} questions</div>
          <div className="font-bold text-slate-800">{totalMarks} total marks</div>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {!isDraft && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">This exam is published. Its question snapshot is immutable.</div>}

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-bold">Exam configuration</h2>
        <label className="block text-sm">Exam title
          <input disabled={!isDraft} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        <label className="block text-sm">Description
          <textarea disabled={!isDraft} value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block text-sm">Class
            <select disabled={!isDraft} value={classId} onChange={e => setClassId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3">
              {classes.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">Subject
            <select disabled={!isDraft} value={subjectId} onChange={e => setSubjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3">
              {subjects.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">Duration (minutes)
            <input disabled={!isDraft} type="number" min={1} max={600} value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm">Pass mark (marks)
            <input disabled={!isDraft} type="number" min={0} value={passMark} onChange={e => setPassMark(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm md:col-span-2">Scheduled start
            <input disabled={!isDraft} type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Question bank for this exam</h2>
          <button disabled={!isDraft} onClick={addQuestion} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-40">
            <Plus size={16} /> Add question
          </button>
        </div>
        {questions.map((question, index) => (
          <article key={question.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Question {index + 1}</h3>
              <button disabled={!isDraft} onClick={() => removeQuestion(question.id)} className="text-rose-600 text-xs flex items-center gap-1 disabled:opacity-40">
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <textarea disabled={!isDraft} rows={2} value={question.text} onChange={e => updateQuestion(question.id, { text: e.target.value })} placeholder="Enter the question prompt" className="w-full rounded-lg border border-slate-300 p-3" />
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-sm">Marks
                <input disabled={!isDraft} type="number" min={1} value={question.marks} onChange={e => updateQuestion(question.id, { marks: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
              </label>
              <label className="text-sm">Difficulty
                <select disabled={!isDraft} value={question.difficulty} onChange={e => updateQuestion(question.id, { difficulty: e.target.value as BuilderQuestion['difficulty'] })} className="mt-1 w-full rounded-lg border border-slate-300 p-2">
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </label>
              <div className="text-xs text-slate-500 self-end pb-2">Select the radio button for the correct answer.</div>
            </div>
            <div className="space-y-2">
              {question.options.map(option => (
                <div key={option.id} className="flex items-center gap-2">
                  <input disabled={!isDraft} type="radio" name={'correct-' + question.id} checked={question.correctOptionId === option.id} onChange={() => updateQuestion(question.id, { correctOptionId: option.id })} />
                  <span className="w-5 text-xs font-bold text-slate-500">{option.letter}</span>
                  <input disabled={!isDraft} value={option.text} onChange={e => updateOption(question.id, option.id, e.target.value)} placeholder={'Option ' + option.letter} className="flex-1 rounded-lg border border-slate-300 p-2 text-sm" />
                </div>
              ))}
            </div>
          </article>
        ))}
        {questions.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No questions added yet. Add the first question to begin.</div>}
      </section>

      <footer className="flex flex-wrap justify-end gap-3 pb-10">
        <button onClick={() => navigate('/cbt/manager')} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold">Cancel</button>
        <button disabled={saving || !isDraft} onClick={() => save(false)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save draft
        </button>
        <button disabled={saving || !isDraft} onClick={() => save(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Publish exam
        </button>
      </footer>
    </main>
  );
};
