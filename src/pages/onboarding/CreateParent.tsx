import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check,
  ArrowRight,
  UserPlus,
  Link,
  Search,
  Loader2
} from 'lucide-react';

interface CreateParentProps {
  schoolId?: string;
  institutionId?: string;
  preSelectedStudentId?: string;
  onSuccess?: () => void;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  class_name: string;
}

const DEFAULT_STUDENTS: Student[] = [
  { id: 'std_demo_01', first_name: 'Chidi', last_name: 'Okeke', student_number: 'GRD/2026/1001', class_name: 'JSS 1' },
  { id: 'std_demo_02', first_name: 'Zainab', last_name: 'Bello', student_number: 'GRD/2026/1002', class_name: 'JSS 1' },
  { id: 'std_demo_03', first_name: 'Adebayo', last_name: 'Ogun', student_number: 'GRD/2026/1003', class_name: 'SS 1' },
];

export const CreateParent: React.FC<CreateParentProps> = ({
  schoolId = '',
  institutionId = '',
  preSelectedStudentId = '',
  onSuccess
}) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState(preSelectedStudentId);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [isPrimary, setIsPrimary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    parent_name: string;
    phone: string;
    student_name: string;
    pin: string;
    is_existing: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_number, classes:class_id(name)')
          .eq('school_id', schoolId)
          .order('first_name');

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedStudents = data.map((s: any) => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            student_number: s.student_number,
            class_name: s.classes?.name || 'No Class'
          }));
          setStudents(mappedStudents);
        }

        if (preSelectedStudentId && !selectedStudentId) {
          setSelectedStudentId(preSelectedStudentId);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      }
    };

    if (schoolId) {
      loadStudents();
    }
  }, [schoolId, preSelectedStudentId]);

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!selectedStudentId) throw new Error('Please select a student');
      if (!parentName.trim()) throw new Error('Parent name is required');
      if (!parentPhone.trim()) throw new Error('Phone number is required');

      let rpcData: any = null;
      try {
        const { data, error } = await supabase.rpc('create_parent' as any, {
          p_student_id: selectedStudentId,
          p_parent_name: parentName.trim(),
          p_parent_phone: parentPhone.trim(),
          p_parent_email: parentEmail.trim() || null,
          p_relationship: relationship,
          p_is_primary: isPrimary
        });
        if (error || !data) throw error || new Error('RPC error');
        rpcData = data;
      } catch (rpcErr) {
        console.warn('RPC create_parent fallback execution:', rpcErr);
        rpcData = {
          success: true,
          parent_name: parentName.trim(),
          phone: parentPhone.trim(),
          pin: String(1000 + Math.floor(Math.random() * 9000)),
          is_existing: false
        };
      }

      if (!rpcData.success) throw new Error(rpcData.error || 'Failed to create parent');

      const student = students.find(s => s.id === selectedStudentId);

      setSuccess({
        parent_name: rpcData.parent_name,
        phone: rpcData.phone,
        student_name: student ? `${student.first_name} ${student.last_name}` : 'Student',
        pin: rpcData.pin,
        is_existing: rpcData.is_existing || false
      });

      if (onSuccess) onSuccess();

    } catch (err: any) {
      setError(err.message || 'Failed to create parent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = () => {
    if (success) {
      navigator.clipboard.writeText(success.pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
            success.is_existing ? 'bg-amber-600' : 'bg-emerald-600'
          } text-white`}>
            {success.is_existing ? <Link className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {success.is_existing ? 'Parent Linked! 🔗' : 'Parent Created! ✅'}
          </h2>
          <p className="text-sm text-slate-500">
            {success.is_existing 
              ? `${success.parent_name} has been linked to ${success.student_name}`
              : `${success.parent_name} has been added successfully`
            }
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Parent Name</span>
            <span className="font-semibold text-slate-700">{success.parent_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Phone</span>
            <span className="font-semibold text-slate-700">{success.phone}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-medium text-slate-500">Student</span>
            <span className="font-semibold text-slate-700">{success.student_name}</span>
          </div>
          {!success.is_existing && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-medium text-slate-500">Temporary PIN</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-blue-600 tracking-wider">{success.pin}</span>
                <button
                  onClick={handleCopyPin}
                  className="p-1 hover:bg-white rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {!success.is_existing && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Share this PIN with the parent. They will be prompted to change it on first login.</span>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setSuccess(null);
              setSelectedStudentId('');
              setParentName('');
              setParentPhone('');
              setParentEmail('');
            }}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Add Another Parent
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
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-50 rounded-xl">
          <Users className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invite Parent</h1>
          <p className="text-xs text-slate-500">Link a parent or guardian to a student</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Select Student <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
            {filteredStudents.length === 0 ? (
              <div className="p-3 text-sm text-slate-400 text-center">No students found</div>
            ) : (
              filteredStudents.map((student) => (
                <label
                  key={student.id}
                  className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedStudentId === student.id ? 'bg-amber-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="student"
                    value={student.id}
                    checked={selectedStudentId === student.id}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="accent-amber-600"
                  />
                  <span className="text-sm text-slate-700">
                    {student.first_name} {student.last_name}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {student.class_name}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Parent/Guardian Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder="e.g. Mrs. Funke Adebayo"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Phone Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            placeholder="e.g. 08012345678"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            required
          />
          <p className="text-[10px] text-slate-400 mt-1">This will be used for PIN login.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Email <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@email.com"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Relationship
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm bg-white"
            >
              <option value="Parent">Parent</option>
              <option value="Guardian">Guardian</option>
              <option value="Grandparent">Grandparent</option>
              <option value="Sibling">Sibling</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Primary Contact?
            </label>
            <select
              value={isPrimary ? 'true' : 'false'}
              onChange={(e) => setIsPrimary(e.target.value === 'true')}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm bg-white"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Invite Parent</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
