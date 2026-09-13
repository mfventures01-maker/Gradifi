/**
 * GRADIFI VERIFY - SOURCE DETAIL PANEL COMPONENT
 * HOEOS P5 Standard: Source Attribution, Validated DOI/ISBN Presentation, Multi-Format Citations.
 *
 * Semantic Rule: Displays authoritative public source metadata linked strictly via sourceId.
 * NEVER labels sources "PLAGIARIZED" or fabricates missing metadata.
 */

import React, { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Layers,
  Info,
  Hash,
  Sparkles
} from 'lucide-react';
import { PublicVerificationResult } from '../../services/verify/publicVerificationResult';
import { MatchedEvidenceSpan } from '../../services/verify/matchedTextHighlightingService';
import {
  buildSourcePresentationModel,
  FormattedSourcePresentation,
  getSpansForSource
} from '../../services/verify/sourceCitationPresentationService';

export interface SourceDetailPanelProps {
  publicResult: PublicVerificationResult;
  spans?: MatchedEvidenceSpan[];
  selectedSourceId?: string;
  onSelectSource?: (sourceId: string) => void;
}

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard';

export const SourceDetailPanel: React.FC<SourceDetailPanelProps> = ({
  publicResult,
  spans = [],
  selectedSourceId,
  onSelectSource
}) => {
  const [activeStyleMap, setActiveStyleMap] = useState<Record<string, CitationStyle>>({});
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const sources: FormattedSourcePresentation[] = buildSourcePresentationModel(publicResult);

  if (!sources || sources.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3 font-sans">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">Source Attribution & Citation Hub (P5)</h3>
        </div>
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
          No external academic or book sources matched for this verification run.
        </div>
      </div>
    );
  }

  const handleCopyCitation = (sourceId: string, citationText: string) => {
    navigator.clipboard.writeText(citationText);
    setCopiedMap(prev => ({ ...prev, [sourceId]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [sourceId]: false }));
    }, 2000);
  };

  const handleStyleChange = (sourceId: string, style: CitationStyle) => {
    setActiveStyleMap(prev => ({ ...prev, [sourceId]: style }));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 font-sans">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Source Attribution & Citation Hub (P5)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Authoritative Bibliographic Sources &bull; Validated DOI / ISBN Linking &bull; Academic Citations
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-400 shrink-0 self-start sm:self-auto flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          {sources.length} Verified Sources
        </span>
      </div>

      {/* Boundary Disclaimer */}
      <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong>Source Attribution Boundary:</strong> Source attribution provides verified academic and bibliographic record details linked via <code>sourceId</code>. It does not label sources as plagiarism.
        </div>
      </div>

      {/* Sources List */}
      <div className="space-y-5">
        {sources.map(src => {
          const isSelected = selectedSourceId === src.sourceId;
          const matchingSpans = getSpansForSource(spans, src.sourceId);
          const currentStyle = activeStyleMap[src.sourceId] || 'apa';
          const citationText = src.citation[currentStyle] || src.citation.apa;
          const isCopied = copiedMap[src.sourceId] || false;

          return (
            <div
              key={src.sourceId}
              onClick={() => onSelectSource && onSelectSource(src.sourceId)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-950/30 border-blue-500/80 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Source Type & Match % */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                    src.sourceType === 'book'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  }`}>
                    {src.sourceTypeLabel}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {src.sourceId}
                  </span>
                </div>
                <span className="text-xs font-black text-slate-200 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                  {src.matchedPercentage}% Similarity Match
                </span>
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-white hover:text-blue-300 transition-colors leading-snug">
                {src.title}
              </h4>

              {/* Author & Publication Details */}
              <div className="mt-1.5 text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div>
                  <span className="text-slate-500 font-semibold">Authors: </span>
                  <span className={src.hasAuthors ? 'text-slate-300 font-medium' : 'text-slate-500 italic'}>
                    {src.authorDisplay}
                  </span>
                </div>
                {src.year && (
                  <div>
                    <span className="text-slate-500 font-semibold">Year: </span>
                    <span className="text-slate-300 font-medium">{src.year}</span>
                  </div>
                )}
                {src.publisher && (
                  <div>
                    <span className="text-slate-500 font-semibold">Publisher: </span>
                    <span className="text-slate-300 font-medium">{src.publisher}</span>
                  </div>
                )}
              </div>

              {/* Badges Row: DOI / ISBN */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {/* DOI Presentation */}
                {src.hasDoi && src.doiUrl ? (
                  <a
                    href={src.doiUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold hover:bg-emerald-500/20 transition-colors"
                  >
                    <span>DOI: {src.doi}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 font-mono text-[10px]">
                    {src.doiDisplay}
                  </span>
                )}

                {/* ISBN Presentation */}
                {src.hasIsbn ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">
                    {src.isbnFormatted || src.isbnDisplay}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 font-mono text-[10px]">
                    {src.isbnDisplay}
                  </span>
                )}

                {/* Spans Count Badge */}
                {matchingSpans.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold ml-auto">
                    <Layers className="w-3 h-3" />
                    {matchingSpans.length} Matched Evidence Passage{matchingSpans.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Academic Citation Box */}
              <div className="mt-4 p-3.5 bg-slate-900/90 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    Academic Citation
                  </span>

                  {/* Style Tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    {(['apa', 'mla', 'chicago', 'harvard'] as CitationStyle[]).map(style => (
                      <button
                        key={style}
                        onClick={e => {
                          e.stopPropagation();
                          handleStyleChange(src.sourceId, style);
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                          currentStyle === style
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Citation Text & Copy Button */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <p className="text-xs font-mono text-slate-300 leading-relaxed break-words">
                    {citationText}
                  </p>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleCopyCitation(src.sourceId, citationText);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white shrink-0 cursor-pointer transition-colors"
                    title="Copy Citation"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Linked Evidence Passages Snippets */}
              {matchingSpans.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Linked Similarity Evidence Passages ({matchingSpans.length}):
                  </span>
                  <div className="space-y-1.5">
                    {matchingSpans.map(span => (
                      <div
                        key={span.spanId}
                        className="p-2 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">"{span.matchedText}"</span>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
                          [{span.startOffset}, {span.endOffset})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
