/**
 * GRADIFI VERIFY - DOCUMENT EVIDENCE VIEWER COMPONENT
 * HOEOS P4 & P5 Standard: Visual Evidence Boundary, Source Linking, XSS Safety.
 *
 * Semantic Rule: Highlighting represents evidence of textual matching/similarity ("Matched text").
 * NEVER labels text "PLAGIARIZED".
 */

import React, { useState } from 'react';
import { ShieldCheck, Info, BookOpen, Layers } from 'lucide-react';
import {
  MatchedEvidenceSpan,
  buildRenderedSegments,
  RenderedSegment
} from '../../services/verify/matchedTextHighlightingService';

export interface DocumentEvidenceViewerProps {
  canonicalText: string;
  spans: MatchedEvidenceSpan[];
  title?: string;
  selectedSourceId?: string;
  onSelectSpan?: (span: MatchedEvidenceSpan) => void;
}

export const DocumentEvidenceViewer: React.FC<DocumentEvidenceViewerProps> = ({
  canonicalText,
  spans,
  title = 'Canonical Document Evidence Payload',
  selectedSourceId,
  onSelectSpan
}) => {
  const [activeSpan, setActiveSpan] = useState<MatchedEvidenceSpan | null>(null);
  const segments: RenderedSegment[] = buildRenderedSegments(canonicalText, spans);

  const matchedCount = spans.length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {matchedCount} Matched Evidence Spans
          </span>
        </div>
      </div>

      {/* Boundary Disclaimer */}
      <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong>Visual Evidence Boundary:</strong> Highlighted passages indicate deterministic text matching & similarity evidence across academic sources. Highlighting does not constitute a final misconduct determination.
        </div>
      </div>

      {/* Active Selected Span Detail Box */}
      {activeSpan && (
        <div className="p-3.5 bg-slate-950/80 border border-blue-500/40 rounded-xl space-y-1 text-xs">
          <div className="flex items-center justify-between font-bold text-blue-300">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Matched Passage Evidence
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              Offsets: [{activeSpan.startOffset}, {activeSpan.endOffset})
            </span>
          </div>
          <p className="text-slate-200 font-mono text-[11px] bg-slate-900 p-2 rounded border border-slate-800">
            "{activeSpan.matchedText}"
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Source ID: <code className="text-blue-400">{activeSpan.sourceId}</code></span>
            <span>Match Type: <span className="uppercase font-bold text-blue-300">{activeSpan.matchType}</span></span>
          </div>
        </div>
      )}

      {/* Document Text Rendering Area */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto selection:bg-blue-600 selection:text-white">
        {segments.map((seg, idx) => {
          if (!seg.isMatch) {
            return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
          }

          const primarySpan = seg.spans[0];
          const isSourceSelected = selectedSourceId && seg.spans.some(s => s.sourceId === selectedSourceId);

          return (
            <mark
              key={idx}
              data-evidence-span={primarySpan?.spanId}
              data-source-id={primarySpan?.sourceId}
              data-match-type={primarySpan?.matchType}
              onClick={() => {
                if (primarySpan) {
                  setActiveSpan(primarySpan);
                  onSelectSpan?.(primarySpan);
                }
              }}
              className={`px-0.5 py-0.2 rounded-xs font-semibold cursor-pointer transition-all ${
                isSourceSelected
                  ? 'bg-amber-500/40 text-amber-200 border-b-2 border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                  : 'bg-blue-500/25 text-blue-200 border-b-2 border-blue-400/80 hover:bg-blue-500/40'
              }`}
              title={`Matched text evidence from ${primarySpan?.sourceId || 'source'}`}
            >
              {seg.text}
            </mark>
          );
        })}
      </div>
    </div>
  );
};
