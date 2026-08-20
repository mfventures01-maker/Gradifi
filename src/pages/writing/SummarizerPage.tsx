import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SummarizerTool } from '../../components/writing/SummarizerTool';
import { PublicTrustCounter } from '../../components/writing/PublicTrustCounter';
import { FileText, ArrowLeft, ArrowRight } from 'lucide-react';

export const SummarizerPage: React.FC = () => {
  const navigate = useNavigate();

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
            <FileText className="w-8 h-8 text-purple-600" />
            <span>Free AI Essay & Article Summarizer</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Summarize lengthy articles, research papers, and essays into clear bullet points and key takeaways.
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/teacher')}
          className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Explore School System</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SummarizerTool />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <PublicTrustCounter toolName="summarizer" toolDisplayName="Free AI Summarizer" showDetailed={true} />
        </div>
      </div>
    </div>
  );
};
