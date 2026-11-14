import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { identityProvisioningService } from '../../services/identityProvisioningService';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  ArrowRight,
  Users,
  Loader2,
  FileSpreadsheet,
  X
} from 'lucide-react';

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row.');
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate column headers.');
  return rows.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = values[index] || ''; });
    return row;
  });
}

interface BulkStudentImportProps {
  schoolId?: string;
  institutionId?: string;
  onSuccess?: () => void;
}

interface ImportResult {
  student_id?: string;
  student_number?: string;
  pin?: string;
  first_name?: string;
  last_name?: string;
  class?: string;
  error?: string;
  status: 'success' | 'failed';
}

interface ImportSummary {
  total_submitted: number;
  success_count: number;
  failed_count: number;
  results: ImportResult[];
}

export const BulkStudentImport: React.FC<BulkStudentImportProps> = ({
  schoolId = '',
  institutionId = '',
  onSuccess
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const downloadTemplate = () => {
    // Create CSV template
    const headers = ['first_name', 'last_name', 'gender', 'date_of_birth', 'class_name'];
    const sampleRow = ['Chidi', 'Okeke', 'Male', '2012-05-14', 'JSS 1'];
    
    const csvContent = [
      headers.join(','),
      sampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setSummary(null);

    // Preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedRows = parseCsvRows(text);
        if (parsedRows.length - 1 > 500) {
          setError(`File has ${parsedRows.length - 1} rows. Maximum allowed is 500 students per import.`);
          return;
        }
        const headers = parsedRows[0].map((header) => header.trim().toLowerCase());
        const requiredHeaders = ['first_name', 'last_name', 'gender', 'class_name'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        // Parse data rows (limit to 5 for preview)
        const dataRows = rowsToObjects(parsedRows).slice(0, 5);

        setPreviewData(dataRows);

      } catch (err) {
        setError('Failed to parse file. Please ensure it is a valid CSV file.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read the file again to get all data
      const reader = new FileReader();
      const fileContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject('Failed to read file');
        reader.readAsText(file);
      });

      const parsedRows = parseCsvRows(fileContent);
      const students = rowsToObjects(parsedRows);
      if (students.length > 500) throw new Error('Maximum 500 students per import.');
      const invalidRow = students.findIndex((student) =>
        !student.first_name?.trim() || !student.last_name?.trim()
        || !student.class_name?.trim()
        || !['male', 'female'].includes(String(student.gender || '').trim().toLowerCase())
      );
      if (invalidRow >= 0) {
        throw new Error(`Row ${invalidRow + 2}: first name, last name, valid gender and class name are required. No rows were submitted.`);
      }

      if (!schoolId) throw new Error('A verified school ID is required before importing students.');
      const normalizedStudents = students.map((student: any, index: number) => {
        const gender = String(student.gender || '').trim().toLowerCase();
        if (gender !== 'male' && gender !== 'female') {
          throw new Error(`Row ${index + 2}: gender must be Male or Female.`);
        }
        return {
          row_id: `row-${index + 1}`,
          first_name: String(student.first_name).trim(),
          last_name: String(student.last_name).trim(),
          gender: gender as 'male' | 'female',
          date_of_birth: student.date_of_birth ? String(student.date_of_birth).trim() : null,
          class_name: String(student.class_name).trim(),
        };
      });

      const resultData = await identityProvisioningService.bulkProvisionStudents({
        operation: 'bulk_students',
        request_id: crypto.randomUUID(),
        school_id: schoolId,
        students: normalizedStudents,
      });

      const results: ImportResult[] = resultData.results.map((row) => {
        const source = normalizedStudents.find((student) => student.row_id === row.row_id);
        if (!source) {
          return { status: 'failed', error: 'Gateway returned an unknown row identifier.' };
        }
        if (!row.success || !row.credential) {
          return {
            status: 'failed',
            first_name: source.first_name,
            last_name: source.last_name,
            class: source.class_name,
            error: row.error_message || row.error_code || 'Provisioning failed.',
          };
        }
        return {
          status: 'success',
          student_id: row.credential.actor_id,
          student_number: row.credential.login_identifier,
          pin: row.credential.temporary_pin,
          first_name: source.first_name,
          last_name: source.last_name,
          class: source.class_name,
        };
      });

      const summaryData: ImportSummary = {
        total_submitted: resultData.total_submitted,
        success_count: resultData.success_count,
        failed_count: resultData.failed_count,
        results,
      };

      setSummary({
        total_submitted: summaryData.total_submitted,
        success_count: summaryData.success_count,
        failed_count: summaryData.failed_count,
        results: summaryData.results
      });

      if (onSuccess && resultData.success_count > 0) onSuccess();

    } catch (err: any) {
      setError(err.message || 'Failed to import students');
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewData([]);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (summary) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
            summary.failed_count === 0 ? 'bg-emerald-600' : 'bg-amber-600'
          } text-white`}>
            {summary.failed_count === 0 ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {summary.failed_count === 0 ? 'Import Complete! ✅' : 'Import Completed with Issues'}
          </h2>
          <p className="text-sm text-slate-500">
            {summary.success_count} students imported successfully
            {summary.failed_count > 0 && `, ${summary.failed_count} failed`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
            <p className="text-2xl font-bold text-emerald-600">{summary.success_count}</p>
            <p className="text-xs text-emerald-700 font-medium">Successfully Imported</p>
          </div>
          <div className={`${summary.failed_count > 0 ? 'bg-rose-50' : 'bg-slate-50'} rounded-xl p-4 text-center border ${summary.failed_count > 0 ? 'border-rose-200' : 'border-slate-200'}`}>
            <p className={`text-2xl font-bold ${summary.failed_count > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {summary.failed_count}
            </p>
            <p className={`text-xs font-medium ${summary.failed_count > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
              Failed
            </p>
          </div>
        </div>

        {summary.results.some((r) => r.status === 'success') && (
          <div className="mb-4 max-h-64 overflow-y-auto">
            <p className="text-xs font-medium text-emerald-700 mb-2">Provisioned credentials (display once and distribute securely):</p>
            <div className="space-y-2">
              {summary.results.filter((r) => r.status === 'success').map((result, index) => (
                <div key={result.student_id || index} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
                  <p className="font-semibold text-slate-800">{result.first_name} {result.last_name} · {result.class}</p>
                  <p>Student number: <span className="font-mono">{result.student_number}</span></p>
                  <p>Temporary PIN: <span className="font-mono font-bold">{result.pin}</span></p>
                  <p className="text-amber-700">Must change PIN at first login.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.results.some((r: any) => r.status === 'failed') && (
          <div className="mb-4 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-rose-700 mb-2">Failed Rows:</p>
            <div className="space-y-1">
              {summary.results.filter((r: any) => r.status === 'failed').map((result: any, index: number) => (
                <div key={index} className="bg-rose-50 rounded-lg p-2 text-xs text-rose-700 border border-rose-200 flex items-start gap-2">
                  <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-rose-500" />
                  <span>Row {index + 1}: {result.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              clearFile();
              setSummary(null);
            }}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Import More
          </button>
          <button
            onClick={() => navigate('/portal/principal')}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-colors"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-xl">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bulk Student Import</h1>
          <p className="text-xs text-slate-500">Import multiple students at once using CSV file</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Template Download */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-2">1. Download the template</p>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV Template
          </button>
          <p className="text-[10px] text-slate-400 mt-2">
            Template includes: first_name, last_name, gender, date_of_birth, class_name
          </p>
        </div>

        {/* File Upload */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-2">2. Upload your CSV file</p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex-1 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      clearFile();
                    }}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                  <span>Click to select CSV file</span>
                </div>
              )}
            </label>
          </div>
          {file && (
            <p className="text-[10px] text-emerald-600 mt-2">
              ✅ File selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Preview */}
        {previewData.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">3. Preview (first 5 rows)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-200">
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left font-medium text-slate-700">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      {Object.values(row).map((value: any, i) => (
                        <td key={i} className="px-3 py-2 text-slate-600">
                          {value || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {file && (
              <p className="text-[10px] text-slate-400 mt-2">
                Showing 5 of {file ? 'many' : '0'} rows
              </p>
            )}
          </div>
        )}

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Importing Students...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Import Students</span>
            </>
          )}
        </button>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Important Notes:</p>
            <ul className="list-disc list-inside text-amber-600 space-y-0.5 mt-1">
              <li>Maximum 500 students per import</li>
              <li>Required columns: first_name, last_name, class_name</li>
              <li>Class names must match existing classes (e.g., "JSS 1")</li>
              <li>Each student receives a unique 4-digit PIN for login</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
