import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicTrustCounter } from '../../components/writing/PublicTrustCounter';
import { 
  FileText, RefreshCw, BookOpen, Bookmark, Sparkles, ArrowRight, ShieldCheck, Users, School, Search 
} from 'lucide-react';

export const WritingToolsHubPage: React.FC = () => {
  const navigate = useNavigate();

  const tools = [
    {
      id: 'plagiarism-checker',
      title: 'Plagiarism Checker & Academic Search',
      description: 'Check text for plagiarism using CORE API, OpenAlex, Crossref, and academic databases.',
      path: '/tools/plagiarism',
      icon: Search,
      color: 'rose',
      badge: 'CORE API Proxy',
    },
    {
      id: 'word-counter',
      title: 'Free Word & Character Counter',
      description: 'Count words, characters, sentences, paragraphs, and estimated reading time live.',
      path: '/tools/word-counter',
      icon: FileText,
      color: 'blue',
      badge: 'Most Popular',
    },
    {
      id: 'paraphraser',
      title: 'AI Sentence Paraphraser',
      description: 'Rephrase sentences and essays with academic tone control & plagiarism confidence check.',
      path: '/tools/paraphraser',
      icon: RefreshCw,
      color: 'emerald',
      badge: 'AI Powered',
    },
    {
      id: 'readability-checker',
      title: 'Readability & Grade Level Checker',
      description: 'Calculate Flesch Reading Ease, Flesch-Kincaid Grade Level & SMOG readability scores.',
      path: '/tools/readability-checker',
      icon: BookOpen,
      color: 'indigo',
      badge: 'Academic Standard',
    },
    {
      id: 'citation-generator',
      title: 'APA & MLA Citation Generator',
      description: 'Generate instant citations in APA 7, MLA 9, Chicago, Harvard, and Vancouver formats.',
      path: '/tools/citation-generator',
      icon: Bookmark,
      color: 'teal',
      badge: 'Instant Copy',
    },
    {
      id: 'summarizer',
      title: 'AI Essay Summarizer',
      description: 'Condense long articles and essays into bullet points and key takeaways.',
      path: '/tools/summarizer',
      icon: Sparkles,
      color: 'purple',
      badge: 'Key Takeaways',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-10">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-8 sm:p-12 rounded-3xl shadow-2xl relative overflow-hidden space-y-6 text-center sm:text-left">
        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-extrabold px-3.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            100% Free Forever • No Sign Up Required
          </span>
          <span className="bg-white/10 text-slate-200 text-xs font-semibold px-3.5 py-1 rounded-full border border-white/10">
            Powered by GRADIFI Engine
          </span>
        </div>

        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Free Academic Writing & Analytics Suite
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Free high-precision tools for students, teachers, and researchers. Analyze word count, rephrase sentences, check readability grade levels, and generate citations instantly.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-4 justify-center sm:justify-start">
          <button
            onClick={() => navigate('/portal/principal')}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-6 py-3.5 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <School className="w-4 h-4" />
            <span>School Principal Portal</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-2xl text-xs border border-white/20 transition-all cursor-pointer"
          >
            Gradifi Landing Page
          </button>
        </div>
      </div>

      {/* Global Trust Counter */}
      <PublicTrustCounter toolName="word-counter" toolDisplayName="Academic Tools Suite" showDetailed={true} />

      {/* Tools Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <span>🛠️ Select a Free Writing Tool</span>
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.id}
                onClick={() => navigate(t.path)}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                      {t.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {t.title}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-indigo-600">
                  <span>Use Tool Free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
