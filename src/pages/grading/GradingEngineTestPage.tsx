import React, { useState } from 'react';
import { gradingEngineService, FullGradingResult } from '../../services/gradingEngineService';
import { Upload, CheckCircle2, AlertCircle, FileText, Brain, Award, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GradingEngineTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<FullGradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await gradingEngineService.gradeSubmission(
        file,
        'test-assignment-001',
        'Grammar: 30%, Content: 30%, Structure: 20%, Vocabulary: 10%, Coherence: 10%',
        'english'
      );
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to process grading engine pipeline.');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Mock synthetic essay image string trigger
      const res = await gradingEngineService.gradeSubmission(
        'sample-essay-image-data',
        'test-assignment-001',
        'Grammar: 30%, Content: 30%, Structure: 20%, Vocabulary: 10%, Coherence: 10%',
        'english'
      );
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to process sample run.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back Home
        </button>
        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full font-bold">
          HOEOS AI Pipeline
        </span>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            <span>AI Grading Engine Test Suite</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            End-to-End Pipeline: 📸 OCR (Tesseract.js) → 🧠 Gemma Local AI → 🏛️ Nemotron Reward Model
          </p>
        </div>

        {/* Upload Box */}
        <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 p-8 rounded-2xl text-center space-y-4 transition-colors">
          <Upload className="w-10 h-10 text-indigo-600 mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-800">Upload Student Answer Script Image</p>
            <p className="text-xs text-slate-500">Supports handwritten or typed essay images</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors">
              <span>Select File</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
            </label>

            <button
              onClick={handleSampleRun}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Run Instant Test Pipeline
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-6 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs font-bold text-indigo-900">
              Processing Multi-Engine Pipeline (OCR → Gemma → Nemotron)...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Grading Pipeline Complete</span>
              </h2>
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {result.processingTime}ms
              </span>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-indigo-600 text-white p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-200">Final Composite</span>
                <div className="text-3xl font-black">{result.finalScore}/100</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OCR Confidence</span>
                <div className="text-2xl font-bold text-slate-900">{Math.round(result.ocrConfidence)}%</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gemma Score</span>
                <div className="text-2xl font-bold text-slate-900">{result.gemmaResult?.score || 0}/100</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nemotron Score</span>
                <div className="text-2xl font-bold text-slate-900">{result.nemotronResult?.overallScore || 0}/100</div>
              </div>
            </div>

            {/* Extracted Text */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-700" />
                <span>Extracted Text (OCR)</span>
              </h3>
              <p className="text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 leading-relaxed">
                {result.extractedText}
              </p>
            </div>

            {/* Combined Feedback */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-slate-700" />
                <span>Combined Pedagogical Feedback</span>
              </h3>
              <pre className="text-xs font-sans bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-800 whitespace-pre-wrap leading-relaxed">
                {result.feedback}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradingEngineTestPage;
