/**
 * GRADIFI VERIFY - CORRECTION GUIDANCE PANEL
 * Displays actionable correction guidance and citation cards per verified similarity finding.
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  Eye,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { SimilarityFinding, EvidenceMatch } from '../../services/verify/types';
import { filterVerifiedFindings, methodToClass } from './highlightUtils';
import { formatCitation, CitationFormat } from './citationFormatter';

export interface CorrectionPanelProps {
  findings: SimilarityFinding[];
  matches: EvidenceMatch[];
  onActionClick?: (
    findingId: string,
    action: 'copy' | 'view' | 'highlight'
  ) => void;
}

const CITATION_FORMATS: CitationFormat[] = ['APA', 'MLA', 'Chicago', 'Harvard'];

export const CorrectionPanel: React.FC<CorrectionPanelProps> = ({
  findings,
  matches,
  onActionClick,
}) => {
  const [formatMap, setFormatMap] = useState<Record<string, CitationFormat>>({});
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [checkedActions, setCheckedActions] = useState<
    Record<string, { cite?: boolean; paraphrase?: boolean }>
  >({});

  const verifiedFindings = useMemo(
    () => filterVerifiedFindings(findings, matches),
    [findings, matches]
  );

  const matchMap = useMemo(() => {
    const map = new Map<string, EvidenceMatch>();
    for (const m of matches || []) {
      if (m?.sourceId) {
        map.set(m.sourceId, m);
      }
    }
    return map;
  }, [matches]);

  if (!verifiedFindings || verifiedFindings.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Correction Guidance</h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            0 Action Items
          </span>
        </div>
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
          No correction recommendations. No verified overlaps were detected against the retrieved sources.
        </div>
      </div>
    );
  }

  const handleCopyCitation = (findingId: string, citationText: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(citationText).catch(() => {});
    }
    setCopiedMap((prev) => ({ ...prev, [findingId]: true }));
    onActionClick?.(findingId, 'copy');
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [findingId]: false }));
    }, 2000);
  };

  const handleViewSource = (findingId: string, url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onActionClick?.(findingId, 'view');
  };

  const handleShowInDocument = (findingId: string) => {
    const el = document.querySelector(`[data-finding-id="${findingId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    onActionClick?.(findingId, 'highlight');
  };

  const toggleAction = (findingId: string, actionType: 'cite' | 'paraphrase') => {
    setCheckedActions((prev) => {
      const current = prev[findingId] || {};
      return {
        ...prev,
        [findingId]: {
          ...current,
          [actionType]: !current[actionType],
        },
      };
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Correction Guidance
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic remediation recommendations & citation payload per verified overlap
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shrink-0 self-start sm:self-auto flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          {verifiedFindings.length} Verified {verifiedFindings.length === 1 ? 'Overlap' : 'Overlaps'}
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-5">
        {verifiedFindings.map((finding, idx) => {
          const match = matchMap.get(finding.matchedDocumentId);
          const currentFormat = formatMap[finding.findingId] || 'APA';
          const citationText = match ? formatCitation(match, currentFormat) : '';
          const isCopied = !!copiedMap[finding.findingId];
          const actions = checkedActions[finding.findingId] || {};

          // Flagged passage truncation
          const passage = finding.sourceSegment || '';
          const truncatedPassage = passage.length > 200
            ? passage.slice(0, 200) + '...'
            : passage;

          // Metadata fields
          const title = match?.title || match?.provenance?.title || 'Academic Source';
          const authors = (match?.authors && match.authors.length > 0)
            ? match.authors.join(', ')
            : (match?.provenance?.authors && match.provenance.authors.length > 0)
              ? match.provenance.authors.join(', ')
              : 'Author metadata unavailable';
          const year = match?.provenance?.publishedYear ? String(match.provenance.publishedYear) : 'n.d.';
          const identifier = match?.doi || match?.provenance?.doi || match?.isbn || match?.provenance?.isbn || 'N/A';
          const matchMethod = finding.matchMethod || 'TOKEN_OVERLAP';
          const sourceUrl = match?.url || match?.provenance?.sourceUrl;

          return (
            <div
              key={finding.findingId || idx}
              id={`finding-${finding.findingId}`}
              className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4 hover:border-slate-700 transition-colors shadow-inner"
            >
              {/* Finding Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Finding #{idx + 1}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${methodToClass(matchMethod)}`}>
                    {matchMethod}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    ({Math.round(finding.similarityScore)}% similarity)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleShowInDocument(finding.findingId)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded bg-blue-950/40 border border-blue-800/40"
                >
                  <Eye className="w-3.5 h-3.5" /> Show in document
                </button>
              </div>

              {/* Flagged Passage */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Flagged Passage in Document
                </span>
                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs font-mono text-amber-200/90 italic leading-relaxed">
                  "{truncatedPassage}"
                </div>
              </div>

              {/* Source Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-900/50 rounded-lg border border-slate-800/60 text-xs">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Source Title</span>
                  <span className="font-semibold text-slate-200">{title}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Authors</span>
                  <span className="text-slate-300">{authors}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Published Year</span>
                  <span className="text-slate-300">{year}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">DOI / ISBN</span>
                  <span className="font-mono text-blue-400">{identifier}</span>
                </div>
              </div>

              {/* Citation Format Selector & Preview */}
              {match && (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Standard Citation
                    </span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      {CITATION_FORMATS.map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setFormatMap((prev) => ({ ...prev, [finding.findingId]: fmt }))}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            currentFormat === fmt
                              ? 'bg-blue-600 text-white font-bold shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs font-serif text-slate-200 leading-relaxed">
                    {citationText}
                  </div>
                </div>
              )}

              {/* Recommended Action Checkboxes */}
              <div className="space-y-2 pt-1 border-t border-slate-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Recommended Remediation Actions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleAction(finding.findingId, 'cite')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left ${
                      actions.cite
                        ? 'bg-blue-950/40 border-blue-500/60 text-blue-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    {actions.cite ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span>Add a citation to this source</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAction(finding.findingId, 'paraphrase')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left ${
                      actions.paraphrase
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    {actions.paraphrase ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span>Paraphrase this passage</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleCopyCitation(finding.findingId, citationText)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Citation Copied' : 'Copy citation'}
                </button>

                {sourceUrl && (
                  <button
                    type="button"
                    onClick={() => handleViewSource(finding.findingId, sourceUrl)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View source
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleShowInDocument(finding.findingId)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5" /> Show in document
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
