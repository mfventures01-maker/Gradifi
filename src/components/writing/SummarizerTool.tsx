import React, { useState } from 'react';
import { Sparkles, Copy, Check, FileText, List, RefreshCw } from 'lucide-react';
import { summarizerService } from '../../services/summarizerService';
import { publicCounterService } from '../../services/publicCounterService';
import { SummarizerOptions, SummarizerResult } from '../../types/phase5.types';

export const SummarizerTool: React.FC = () => {
  const [text, setText] = useState('');
  const [length, setLength] = useState<SummarizerOptions['length']>('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummarizerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await summarizerService.summarize(text, { length, style: 'extractive', focusPoints: 3 });
      setResult(res);
      publicCounterService.incrementCounter('summarizer');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>AI Essay & Article Summarizer</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">Extract key points and concise summaries instantly</p>
        </div>
        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
          Free Writing Suite
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Summary Length:</label>
          <select
            value={length}
            onChange={(e) => setLength(e.target.value as SummarizerOptions['length'])}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="short">Short Bullet Summary (15%)</option>
            <option value="medium">Balanced Overview (30%)</option>
            <option value="long">Comprehensive Analysis (50%)</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Source Text</label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste long essay, article, or lecture notes here..."
              className="w-full p-4 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">AI Summary Output</label>
              {result && (
                <button
                  onClick={handleCopy}
                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="w-full h-44 md:h-[210px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-sans overflow-y-auto leading-relaxed space-y-3">
              {loading ? (
                <div className="h-full flex items-center justify-center gap-2 text-purple-600 font-semibold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating AI Summary...</span>
                </div>
              ) : result ? (
                <div className="space-y-3">
                  <p className="font-medium">{result.summary}</p>
                  {result.keyPoints.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <span className="font-bold text-purple-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <List className="w-3 h-3 text-purple-600" /> Key Takeaways
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {result.keyPoints.map((kp, idx) => (
                          <li key={idx}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-slate-400">AI summary will appear here.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {result && (
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Compression: {result.compression}% Saved
            </span>
          )}
          <button
            onClick={handleSummarize}
            disabled={loading || !text.trim()}
            className="ml-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Summarize Essay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
