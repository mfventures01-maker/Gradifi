import React, { useState } from 'react';
import { plagiarismService, PlagiarismResult, SourceMatch } from '../../services/plagiarismService';

export const PlagiarismChecker: React.FC = () => {
  const [text, setText] = useState('');
  const [results, setResults] = useState<PlagiarismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckPlagiarism = async () => {
    if (!text.trim()) {
      setError('Please enter text to check');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const result = await plagiarismService.checkPlagiarism(text);
      setResults(result);
    } catch (err) {
      setError('Failed to check plagiarism. Please try again.');
      console.error('Plagiarism check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (score: number): string => {
    if (score > 70) return 'text-red-600';
    if (score > 40) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getSimilarityLabel = (score: number): string => {
    if (score > 70) return 'High Similarity - Review Required';
    if (score > 40) return 'Moderate Similarity - Check Sources';
    return 'Low Similarity - Good to Go';
  };

  return (
    <div className="plagiarism-checker max-w-6xl mx-auto p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center">
            <span className="mr-2.5 text-2xl">🔍</span> Plagiarism Checker & Academic Search
          </h2>
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-bold">
            SEFAES Engine Verified
          </span>
        </div>
        
        <p className="text-slate-600 mb-6 text-sm">
          Enter student essay or research work to check for plagiarism using CORE API, OpenAlex, Crossref, and academic databases.
        </p>

        {/* Input Area */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Document Content
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here to check for plagiarism..."
            className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 text-sm font-medium"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCheckPlagiarism}
            disabled={loading || !text.trim()}
            className={`px-6 py-3 rounded-xl font-bold text-white shadow-xs ${
              loading || !text.trim()
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            } transition-all duration-150`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking Academic Databases...
              </span>
            ) : (
              '🔍 Check Plagiarism'
            )}
          </button>

          <button
            onClick={() => { setText(''); setResults(null); setError(null); }}
            className="px-4 py-3 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-6 border-t border-slate-200 pt-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📊</span> Plagiarism & Similarity Report
            </h3>

            {/* Overall Score */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Similarity</span>
                <div className={`text-4xl font-black ${getSimilarityColor(results.overallSimilarity)}`}>
                  {results.overallSimilarity}%
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${getSimilarityColor(results.overallSimilarity)}`}>
                  {getSimilarityLabel(results.overallSimilarity)}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  {results.totalSources || results.matches?.length || 0} academic sources matched
                </div>
              </div>
            </div>

            {/* AI Verdict */}
            {results.aiAnalysis && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-sm space-y-1">
                <div className="flex items-center justify-between font-bold text-blue-900">
                  <span>🤖 AI Analysis Verdict: {results.aiAnalysis.verdict.toUpperCase()}</span>
                  <span>Confidence: {Math.round(results.aiAnalysis.confidence)}%</span>
                </div>
                <p className="text-slate-700 text-xs">{results.aiAnalysis.reasoning}</p>
              </div>
            )}

            {/* Matches List */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>📚</span> Matching Academic Sources ({results.matches?.length || 0})
              </h4>
              {results.matches && results.matches.length > 0 ? (
                <div className="space-y-4">
                  {results.matches.map((match: SourceMatch, index: number) => (
                    <div key={match.sourceId || index} className="p-5 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <h5 className="font-bold text-blue-600 hover:underline text-base leading-snug">
                            <a href={match.url} target="_blank" rel="noopener noreferrer">
                              {match.title || 'Untitled Academic Work'}
                            </a>
                          </h5>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
                            {match.authors && match.authors.length > 0 && (
                              <span>✍️ {match.authors.slice(0, 3).join(', ')}</span>
                            )}
                            <span className="uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 border text-[10px] text-slate-700">
                              🏛️ {match.sourceType || 'Academic Database'}
                            </span>
                          </div>
                          {match.originalText && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2 mt-2 font-mono">
                              "{match.matchedText || match.originalText}"
                            </p>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className={`text-2xl font-black ${getSimilarityColor(match.matchPercentage || match.relevanceScore || 0)}`}>
                            {Math.round(match.matchPercentage || match.relevanceScore || 0)}%
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Match Score</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  ✅ No matches found. Your text appears to be original!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlagiarismChecker;
