import React, { useState } from 'react';
import { RefreshCw, Copy, Check, Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { paraphraserService } from '../../services/paraphraserService';
import { publicCounterService } from '../../services/publicCounterService';
import { ParaphraseOptions, ParaphraseResult } from '../../types/phase5.types';

interface ParaphraseToolProps {
  onParaphrase?: (result: ParaphraseResult) => void;
  className?: string;
}

export const ParaphraseTool: React.FC<ParaphraseToolProps> = ({ onParaphrase, className = '' }) => {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<ParaphraseOptions['style']>('standard');
  const [length, setLength] = useState<ParaphraseOptions['length']>('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParaphraseResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const handleParaphrase = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    try {
      const options: ParaphraseOptions = { style, length, preserveKeywords: true };
      const response = await paraphraserService.paraphrase(text, options);
      setResult(response);
      publicCounterService.incrementCounter('paraphraser');
      if (onParaphrase) onParaphrase(response);
    } catch (error) {
      console.error('Paraphrase error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.paraphrased);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-6 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">AI Text Paraphraser</h3>
          <p className="text-xs text-slate-500 font-medium">Rewrite sentences with academic tone controls</p>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-bold">
          <Sparkles className="w-3 h-3" />
          100% Free
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <select 
            value={style} 
            onChange={(e) => setStyle(e.target.value as ParaphraseOptions['style'])}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="standard">Standard Tone</option>
            <option value="academic">Academic Tone</option>
            <option value="creative">Creative Tone</option>
            <option value="simple">Simplified Tone</option>
          </select>
          <select 
            value={length} 
            onChange={(e) => setLength(e.target.value as ParaphraseOptions['length'])}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="short">Concise Length</option>
            <option value="medium">Balanced Length</option>
            <option value="long">Expanded Length</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Original Text</label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type text to rephrase..."
              className="w-full p-4 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">Paraphrased Output</label>
              {result && (
                <button
                  onClick={handleCopy}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="w-full h-36 md:h-[162px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-sans overflow-y-auto leading-relaxed">
              {loading ? (
                <div className="h-full flex items-center justify-center gap-2 text-indigo-600 font-semibold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI is paraphrasing...</span>
                </div>
              ) : result ? (
                result.paraphrased
              ) : (
                <span className="text-slate-400">Paraphrased text will appear here.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {result && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Confidence: {Math.round(result.confidence)}%
            </span>
          )}
          <button
            onClick={handleParaphrase}
            disabled={loading || !text.trim()}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Rephrase Text</span>
          </button>
        </div>
      </div>
    </div>
  );
};
