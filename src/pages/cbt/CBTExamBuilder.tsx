import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CBTQuestion } from '../../types/phase4.types';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  BookOpen 
} from 'lucide-react';

export const CBTExamBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId?: string }>();

  const [step, setStep] = useState<1 | 2>(1);

  // Form Step 1 State
  const [title, setTitle] = useState('WAEC CBT Practice Test 2026');
  const [subjectName, setSubjectName] = useState('Mathematics');
  const [className, setClassName] = useState('JSS 3 Gold');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passMarkPercentage, setPassMarkPercentage] = useState(50);
  const [examDate, setExamDate] = useState('2026-08-25');

  // Form Step 2 Questions State
  const [questions, setQuestions] = useState<CBTQuestion[]>([
    {
      id: 'q_1',
      questionNumber: 1,
      text: 'Which of the following process is responsible for the formation of waterfalls in river courses?',
      options: [
        { id: 'opt_a', letter: 'A', text: 'Weathering' },
        { id: 'opt_b', letter: 'B', text: 'River erosion' },
        { id: 'opt_c', letter: 'C', text: 'Deforestation' },
        { id: 'opt_d', letter: 'D', text: 'Urbanization' },
      ],
      correctOptionId: 'opt_b',
      marks: 5,
      difficulty: 'Medium',
    },
    {
      id: 'q_2',
      questionNumber: 2,
      text: 'Solve for x in the linear equation: 2x + 5 = 15.',
      options: [
        { id: 'opt_2a', letter: 'A', text: 'x = 5' },
        { id: 'opt_2b', letter: 'B', text: 'x = 10' },
        { id: 'opt_2c', letter: 'C', text: 'x = 15' },
        { id: 'opt_2d', letter: 'D', text: 'x = 20' },
      ],
      correctOptionId: 'opt_2a',
      marks: 5,
      difficulty: 'Easy',
    },
  ]);

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  const currentQ = questions[selectedQuestionIndex];

  const handleAddQuestion = () => {
    const newQ: CBTQuestion = {
      id: `q_${Date.now()}`,
      questionNumber: questions.length + 1,
      text: 'New Question Prompt',
      options: [
        { id: `opt_${Date.now()}_a`, letter: 'A', text: 'Option A' },
        { id: `opt_${Date.now()}_b`, letter: 'B', text: 'Option B' },
        { id: `opt_${Date.now()}_c`, letter: 'C', text: 'Option C' },
        { id: `opt_${Date.now()}_d`, letter: 'D', text: 'Option D' },
      ],
      correctOptionId: `opt_${Date.now()}_a`,
      marks: 5,
      difficulty: 'Medium',
    };
    setQuestions([...questions, newQ]);
    setSelectedQuestionIndex(questions.length);
  };

  const handleSave = (publish = false) => {
    alert(publish ? 'CBT Exam published successfully!' : 'CBT Exam draft saved.');
    navigate('/cbt/manager');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/cbt/manager')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Exam Manager
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {examId ? 'Edit CBT Exam' : 'Create CBT Exam'}
          </h1>
          <p className="text-xs text-slate-500">Configure exam settings and question bank items.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              step === 1 ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-500'
            }`}
          >
            1. Exam Details
          </button>
          <button
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              step === 2 ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-500'
            }`}
          >
            2. Add Questions ({questions.length})
          </button>
        </div>
      </div>

      {step === 1 ? (
        /* Step 1: Exam Details */
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Step 1: Exam Configuration</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option>Mathematics</option>
                <option>English Language</option>
                <option>Basic Science</option>
                <option>Civic Education</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option>JSS 3 Gold</option>
                <option>JSS 3 Silver</option>
                <option>SS 1 Emerald</option>
                <option>SS 2 Gold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pass Mark Percentage (%)</label>
              <input
                type="number"
                value={passMarkPercentage}
                onChange={(e) => setPassMarkPercentage(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <span>Next: Add Questions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Step 2: Add Questions */
        <div className="space-y-5">
          {/* Question Palette Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuestionIndex(idx)}
                  className={`w-9 h-9 rounded-xl border text-xs font-mono font-bold flex items-center justify-center cursor-pointer ${
                    selectedQuestionIndex === idx
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                onClick={handleAddQuestion}
                className="w-9 h-9 rounded-xl border border-dashed border-indigo-400 bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs font-bold text-slate-500 shrink-0">
              Total Marks: {questions.reduce((a, b) => a + b.marks, 0)}
            </span>
          </div>

          {/* Current Question Edit Form */}
          {currentQ && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Question #{selectedQuestionIndex + 1}</h3>
                <span className="text-xs font-semibold text-slate-500 font-mono">{currentQ.marks} Marks</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Question Prompt</label>
                <textarea
                  rows={3}
                  value={currentQ.text}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[selectedQuestionIndex].text = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700">Answer Options (Select Correct Choice)</label>
                {currentQ.options.map((opt, oIdx) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`correct_${currentQ.id}`}
                      checked={currentQ.correctOptionId === opt.id}
                      onChange={() => {
                        const updated = [...questions];
                        updated[selectedQuestionIndex].correctOptionId = opt.id;
                        setQuestions(updated);
                      }}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    <span className="w-6 text-xs font-bold text-slate-500 font-mono">{opt.letter}.</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[selectedQuestionIndex].options[oIdx].text = e.target.value;
                        setQuestions(updated);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleSave(false)}
              className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Publish Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
