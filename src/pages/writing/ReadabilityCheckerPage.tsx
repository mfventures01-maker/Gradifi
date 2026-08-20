import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReadabilityScore } from '../../components/writing/ReadabilityScore';
import { PublicTrustCounter } from '../../components/writing/PublicTrustCounter';
import { textAnalyzerService } from '../../services/textAnalyzerService';
import { publicCounterService } from '../../services/publicCounterService';
import { BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';

export const ReadabilityCheckerPage: React.FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');

  const scores = textAnalyzerService.getReadabilityScores(text);
  const complexity = textAnalyzerService.getComplexity(text);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.length > 50) {
      publicCounterService.incrementCounter('readability-checker');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/tools')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Free Writing Tools
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <span>Free Readability & Grade Level Checker</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Analyze Flesch Reading Ease, Flesch-Kincaid Grade Level, SMOG Index, and text complexity.
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/teacher')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>View Teacher Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Paste Text for Readability Analysis</label>
            <textarea
              rows={8}
              value={text}
              onChange={handleTextChange}
              placeholder="Paste article, essay, or exam text to calculate grade level readability..."
              className="w-full p-4 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
            />
          </div>

          <ReadabilityScore scores={scores} complexity={complexity} />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <PublicTrustCounter toolName="readability-checker" toolDisplayName="Free Readability Checker" showDetailed={true} />
        </div>
      </div>
    </div>
  );
};
