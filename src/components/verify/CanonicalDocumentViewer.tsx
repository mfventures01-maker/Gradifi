/**
 * GRADIFI VERIFY - CANONICAL DOCUMENT VIEWER
 * Pure deterministic rendering of canonical student document with verified similarity markers.
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import React, { useMemo } from 'react';
import { SimilarityFinding, EvidenceMatch } from '../../services/verify/types';
import {
  applyHighlights,
  filterVerifiedFindings,
  methodToClass,
  HighlightSegment,
} from './highlightUtils';

export interface CanonicalDocumentViewerProps {
  documentText: string;
  findings: SimilarityFinding[];
  matches: EvidenceMatch[];
  onFindingClick?: (findingId: string) => void;
}

export const CanonicalDocumentViewer: React.FC<CanonicalDocumentViewerProps> = ({
  documentText,
  findings,
  matches,
  onFindingClick,
}) => {
  const verifiedFindings = useMemo(
    () => filterVerifiedFindings(findings, matches),
    [findings, matches]
  );

  const segments: HighlightSegment[] = useMemo(
    () => applyHighlights(documentText, verifiedFindings),
    [documentText, verifiedFindings]
  );

  const findingsMap = useMemo(() => {
    const map = new Map<string, { finding: SimilarityFinding; match?: EvidenceMatch }>();
    const matchMap = new Map<string, EvidenceMatch>();
    for (const m of matches || []) {
      if (m?.sourceId) {
        matchMap.set(m.sourceId, m);
      }
    }
    for (const f of verifiedFindings) {
      if (f?.findingId) {
        map.set(f.findingId, {
          finding: f,
          match: matchMap.get(f.matchedDocumentId),
        });
      }
    }
    return map;
  }, [verifiedFindings, matches]);

  return (
    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto selection:bg-blue-600 selection:text-white">
      {segments.map((seg, idx) => {
        if (!seg.findingId) {
          return <span key={idx}>{seg.text}</span>;
        }

        const data = findingsMap.get(seg.findingId);
        const match = data?.match;
        const finding = data?.finding;

        const title = match?.title || match?.provenance?.title || 'Verified Academic Source';
        const authors = (match?.authors || match?.provenance?.authors || []).join(', ') || 'N/A';
        const identifier = match?.doi || match?.provenance?.doi || match?.isbn || match?.provenance?.isbn || 'N/A';
        const method = finding?.matchMethod || seg.method || 'TOKEN_OVERLAP';
        const score = `${Math.round(finding?.similarityScore ?? 0)}%`;
        const tooltipTitle = `${title}\nAuthors: ${authors}\nIdentifier: ${identifier}\nMethod: ${method}\nScore: ${score}`;

        return (
          <mark
            key={idx}
            data-finding-id={seg.findingId}
            className={`relative inline group cursor-pointer rounded px-0.5 border ${methodToClass(seg.method)}`}
            onClick={() => seg.findingId && onFindingClick?.(seg.findingId)}
            title={tooltipTitle}
          >
            {seg.text}
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col z-50 w-64 p-2.5 bg-slate-950 text-slate-200 text-xs rounded-lg border border-slate-700 shadow-2xl space-y-1 font-sans text-left not-italic whitespace-normal normal-case">
              <span className="font-bold text-white text-[11px] line-clamp-2">{title}</span>
              <span className="text-slate-400 text-[10px]">
                <strong className="text-slate-300">Authors:</strong> {authors}
              </span>
              <span className="text-slate-400 text-[10px]">
                <strong className="text-slate-300">DOI/ISBN:</strong>{' '}
                <span className="font-mono text-blue-400">{identifier}</span>
              </span>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                <span className="font-mono font-bold text-emerald-400">{method}</span>
                <span className="font-bold text-slate-300">Score: {score}</span>
              </div>
            </span>
          </mark>
        );
      })}
    </div>
  );
};
