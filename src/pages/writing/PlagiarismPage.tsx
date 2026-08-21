import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlagiarismChecker } from '../../components/plagiarism/PlagiarismChecker';
import { ArrowLeft } from 'lucide-react';

export const PlagiarismPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/tools')}
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tools Hub
        </button>

        <PlagiarismChecker />
      </div>
    </div>
  );
};

export default PlagiarismPage;
