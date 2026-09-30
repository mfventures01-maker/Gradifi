/**
 * GRADIFI VERIFY - 2-HOUR DEMO CRITICAL PATH WORKBENCH
 * Complete visually polished, evidence-backed end-to-end verification workflow page.
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { publicVerificationService, PublicVerificationResolution } from '../../services/verify/publicVerificationService';
import {
  FileUp,
  FileText,
  Search,
  BookOpen,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  QrCode,
  Download,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  Check,
  Building,
  Calendar,
  Hash,
  Eye,
  FileCheck
} from 'lucide-react';
import { verifyCoreService } from '../../services/verify/verifyCoreService';
import { verificationPersistenceService } from '../../services/verify/verificationPersistenceService';
import { EvidenceEngineResult, ProviderProvenance, EvidenceMatch, CanonicalAnalysisDocument } from '../../services/verify/types';
import { toPublicVerificationResult, PublicVerificationResult } from '../../services/verify/publicVerificationResult';
import { ingestDocument } from '../../services/verify/universalIngestionService';
import { resolveMatchedEvidenceSpans } from '../../services/verify/matchedTextHighlightingService';
import { CanonicalDocumentViewer } from '../../components/verify/CanonicalDocumentViewer';
import { CorrectionPanel } from '../../components/verify/CorrectionPanel';
import { SourceDetailPanel } from '../../components/verify/SourceDetailPanel';
import { getStatusStyle } from '../../services/verify/statusColorMapping';
import { extractDocumentText, ExtractedDocument, validateDocumentFile, formatFileSize } from '../../utils/pdfExtractor';
import { generateQRCodeSVG } from '../../utils/qrGenerator';
import { generateVerificationReportPDF } from '../../utils/pdfReportGenerator';
import { jsPDF } from 'jspdf';
import { buildCanonicalAnalysisDocument } from '../../services/verify/documentNormalizer';

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  core: 'CORE',
  crossref: 'Crossref',
  openalex: 'OpenAlex',
  unpaywall: 'Unpaywall',
  googlebooks: 'Google Books',
  semanticscholar: 'Semantic Scholar',
  gemini: 'Gemini',
  nemotron: 'Nemotron',
  gemma: 'Gemma'
};

const STATUS_DISPLAY_LABELS: Record<string, string> = {
  VERIFIED: 'Verified',
  EMPTY_RESULT: 'No matches',
  RATE_LIMITED: 'Rate limited',
  AUTHENTICATION_FAILED: 'Unavailable',
  REQUEST_FAILED: 'Unreachable',
  NETWORK_ERROR: 'Network error',
  TIMEOUT: 'Timed out',
  NOT_TESTED: 'Not tested',
  PROVIDER_UNAVAILABLE: 'Unavailable'
};

export type DemoStep = 'upload' | 'extraction' | 'normalization' | 'federation' | 'result';

export interface NormalizedDocMetadata {
  title: string;
  authors: string[];
  abstract: string;
  publication: string;
  year?: number;
  doi?: string;
  isbn?: string;
  url?: string;
  identifiers: string[];
}

export const GradifiVerifyDemoPage: React.FC = () => {
  const navigate = useNavigate();

  // Workflow state
  const [currentStep, setCurrentStep] = useState<DemoStep>('upload');
  const [uploadStatus, setUploadStatus] = useState<'READY' | 'PROCESSING' | 'EXTRACTED' | 'FAILED'>('READY');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Canonical document & Normalization state
  const [canonicalDoc, setCanonicalDoc] = useState<CanonicalAnalysisDocument | null>(null);
  const [normalizedDoc, setNormalizedDoc] = useState<NormalizedDocMetadata | null>(null);

  // Verification result state
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<EvidenceEngineResult | null>(null);
  const { verificationId: routeParamId } = useParams<{ verificationId?: string }>();
  const [verificationId, setVerificationId] = useState<string>('');
  const [qrSvgHtml, setQrSvgHtml] = useState<string>('');
  const [resolvingPublic, setResolvingPublic] = useState(false);
  const [publicResolution, setPublicResolution] = useState<PublicVerificationResolution | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(undefined);

  // Canonical Public Result Boundary (Presentation Firewall)
  const publicResult: PublicVerificationResult | null = result
    ? toPublicVerificationResult(result, verificationId)
    : null;

  // Resolved Matched Evidence Spans for Visual Evidence Viewer
  const evidenceSpans = result && documentText
    ? resolveMatchedEvidenceSpans(documentText, result.verifiedSources, result.similarityAnalysis?.findings)
    : [];

  useEffect(() => {
    if (routeParamId && routeParamId.trim().length > 0) {
      setResolvingPublic(true);
      publicVerificationService.resolveVerification(routeParamId)
        .then(res => {
          setPublicResolution(res);
          if (res.status === 'VALID' && res.record) {
            setVerificationId(res.record.verification_id);
          }
        })
        .catch((err: any) => {
          setPublicResolution({
            status: 'RESOLUTION_ERROR',
            verificationId: routeParamId.trim().toUpperCase(),
            errorMessage: err?.message || 'An unexpected error occurred during public verification resolution.'
          });
        })
        .finally(() => setResolvingPublic(false));
    } else {
      setPublicResolution(null);
    }
  }, [routeParamId]);

  useEffect(() => {
    if (verificationId) {
      generateQRCodeSVG(`${window.location.origin}/verify/${verificationId}`, 130)
        .then(setQrSvgHtml)
        .catch(() => setQrSvgHtml(''));
    }
  }, [verificationId]);

  // Sample document text for quick demo loading
  const SAMPLE_ACADEMIC_TEXT = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)
Journal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x, ISBN: 978-0-123456-78-9.

Abstract:
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy. We compare our approach against standard Crossref and OpenAlex benchmarks.

Introduction:
Distributed machine learning frameworks require mathematical determinism to guarantee non-repudiation of student submissions and academic evidence. Previous work by Vance et al. demonstrated that probabilistic AI inference cannot serve as sole authority without deterministic evidence grounding.`;

  // Pre-load sample text option (explicitly marked as demo fixture)
  const handleLoadSample = () => {
    setDocumentText(SAMPLE_ACADEMIC_TEXT);
    setUploadStatus('EXTRACTED');
    setUploadError(null);
    setExtractedDoc({
      filename: 'quantum_federated_learning_paper.pdf',
      fileSizeFormatted: '342 KB',
      fileSizeBytes: 350208,
      extractedText: SAMPLE_ACADEMIC_TEXT,
      pageCountEstimate: 3,
      extractionMethod: 'pdf_stream_extractor'
    });
    parseNormalizedMetadata(SAMPLE_ACADEMIC_TEXT, true);
  };

  // Parse normalized metadata from text using canonical document builder
  const parseNormalizedMetadata = (text: string, isFixture: boolean = false): NormalizedDocMetadata => {
    const canonical = buildCanonicalAnalysisDocument({
      rawText: text,
      filename: extractedDoc?.filename,
      fileSizeBytes: extractedDoc?.fileSizeBytes,
      extractionMethod: extractedDoc?.extractionMethod,
      isFixture
    });

    setCanonicalDoc(canonical);

    const norm: NormalizedDocMetadata = {
      title: canonical.title,
      authors: canonical.authors,
      abstract: canonical.abstract,
      publication: canonical.publication || 'Journal of Advanced Computer Science',
      year: canonical.year || 2024,
      doi: canonical.doi,
      isbn: canonical.isbn,
      url: canonical.doi ? `https://doi.org/${canonical.doi}` : undefined,
      identifiers: canonical.identifiers
    };

    setNormalizedDoc(norm);
    return norm;
  };

  // Handle universal document file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('PROCESSING');
    setUploadError(null);
    setUploadProgress(10);
    setProgressMsg('Detecting format and validating document structure...');

    try {
      const res = await ingestDocument(file);
      setUploadProgress(80);

      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to extract text from uploaded document.');
      }

      setExtractedDoc({
        filename: res.filename,
        fileSizeFormatted: formatFileSize(res.characterCount || file.size),
        fileSizeBytes: file.size,
        extractedText: res.text,
        pageCountEstimate: res.pageCount || 1,
        extractionMethod: res.extractionMethod as any
      });

      setDocumentText(res.text);
      setUploadProgress(100);
      setUploadStatus('EXTRACTED');
      parseNormalizedMetadata(res.text);
    } catch (err: any) {
      setUploadStatus('FAILED');
      setUploadError(err?.message || 'Failed to parse uploaded document file.');
    }
  };

  // Execute federated evidence run
  const handleExecuteVerification = async () => {
    if (!documentText.trim()) {
      setUploadError('Please select or enter document text to verify.');
      return;
    }

    setVerifying(true);
    setCurrentStep('federation');

    try {
      const res = await verifyCoreService.executeVerifyRun(documentText);
      let vid = `VRF-${res.documentHash.slice(0, 8).toUpperCase()}${(res.evidenceHash || '').slice(0, 4).toUpperCase()}`;
      try {
        const { record } = await verificationPersistenceService.persistVerificationRecord(res);
        if (record?.verification_id) {
          vid = record.verification_id;
        }
      } catch (persistErr: any) {
        console.warn('Persistence notice (using derived verification ID):', persistErr);
      }
      setVerificationId(vid);
      setResult(res);
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Verification execution error:', err);
      setUploadError(err?.message || 'Verification execution failed.');
    } finally {
      setVerifying(false);
    }
  };

  // Compute similarity category badge
  const getSimilarityCategory = (score: number) => {
    if (score >= 90) return { label: 'VERY HIGH', colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    if (score >= 75) return { label: 'HIGH', colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (score >= 50) return { label: 'MODERATE', colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    if (score >= 25) return { label: 'LOW', colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    return { label: 'VERY LOW', colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  };

  // Download PDF verification report
  const handleDownloadPDF = () => {
    if (!result || !normalizedDoc) return;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('GRADIFI VERIFICATION REPORT', 14, 20);

    doc.setFontSize(11);
    doc.text(`Verification ID: ${verificationId}`, 14, 30);
    doc.text(`Timestamp: ${result.timestamp || new Date().toISOString()}`, 14, 36);
    doc.text(`Hash: ${result.evidenceHash || result.documentHash}`, 14, 42);
    doc.text(`Overall Similarity: ${result.overallSimilarity}%`, 14, 48);

    doc.text('Academic Evidence Sources', 14, 60);
    let y = 68;
    const sources = result.verifiedSources || [];
    for (const source of sources.slice(0, 15)) {
      const line = `${source.title || 'Untitled'} — ${source.doi || source.isbn || 'no id'}`;
      doc.text(line, 14, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }

    const filename = verificationId.startsWith('VRF-')
      ? `${verificationId}.pdf`
      : `VRF-${verificationId}.pdf`;
    doc.save(filename);
  };

  // Derive Google Books matches for evidence panel and hub consistency
  const googleBooksMatches = (result?.verifiedSources || []).filter(
    m => m.provenance?.provider === 'googlebooks'
  );
  const googleBooksProvenance: ProviderProvenance | undefined = googleBooksMatches[0]?.provenance;

  // Derive Gemma status once for AI panel and matrix consistency
  const gemmaStatus: 'RUNTIME_AVAILABLE' | 'RUNTIME_UNAVAILABLE' =
    result?.localAiStatus === 'RUNTIME_AVAILABLE'
      ? 'RUNTIME_AVAILABLE'
      : 'RUNTIME_UNAVAILABLE';

  // AI Federation verification state
  const anyAiVerified = Boolean(
    result && (
      result.geminiStatus === 'INFERENCE_VERIFIED' ||
      result.nemotronStatus === 'INFERENCE_VERIFIED' ||
      (result as any).gemmaStatus === 'INFERENCE_VERIFIED'
    )
  );

  // HOEOS G7 PUBLIC VERIFICATION RENDER BRANCH
  if (routeParamId && routeParamId.trim().length > 0) {
    if (resolvingPublic) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-12 flex flex-col items-center justify-center">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Resolving Verification Record</h2>
            <p className="text-xs text-slate-400 font-mono">
              Target ID: <span className="text-blue-400 font-bold">{routeParamId.trim().toUpperCase()}</span>
            </p>
            <p className="text-xs text-slate-500">
              Querying authoritative public system of record and verifying cryptographic hash grounding...
            </p>
          </div>
        </div>
      );
    }

    if (publicResolution && publicResolution.status === 'VALID' && publicResolution.record) {
      const rec = publicResolution.record;
      const envelope = rec.evidence_envelope || {};
      const envResult = envelope.result || {};
      const sources: any[] = envResult.verifiedSources || envelope.verifiedSources || [];
      const findings: any[] = envResult.similarityAnalysis?.findings || envelope.findings || [];

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 selection:bg-blue-600 selection:text-white">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <button
                  onClick={() => navigate('/verify')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium mb-2 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Open Verification Workbench
                </button>
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl shadow-lg shadow-emerald-500/20">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </span>
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      PUBLIC VERIFICATION RECEIPT
                    </h1>
                    <p className="text-xs text-slate-400">
                      Authoritative Certificate Retrieved from Public System of Record
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black tracking-wide bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  INTEGRITY: VALID
                </span>
              </div>
            </div>

            {/* Authoritative Receipt Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800/80">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Verification ID</span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight break-all">
                      {rec.verification_id}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Document SHA-256 Hash</span>
                    <span className="text-xs font-mono font-bold text-slate-300 break-all bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 block">
                      {rec.document_hash}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Evidence Snapshot Hash</span>
                    <span className="text-xs font-mono font-bold text-slate-300 break-all bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 block">
                      {rec.evidence_hash}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Overall Similarity</span>
                      <span className="text-2xl font-black text-white tracking-tight">
                        {typeof rec.overall_similarity === 'number' ? rec.overall_similarity.toFixed(1) : rec.overall_similarity}%
                      </span>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sources Found</span>
                      <span className="text-2xl font-black text-white tracking-tight">
                        {rec.total_sources_found}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Engine Version:</span>
                      <span className="font-mono font-bold text-slate-300">{rec.engine_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Policy Version:</span>
                      <span className="font-mono font-bold text-slate-300">{rec.policy_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Persisted At:</span>
                      <span className="font-mono font-bold text-slate-300">
                        {rec.created_at ? new Date(rec.created_at).toUTCString() : (envelope.persistedAt || 'Recorded')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scannable Verification QR Presentation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                <div className="flex items-center gap-4">
                  {qrSvgHtml ? (
                    <div
                      className="shrink-0 p-2 bg-white rounded-xl shadow-lg"
                      dangerouslySetInnerHTML={{ __html: qrSvgHtml }}
                    />
                  ) : (
                    <div className="p-3 bg-slate-800 rounded-xl">
                      <QrCode className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Cryptographically Grounded Receipt
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Independent parties can verify this identity against the immutable system of record.
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 break-all">
                      {window.location.origin}/verify/{rec.verification_id}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" /> Print Certificate
                </button>
              </div>

              {/* Authoritative Verified Evidence Sources */}
              {sources.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" /> Authoritative Verified Evidence Sources ({sources.length})
                  </h3>
                  <div className="divide-y divide-slate-800/60 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/30">
                    {sources.map((src: any, idx: number) => (
                      <div key={idx} className="p-3.5 space-y-1.5 text-xs hover:bg-slate-800/20 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-200">
                            {src.title || src.provenance?.title || `Source #${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                            {src.sourceId || src.provider || 'ACADEMIC_SOURCE'}
                          </span>
                        </div>
                        {src.authors && Array.isArray(src.authors) && (
                          <div className="text-slate-400 text-[11px]">
                            {src.authors.join(', ')} {src.year ? `(${src.year})` : ''}
                          </div>
                        )}
                        {(src.matchedText || src.originalSnippet) && (
                          <div className="text-[11px] font-mono text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800/60 line-clamp-2">
                            "{src.matchedText || src.originalSnippet}"
                          </div>
                        )}
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline pt-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View Source Evidence
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Authoritative Findings */}
              {findings.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Search className="w-4 h-4 text-indigo-400" /> Evidence Engine Findings ({findings.length})
                  </h3>
                  <div className="space-y-2">
                    {findings.map((f: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{f.findingType || 'Academic Match Finding'}</span>
                          <span className="font-mono text-[10px] text-slate-400">Score: {f.confidence || f.similarity || '100%'}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{f.description || f.snippet || f.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      );
    }

    // Failure / Rejection Branch
    const failureStatus = publicResolution?.status || 'RESOLUTION_ERROR';
    const failureMsg = publicResolution?.errorMessage || 'The requested verification record could not be verified against authoritative storage.';

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-12 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
              <XCircle className="w-8 h-8 text-rose-400" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Public Verification Failed</h2>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold bg-rose-500/10 border-rose-500/30 text-rose-400">
                  STATUS: {failureStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 uppercase text-[10px] block font-bold">Target Verification ID</span>
              <span className="text-slate-200 font-bold break-all">{routeParamId.trim().toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] block font-bold">Failure Diagnostics</span>
              <span className="text-rose-300 font-sans text-xs block mt-0.5">{failureMsg}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            The verification ID could not be certified. This may be caused by an invalid ID format, a record that has not been committed to authoritative storage, or cryptographic hash mismatch.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setResolvingPublic(true);
                publicVerificationService.resolveVerification(routeParamId)
                  .then(setPublicResolution)
                  .catch((err: any) => {
                    setPublicResolution({
                      status: 'RESOLUTION_ERROR',
                      verificationId: routeParamId.trim().toUpperCase(),
                      errorMessage: err?.message || 'Resolution error occurred.'
                    });
                  })
                  .finally(() => setResolvingPublic(false));
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-blue-600/20"
            >
              <RefreshCw className="w-4 h-4" /> Retry Resolution
            </button>
            <button
              onClick={() => navigate('/verify')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Verification Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 selection:bg-blue-600 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <button
              onClick={() => navigate('/tools')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium mb-3 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Gradifi Tools Hub
            </button>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-500/20">
                <ShieldCheck className="w-8 h-8 text-white" />
              </span>
              GRADIFI VERIFY
              <span className="text-xs font-bold px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full uppercase tracking-wider">
                HOEOS 2-Hour Demo Critical Path
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Federated Academic Evidence Core &bull; Deterministic Similarity Engine &bull; Multi-Model AI Federation &bull; Authentic Scannable QR Receipts
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileCheck className="w-4 h-4 text-blue-400" /> Pre-load Demo Document
            </button>
          </div>
        </div>

        {/* Demo Stepper Progress Indicator */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { id: '01 UPLOAD', step: 'upload', icon: FileUp },
              { id: '02 EXTRACT', step: 'upload', icon: FileText },
              { id: '03 NORMALIZE', step: 'normalization', icon: Layers },
              { id: '04 VERIFY', step: 'federation', icon: Search },
              { id: '05 FEDERATE', step: 'federation', icon: Cpu },
              { id: '06 RESULT', step: 'result', icon: ShieldCheck },
              { id: '07 RECEIPT', step: 'result', icon: QrCode }
            ].map((s, idx) => {
              const Icon = s.icon;
              const active = currentStep === s.step || (currentStep === 'result' && idx <= 6);
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    active
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 shadow-xs'
                      : 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="truncate">{s.id}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Upload Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Section 1: PDF Upload */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-blue-400" /> 1. PDF Document Upload
                </h2>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                  uploadStatus === 'EXTRACTED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  uploadStatus === 'PROCESSING' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  uploadStatus === 'FAILED' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                  'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  STATUS: {uploadStatus}
                </span>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-6 text-center transition-all bg-slate-950/50 relative group">
                <input
                  type="file"
                  accept=".pdf,.txt,.docx,.rtf,.odt,.epub,.html,.htm,.md,.pptx,.xlsx,.csv,.json,.xml"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl group-hover:scale-105 transition-transform">
                    <FileUp className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    Drop your document file here (<span className="text-blue-400 font-bold">.pdf, .txt, .docx, .epub, .md, .rtf</span>, etc.)
                  </div>
                  <div className="text-xs text-slate-500">
                    Universal ingestion & deterministic extraction up to 15MB
                  </div>
                </div>
              </div>

              {/* Upload Progress Bar */}
              {uploadStatus === 'PROCESSING' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>{progressMsg}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* File Info Badge */}
              {extractedDoc && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-200 truncate max-w-[200px]">{extractedDoc.filename}</div>
                      <div className="text-slate-500">{extractedDoc.fileSizeFormatted} &bull; Method: {extractedDoc.extractionMethod}</div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2 font-medium">
                  <XCircle className="w-4 h-4 shrink-0" /> {uploadError}
                </div>
              )}

              {/* Document Text Input Box */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Document Text Payload
                </label>
                <textarea
                  value={documentText}
                  onChange={(e) => {
                    setDocumentText(e.target.value);
                    if (e.target.value.trim()) {
                      setUploadStatus('EXTRACTED');
                      parseNormalizedMetadata(e.target.value);
                    }
                  }}
                  placeholder="Paste academic paper, abstract, or text payload here..."
                  rows={8}
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500/80 resize-y"
                />
              </div>

              {/* Verify Action Button */}
              <button
                type="button"
                onClick={handleExecuteVerification}
                disabled={verifying || !documentText.trim()}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  verifying || !documentText.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 active:scale-[0.99]'
                }`}
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Querying Academic Federation...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> Run Academic Evidence Verification
                  </>
                )}
              </button>
            </div>

            {/* Section 2: Document Normalization Display */}
            {normalizedDoc && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> 2. Canonical Analysis Document
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {canonicalDoc?.source.isFixture ? (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        PROVENANCE: FIXTURE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        PROVENANCE: {canonicalDoc?.source.origin || 'EXTRACTED'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[10px] block">Title</span>
                    <span className="font-semibold text-slate-200">{normalizedDoc.title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 uppercase font-bold text-[10px] block">Authors</span>
                      <span className="font-medium text-slate-300">{normalizedDoc.authors.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-bold text-[10px] block">Publication / Year</span>
                      <span className="font-medium text-slate-300">{normalizedDoc.publication} ({normalizedDoc.year})</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[10px] block">Identifiers</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {normalizedDoc.identifiers.map((id, i) => (
                        <span key={i} className="bg-blue-950/80 border border-blue-800/60 text-blue-300 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Verification & Evidence Results (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {!result ? (
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[480px]">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl mb-4">
                  <ShieldCheck className="w-12 h-12 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-300">Ready for Evidence Verification</h3>
                <p className="text-slate-500 text-sm max-w-md mt-2">
                  Upload a PDF paper or click <span className="text-blue-400 font-semibold cursor-pointer" onClick={handleLoadSample}>"Pre-load Demo Document"</span> to trigger the federated verification pipeline across Google Books, OpenAlex, Crossref, Unpaywall, CORE, and AI Federation.
                </p>
              </div>
            ) : (
              <>
                {/* 3. Google Books Evidence Results Card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-400" />
                      <h2 className="text-base font-bold text-white">3. Google Books Evidence</h2>
                    </div>
                    {googleBooksMatches.length > 0 ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        VERIFIED ({googleBooksMatches.length})
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        EMPTY RESULT
                      </span>
                    )}
                  </div>

                  {googleBooksMatches.length > 0 ? (
                    <div className="space-y-4 text-xs">
                      {googleBooksMatches.map((match, idx) => {
                        const prov = match.provenance;
                        return (
                          <div key={match.sourceId || idx} className="space-y-3 pb-3 border-b border-slate-800/60 last:border-0 last:pb-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                              <div>
                                <span className="text-slate-500 font-bold uppercase text-[10px] block">Title</span>
                                <span className="font-bold text-white">{prov.title}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold uppercase text-[10px] block">Author(s)</span>
                                <span className="text-slate-200">{prov.authors?.join(', ') || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold uppercase text-[10px] block">Publisher / Published Date</span>
                                <span className="text-slate-300">{prov.publisher || 'Google Books Archive'} ({prov.publishedYear || 'N/A'})</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold uppercase text-[10px] block">ISBN / Volume ID</span>
                                <span className="font-mono text-blue-400">{prov.isbn || prov.providerRecordId}</span>
                              </div>
                            </div>

                            {/* Truthful AccessInfo Display */}
                            {prov.accessInfo && (
                              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 space-y-2">
                                <span className="text-slate-400 font-bold uppercase text-[10px] block">Truthful Access & PDF Availability (accessInfo)</span>
                                <div className="flex flex-wrap gap-2 text-[11px]">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                    Viewability: {prov.accessInfo.viewability || 'UNKNOWN'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md border ${
                                    prov.accessInfo.pdfAvailable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    PDF Available: {prov.accessInfo.pdfAvailable ? 'YES' : 'NO'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md border ${
                                    prov.accessInfo.epubAvailable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    EPUB Available: {prov.accessInfo.epubAvailable ? 'YES' : 'NO'}
                                  </span>
                                </div>

                                {/* Only show download link if accessInfo explicitly permits */}
                                {prov.accessInfo.pdfAvailable && prov.accessInfo.pdfDownloadUrl && (
                                  <div className="mt-2 pt-2 border-t border-slate-800">
                                    <a
                                      href={prov.accessInfo.pdfDownloadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Download Google Books PDF Edition
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="text-slate-500">Google Books Record ID: <code className="text-slate-300">{prov.providerRecordId}</code></span>
                              <a
                                href={prov.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                              >
                                Google Books Source <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Google Books returned status: <strong>EMPTY RESULT</strong> (No volume matches found).
                    </div>
                  )}
                </div>

                {/* G3 Plagiarism Evidence & Policy Card */}
                {result.plagiarismEvidence && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                        <h3 className="text-base font-bold text-white">Plagiarism Evidence & Policy</h3>
                      </div>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
                        Policy: {result.plagiarismEvidence.policyVersion}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                        <div className="text-slate-500 uppercase font-bold text-[10px]">Risk Level</div>
                        <div className={`font-black text-sm mt-0.5 ${
                          result.plagiarismEvidence.riskLevel === 'CRITICAL' || result.plagiarismEvidence.riskLevel === 'HIGH' ? 'text-rose-400' :
                          result.plagiarismEvidence.riskLevel === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {result.plagiarismEvidence.riskLevel}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                        <div className="text-slate-500 uppercase font-bold text-[10px]">Exact Phrases</div>
                        <div className="font-extrabold text-sm text-slate-200 mt-0.5">{result.plagiarismEvidence.exactPhraseCount}</div>
                      </div>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                        <div className="text-slate-500 uppercase font-bold text-[10px]">N-Gram Findings</div>
                        <div className="font-extrabold text-sm text-slate-200 mt-0.5">{result.plagiarismEvidence.ngramFindingCount}</div>
                      </div>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                        <div className="text-slate-500 uppercase font-bold text-[10px]">Human Review</div>
                        <div className={`font-bold text-xs mt-1 ${result.plagiarismEvidence.requiresHumanReview ? 'text-amber-400' : 'text-slate-400'}`}>
                          {result.plagiarismEvidence.requiresHumanReview ? 'REQUIRED' : 'NONE'}
                        </div>
                      </div>
                    </div>

                    {/* Human Review Boundary Notice */}
                    <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Human Academic Review Boundary:</strong> This result identifies similarity evidence. It does not constitute a final academic misconduct determination. Human academic review is required.
                      </div>
                    </div>
                  </div>
                )}

                {/* Canonical Document Evidence Payload */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-400" />
                      <h3 className="text-base font-bold text-white">Canonical Document Evidence Payload</h3>
                    </div>
                  </div>

                  <CanonicalDocumentViewer
                    documentText={result.canonicalDocument?.rawText ?? documentText}
                    findings={result.similarityAnalysis?.findings ?? []}
                    matches={result.verifiedSources}
                    onFindingClick={(id) => {
                      document.getElementById(`finding-${id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  />
                </div>

                {/* Correction Guidance Panel */}
                <CorrectionPanel
                  findings={result.similarityAnalysis?.findings ?? []}
                  matches={result.verifiedSources}
                  onActionClick={(id, action) => {
                    // optional: wire to existing scroll behaviour
                  }}
                />

                {/* Source Attribution & Citation Hub (P5) */}
                {publicResult && (
                  <SourceDetailPanel
                    publicResult={publicResult}
                    spans={evidenceSpans}
                    selectedSourceId={selectedSourceId}
                    onSelectSource={setSelectedSourceId}
                  />
                )}

                {/* 4 & 5: Similarity Engine & Academic AI Federation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Similarity Analysis Box */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Hash className="w-4 h-4 text-emerald-400" /> 5. Similarity & Plagiarism Evidence
                      </h3>
                      {(() => {
                        const score = result.aggregation?.totalDocumentOverlap ?? result.overallSimilarity;
                        const cat = getSimilarityCategory(score);
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.colorClass}`}>
                            {cat.label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Dual Authority Metrics: Unique Matched Coverage vs Highest Source Match */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center py-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div className="text-2xl font-black text-white">
                          {(result.aggregation?.totalDocumentOverlap ?? result.overallSimilarity).toFixed(1)}%
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                          Unique Matched Coverage
                        </div>
                      </div>
                      <div className="text-center py-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div className="text-2xl font-black text-emerald-400">
                          {(result.aggregation?.highestSourceMatch ?? result.overallSimilarity).toFixed(1)}%
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                          Highest Source Match
                        </div>
                      </div>
                    </div>

                    {/* Multi-Tier Quantitative Counts */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-1.5">
                        <div className="font-bold text-slate-200">
                          {result.aggregation?.totalSourceMatches ?? result.verifiedSources.length}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase">Sources</div>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-1.5">
                        <div className="font-bold text-amber-400">
                          {result.aggregation?.totalParagraphMatches ?? 0}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase">Paragraphs</div>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-1.5">
                        <div className="font-bold text-sky-400">
                          {result.aggregation?.totalSentenceMatches ?? 0}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase">Sentences</div>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-1.5">
                        <div className="font-bold text-purple-400">
                          {result.aggregation?.totalPhraseMatches ?? 0}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase">Phrases</div>
                      </div>
                    </div>

                    {/* Expandable Hierarchical Evidence Tree */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-semibold">Evidence Breakdown (Source → Unit):</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {result.aggregation?.sourceReports?.length ?? 0} Matched Sources
                        </span>
                      </div>

                      {result.aggregation?.sourceReports && result.aggregation.sourceReports.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {result.aggregation.sourceReports.map((src, sIdx) => (
                            <details key={src.sourceId || sIdx} className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 group text-[11px]">
                              <summary className="cursor-pointer font-bold text-slate-200 flex items-center justify-between hover:text-emerald-400">
                                <span className="truncate max-w-[200px]">
                                  {src.title}
                                </span>
                                <span className="font-mono text-[10px] text-emerald-400">
                                  {src.documentCoverage.toFixed(1)}% Cov | {src.highestSentenceMatch.toFixed(1)}% Max
                                </span>
                              </summary>
                              
                              <div className="mt-2 pt-2 border-t border-slate-800 space-y-2 pl-2">
                                <div className="text-[10px] text-slate-400 flex justify-between">
                                  <span>ID: {src.sourceId}</span>
                                  <span>P: {src.paragraphMatches} | S: {src.sentenceMatches} | Phr: {src.phraseMatches}</span>
                                </div>

                                {src.sentenceEvidence.slice(0, 3).map((sent, sentIdx) => (
                                  <div key={sent.documentUnitId || sentIdx} className="bg-slate-900/80 border border-slate-800/60 rounded p-1.5 space-y-1">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="font-mono text-sky-400 font-bold">{sent.documentUnitId}</span>
                                      <span className="font-bold text-slate-300">{sent.similarityPercentage.toFixed(1)}% ({sent.matchType})</span>
                                    </div>
                                    <div className="text-slate-300 text-[10px] italic">
                                      "{sent.studentText}"
                                    </div>
                                    <div className="text-slate-400 text-[9px]">
                                      Source: "{sent.sourceText.slice(0, 90)}..."
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic py-2">
                          No text overlap findings detected across external academic sources.
                        </div>
                      )}

                      <div className="flex justify-between items-center py-1 border-t border-slate-800/60 pt-2 text-[10px]">
                        <span className="text-slate-400">Provenance Authority:</span>
                        <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          DETERMINISTIC SIM-V1
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Academic AI Federation Box */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-400" /> 4. AI Federation
                      </h3>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md">
                        NON-AUTHORITATIVE
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-1">
                        <div className="font-bold text-purple-300 text-[11px] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" /> AI Findings Interpretation
                        </div>
                        {anyAiVerified ? (
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {result.findings?.[0]?.explanation || 'AI evidence analysis verified.'}
                          </p>
                        ) : (
                          <p className="text-slate-500 text-[11px] leading-relaxed">
                            AI Federation unavailable. No AI-derived signals were produced. Deterministic similarity findings above remain authoritative.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Gemini 2.5 Flash:</span>
                          <span className={`font-bold ${result.geminiStatus === 'INFERENCE_VERIFIED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.geminiStatus}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Nvidia Nemotron:</span>
                          <span className={`font-bold ${result.nemotronStatus === 'INFERENCE_VERIFIED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.nemotronStatus}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Local Gemma Engine:</span>
                          <span className={`font-bold ${gemmaStatus === 'RUNTIME_AVAILABLE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {gemmaStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6 & 7: Canonical Verification Status Matrix & Colors */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-400" /> 7. Gradifi Verification Matrix
                    </h2>
                    <span className="text-xs font-bold text-slate-400">
                      {publicResult ? `${publicResult.totalVerifiedSources} Verified Academic Sources` : `${result.verifiedSources.length} Verified Academic Sources`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                          <th className="py-2.5 px-3">Provider / Source</th>
                          <th className="py-2.5 px-3">Credential</th>
                          <th className="py-2.5 px-3">Request</th>
                          <th className="py-2.5 px-3">Response</th>
                          <th className="py-2.5 px-3">Canonical Color Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {result.matrix.map(entry => {
                          const overallStatus = entry.provider === 'gemma' ? gemmaStatus : entry.overallStatus;
                          const style = (() => {
                            if (overallStatus === 'RATE_LIMITED') {
                              return {
                                badgeBgClass: 'bg-amber-500/10 border-amber-500/30',
                                badgeTextClass: 'text-amber-400',
                                dotBgClass: 'bg-amber-400',
                                label: 'Rate Limited'
                              };
                            }
                            if (overallStatus === 'EMPTY_RESULT') {
                              return {
                                badgeBgClass: 'bg-slate-500/10 border-slate-500/30',
                                badgeTextClass: 'text-slate-400',
                                dotBgClass: 'bg-slate-400',
                                label: 'Empty Result'
                              };
                            }
                            return getStatusStyle(overallStatus);
                          })();
                          const displayLabel = STATUS_DISPLAY_LABELS[overallStatus] ?? style.label;
                          return (
                            <tr key={entry.provider} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-200">{PROVIDER_DISPLAY_NAMES[entry.provider] ?? entry.provider}</td>
                              <td className="py-2.5 px-3 text-slate-400">{entry.credentialStatus}</td>
                              <td className="py-2.5 px-3 text-slate-400">{entry.realRequestStatus}</td>
                              <td className="py-2.5 px-3 text-slate-400">{entry.responseStatus}</td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${style.badgeBgClass} ${style.badgeTextClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${style.dotBgClass}`} />
                                  {displayLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 8 & 9: Scannable QR Verification Receipt & Download PDF Report */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Left: QR Code & Receipt Info */}
                  <div className="flex items-center gap-5">
                    <div
                      className="shrink-0 p-2 bg-white rounded-xl shadow-lg"
                      dangerouslySetInnerHTML={{
                        __html: qrSvgHtml
                      }}
                    />
                    <div className="space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">8. Scannable QR Receipt</div>
                      <div className="font-extrabold text-base text-white font-mono">{verificationId}</div>
                      <div className="text-slate-400 text-[11px]">Timestamp: {new Date(result.timestamp).toUTCString()}</div>
                      <div className="text-slate-500 font-mono text-[10px] truncate max-w-[260px]">
                        Hash: {result.documentHash.slice(0, 16)}...
                      </div>
                    </div>
                  </div>

                  {/* Right: PDF Download Action */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                      onClick={handleDownloadPDF}
                      className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" /> Download PDF Verification Report
                    </button>
                  </div>

                </div>

              </>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default GradifiVerifyDemoPage;