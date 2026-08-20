import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CitationGenerator } from '../../components/writing/CitationGenerator';
import { PublicTrustCounter } from '../../components/writing/PublicTrustCounter';
import { Bookmark, ArrowLeft, ArrowRight } from 'lucide-react';

export const CitationGeneratorPage: React.FC = () => {
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
            <Bookmark className="w-8 h-8 text-emerald-600" />
            <span>Free APA, MLA & Chicago Citation Generator</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Format citations for books, journal articles, and web pages in APA 7, MLA 9, Chicago, Harvard, and Vancouver styles.
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/teacher')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Explore Platform</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <CitationGenerator />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <PublicTrustCounter toolName="citation-generator" toolDisplayName="Free Citation Generator" showDetailed={true} />
        </div>
      </div>
    </div>
  );
};
