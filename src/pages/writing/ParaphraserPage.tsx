import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ParaphraseTool } from '../../components/writing/ParaphraseTool';
import { PublicTrustCounter } from '../../components/writing/PublicTrustCounter';
import { RefreshCw, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export const ParaphraserPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/tools')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Free Writing Tools
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <RefreshCw className="w-8 h-8 text-emerald-600" />
            <span>Free AI Sentence Paraphraser & Rewriter</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Rephrase sentences, improve academic clarity, and generate alternative phrasing free of charge.
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/teacher')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Try AI Grading Engine</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ParaphraseTool />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <PublicTrustCounter toolName="paraphraser" toolDisplayName="Free Paraphraser" showDetailed={true} />

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Why Use GRADIFI Paraphraser?
            </h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li>✓ 100% Free with zero registration</li>
              <li>✓ Academic & creative tone presets</li>
              <li>✓ Built-in plagiarism safety confidence rating</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
