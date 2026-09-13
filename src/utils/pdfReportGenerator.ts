/**
 * GRADIFI VERIFY - DOWNLOADABLE PDF VERIFICATION REPORT GENERATOR
 * Generates an official PDF report of verification results.
 * HOEOS Standard: Truthful evidence, clear boundary separation, printable format.
 */

import { EvidenceEngineResult } from '../services/verify/types';
import { toPublicVerificationResult, PublicVerificationResult } from '../services/verify/publicVerificationResult';
import { generateQRCodeSVG } from './qrGenerator';

export interface PDFReportMetadata {
  verificationId: string;
  documentName: string;
  documentTitle: string;
  documentAuthors: string[];
  normalizedMetadata: {
    title: string;
    authors: string[];
    year?: number;
    doi?: string;
    isbn?: string;
    publisher?: string;
  };
}

export async function generateVerificationReportPDF(
  resultInput: EvidenceEngineResult | PublicVerificationResult,
  meta: PDFReportMetadata
): Promise<void> {
  const publicResult: PublicVerificationResult = 'receipt' in resultInput
    ? resultInput as PublicVerificationResult
    : toPublicVerificationResult(resultInput as EvidenceEngineResult, meta.verificationId);

  const qrSvg = await generateQRCodeSVG(`${window.location.origin}/verify/${meta.verificationId}`, 150);

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GRADIFI Verification Report - ${meta.verificationId}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .meta-item label {
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      display: block;
    }
    .meta-item span {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-verified { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
    }
    
    .qr-container {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 16px;
      border-radius: 8px;
      margin-top: 30px;
    }
    
    .ai-notice {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 12px;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">GRADIFI</div>
      <div class="subtitle">Academic Evidence Verification Report</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; font-size: 14px; color: #2563eb;">VERIFICATION RECEIPT</div>
      <div style="font-size: 11px; color: #64748b;">ID: ${meta.verificationId}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <label>Submitted Document</label>
      <span>${publicResult.document.title}</span>
    </div>
    <div class="meta-item">
      <label>Verification Timestamp</label>
      <span>${new Date(publicResult.receipt.timestamp).toUTCString()}</span>
    </div>
    <div class="meta-item">
      <label>Overall Similarity Score</label>
      <span style="font-size: 18px; font-weight: 800; color: ${publicResult.similarity.overallPercentage > 75 ? '#dc2626' : (publicResult.similarity.overallPercentage > 35 ? '#d97706' : '#059669')}">
        ${publicResult.similarity.overallPercentage}% (${publicResult.similarity.riskLevel})
      </span>
    </div>
    <div class="meta-item">
      <label>Verified Academic Sources</label>
      <span>${publicResult.totalVerifiedSources} Verified Sources</span>
    </div>
  </div>

  <div class="section-title">01. Document Metadata Normalization</div>
  <table>
    <tr><th>Attribute</th><th>Extracted / Normalized Value</th></tr>
    <tr><td>Title</td><td>${publicResult.document.title}</td></tr>
    <tr><td>Authors</td><td>${publicResult.document.authors.join(', ')}</td></tr>
    <tr><td>Year</td><td>${publicResult.document.year || 'N/A'}</td></tr>
    <tr><td>DOI / Identifiers</td><td>${publicResult.document.doi || publicResult.document.isbn || 'N/A'}</td></tr>
  </table>

  <div class="section-title">02. Academic Evidence Sources</div>
  ${publicResult.academicSources.length > 0 || publicResult.bookSources.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Source Title</th>
          <th>Authors</th>
          <th>Type</th>
          <th>DOI / ISBN</th>
          <th>Match %</th>
        </tr>
      </thead>
      <tbody>
        ${publicResult.academicSources.map(s => `
          <tr>
            <td style="font-weight: 600;">${s.title}</td>
            <td>${s.authors.join(', ')}</td>
            <td>Academic Paper</td>
            <td>${s.doi || 'N/A'}</td>
            <td>${s.matchedPercentage}%</td>
          </tr>
        `).join('')}
        ${publicResult.bookSources.map(b => `
          <tr>
            <td style="font-weight: 600;">${b.title}</td>
            <td>${b.authors.join(', ')}</td>
            <td>Academic Book</td>
            <td>${b.isbn13 || b.isbn10 || 'N/A'}</td>
            <td>${b.matchedPercentage}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p style="color: #64748b; font-style: italic;">No external academic matches detected.</p>'}

  <div class="section-title">03. Academic AI Federation Assessment</div>
  <div class="ai-notice">
    <strong>Boundary Governance Note:</strong> AI Federation findings represent multi-model synthesis of retrieved external academic evidence. AI findings do NOT overwrite pure deterministic similarity values.
  </div>
  ${publicResult.aiInterpretation.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Finding Type</th>
          <th>Severity</th>
          <th>Confidence</th>
          <th>Authority</th>
          <th>Explanation</th>
        </tr>
      </thead>
      <tbody>
        ${publicResult.aiInterpretation.map(f => `
          <tr>
            <td style="font-weight: 700; text-transform: uppercase;">${f.findingType}</td>
            <td>${f.severity}</td>
            <td>${(f.normalizedConfidence * 100).toFixed(0)}%</td>
            <td>NON-AUTHORITATIVE</td>
            <td>${f.explanation}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p style="color: #64748b; font-style: italic;">No AI anomalies or conflicting signals detected in retrieved evidence.</p>'}

  <div class="qr-container">
    <div>
      ${qrSvg}
    </div>
    <div>
      <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">Gradifi Verification Receipt</div>
      <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">Scan to independently verify this Gradifi verification record.</div>
      <div style="font-family: monospace; font-size: 10px; color: #64748b;">Hash: ${publicResult.receipt.documentHash.slice(0, 16)}... | Policy: ${publicResult.receipt.policyVersion}</div>
    </div>
  </div>

  <div class="footer">
    Gradifi Verified Academic Evidence Network &bull; Engine Version ${publicResult.receipt.engineVersion} &bull; Confidential Verification Report
  </div>

  <script>
    window.onload = function() {
      // Auto print / download trigger
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  // Create a Blob with HTML format and trigger window download/print
  const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Open in a new tab for seamless user download / PDF save
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    // Fallback: file download trigger
    const link = document.createElement('a');
    link.href = url;
    link.download = `GRADIFI_Verification_Report_${meta.verificationId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

