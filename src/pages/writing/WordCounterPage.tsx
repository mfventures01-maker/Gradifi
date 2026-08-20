import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextStats } from '../../components/writing/TextStats';
import { PublicTrustCounter } from '../../components/writing/PublicTrustCounter';
import { wordCounterService } from '../../services/wordCounterService';
import { publicCounterService } from '../../services/publicCounterService';
import { 
  FileText, ArrowLeft, CheckCircle2, Sparkles, BookOpen, ShieldCheck, ArrowRight
} from 'lucide-react';

export const WordCounterPage: React.FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.length > 50) {
      publicCounterService.incrementCounter('word-counter');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header Navigation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/tools')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Free Writing Tools
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <span>Free Online Word & Character Counter</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Count words, characters, sentences, paragraphs, and estimated reading time live in real-time. No sign-up required.
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/teacher')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Explore School Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Counter Workspace */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Type or Paste Text Below</label>
              <button
                onClick={() => setText('')}
                className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Clear Text
              </button>
            </div>
            <textarea
              rows={12}
              value={text}
              onChange={handleTextChange}
              placeholder="Paste your essay, manuscript, or assignment here to analyze word count instantly..."
              className="w-full p-4 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
            />
          </div>

          <TextStats text={text} showDetailed={true} />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <PublicTrustCounter toolName="word-counter" toolDisplayName="Free Word Counter" showDetailed={true} />

          {/* Lead Generation CTA Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full border border-indigo-400/30">
              For Schools & Teachers
            </span>
            <h3 className="text-lg font-extrabold leading-snug">Need Automated Essay Grading for Your School?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              GRADIFI / SEFAES powers 10+ Nigerian secondary schools with AI rubric drafting, CBT exams, and instant broadsheet generation.
            </p>
            <button
              onClick={() => navigate('/portal/principal')}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>View Principal Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
