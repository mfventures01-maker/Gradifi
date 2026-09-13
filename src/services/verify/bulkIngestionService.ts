/**
 * GRADIFI VERIFY - BULK PDF INGESTION & EXTRACTION SERVICE
 * HOEOS G5.2 / G5.3 Standard: Deterministic Bulk Contract, Per-File Failure Isolation, Canonical Identity.
 */

import { BulkIngestionBatch, BulkIngestionItem, IngestionStatus } from './types';
import { buildCanonicalAnalysisDocument } from './documentNormalizer';
import { extractDocumentText, validateDocumentFile, formatFileSize } from '../../utils/pdfExtractor';

export class BulkIngestionService {
  /**
   * Process a batch of File objects (PDFs or TXT documents) with item-level failure isolation.
   * A failure in one file DOES NOT terminate processing for other files.
   */
  async processBulkFiles(
    files: File[],
    onProgress?: (batch: BulkIngestionBatch) => void
  ): Promise<BulkIngestionBatch> {
    const startTime = Date.now();
    const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;

    const items: BulkIngestionItem[] = files.map((file, idx) => ({
      ingestionId: `ING-${Date.now().toString(36)}-${(idx + 1).toString().padStart(3, '0')}`,
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      status: 'QUEUED' as IngestionStatus
    }));

    let completed = 0;
    let failed = 0;

    const buildBatchState = (): BulkIngestionBatch => ({
      batchId,
      createdAt: new Date().toISOString(),
      total: files.length,
      completed,
      failed,
      queued: items.filter(i => i.status === 'QUEUED').length,
      inProgress: items.filter(i => i.status === 'VALIDATING' || i.status === 'EXTRACTING').length,
      items: [...items],
      processingTimeMs: Date.now() - startTime
    });

    onProgress?.(buildBatchState());

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item = items[i];

      try {
        // Step 1: Validation
        item.status = 'VALIDATING';
        onProgress?.(buildBatchState());

        const validation = validateDocumentFile(file);
        if (!validation.valid) {
          item.status = 'FAILED';
          item.error = validation.error || 'Invalid file format or size limit exceeded';
          failed++;
          onProgress?.(buildBatchState());
          continue;
        }

        // Step 2: Extraction
        item.status = 'EXTRACTING';
        onProgress?.(buildBatchState());

        const extracted = await extractDocumentText(file);
        if (!extracted.extractedText || !extracted.extractedText.trim()) {
          item.status = 'FAILED';
          item.error = 'No extractable text found in file';
          failed++;
          onProgress?.(buildBatchState());
          continue;
        }

        // Step 3: Canonical Document Normalization & Identity
        const canonicalDoc = buildCanonicalAnalysisDocument({
          rawText: extracted.extractedText,
          title: file.name
        });

        item.status = 'COMPLETED';
        item.extractionMethod = extracted.extractionMethod;
        item.documentHash = canonicalDoc.documentId;
        item.canonicalDocument = canonicalDoc;
        item.extractedTextLength = canonicalDoc.stats.characterCount;
        completed++;

      } catch (err: any) {
        item.status = 'FAILED';
        item.error = err?.message || 'Extraction failed';
        failed++;
      }

      onProgress?.(buildBatchState());
    }

    return buildBatchState();
  }

  /**
   * Process a batch of raw text inputs directly with item-level failure isolation.
   */
  async processBulkTextInputs(
    inputs: Array<{ fileName: string; text: string }>
  ): Promise<BulkIngestionBatch> {
    const startTime = Date.now();
    const batchId = `BATCH-TXT-${Date.now().toString(36).toUpperCase()}`;

    const items: BulkIngestionItem[] = inputs.map((input, idx) => ({
      ingestionId: `ING-${Date.now().toString(36)}-${(idx + 1).toString().padStart(3, '0')}`,
      fileName: input.fileName,
      fileSizeBytes: Buffer.byteLength(input.text || '', 'utf8'),
      fileSizeFormatted: formatFileSize(Buffer.byteLength(input.text || '', 'utf8')),
      status: 'QUEUED' as IngestionStatus
    }));

    let completed = 0;
    let failed = 0;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const item = items[i];

      try {
        item.status = 'VALIDATING';

        if (!input.text || !input.text.trim()) {
          item.status = 'FAILED';
          item.error = 'Empty document text provided';
          failed++;
          continue;
        }

        item.status = 'EXTRACTING';

        const canonicalDoc = buildCanonicalAnalysisDocument({
          rawText: input.text,
          title: input.fileName
        });

        item.status = 'COMPLETED';
        item.extractionMethod = 'text_reader';
        item.documentHash = canonicalDoc.documentId;
        item.canonicalDocument = canonicalDoc;
        item.extractedTextLength = canonicalDoc.stats.characterCount;
        completed++;

      } catch (err: any) {
        item.status = 'FAILED';
        item.error = err?.message || 'Processing failed';
        failed++;
      }
    }

    return {
      batchId,
      createdAt: new Date().toISOString(),
      total: inputs.length,
      completed,
      failed,
      queued: 0,
      inProgress: 0,
      items,
      processingTimeMs: Date.now() - startTime
    };
  }
}

export const bulkIngestionService = new BulkIngestionService();
