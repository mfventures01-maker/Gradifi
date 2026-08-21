import React, { useState, useEffect } from 'react';
import { onboardingService, EnrollStudentResponse } from '../../services/onboardingService';
import { classService } from '../../services/classService';
import { ClassEntity } from '../../contracts/schema';
import { 
  Users, 
  User, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  Plus, 
  Sparkles, 
  QrCode,
  ShieldCheck
} from 'lucide-react';

interface CreateStudentProps {
  schoolId?: string;
  institutionId?: string;
  onSuccess?: (student: EnrollStudentResponse) => void;
  onNavigateToDashboard?: () => void;
}

const DEFAULT_CLASSES: ClassEntity[] = [
  { id: 'cls_jss1', school_id: 'sch_demo_01', name: 'JSS 1', arm: 'Gold', created_at: '' },
  { id: 'cls_jss2', school_id: 'sch_demo_01', name: 'JSS 2', arm: 'Gold', created_at: '' },
  { id: 'cls_jss3', school_id: 'sch_demo_01', name: 'JSS 3', arm: 'Gold', created_at: '' },
  { id: 'cls_ss1', school_id: 'sch_demo_01', name: 'SS 1', arm: 'Science', created_at: '' },
  { id: 'cls_ss2', school_id: 'sch_demo_01', name: 'SS 2', arm: 'Science', created_at: '' },
  { id: 'cls_ss3', school_id: 'sch_demo_01', name: 'SS 3', arm: 'Science', created_at: '' },
];

export const CreateStudent: React.FC<CreateStudentProps> = ({
  schoolId = 'sch_demo_01',
  institutionId = 'inst_demo_01',
  onSuccess,
  onNavigateToDashboard,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [classId, setClassId] = useState('cls_jss1');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('2012-05-15');

  const [classes, setClasses] = useState<ClassEntity[]>(DEFAULT_CLASSES);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [enrolledStudent, setEnrolledStudent] = useState<EnrollStudentResponse | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  useEffect(() => {
    async function loadSchoolClasses() {
      try {
        setLoadingClasses(true);
        const data = await classService.getClasses(schoolId);
        if (data.length > 0) {
          setClasses(data);
          setClassId(data[0].id);
        } else {
          const defaultClasses: ClassEntity[] = [
            { id: 'cls_jss1', school_id: schoolId, name: 'JSS 1', arm: 'Gold', created_at: '' },
            { id: 'cls_jss2', school_id: schoolId, name: 'JSS 2', arm: 'Gold', created_at: '' },
            { id: 'cls_jss3', school_id: schoolId, name: 'JSS 3', arm: 'Gold', created_at: '' },
            { id: 'cls_ss1', school_id: schoolId, name: 'SS 1', arm: 'Science', created_at: '' },
            { id: 'cls_ss2', school_id: schoolId, name: 'SS 2', arm: 'Science', created_at: '' },
            { id: 'cls_ss3', school_id: schoolId, name: 'SS 3', arm: 'Science', created_at: '' },
          ];
          setClasses(defaultClasses);
          setClassId(defaultClasses[0].id);
        }
      } catch (err) {
        console.warn('Class list fetch fallback:', err);
        const defaultClasses: ClassEntity[] = [
          { id: 'cls_jss1', school_id: schoolId || 'sch_demo_01', name: 'JSS 1', arm: 'Gold', created_at: '' },
          { id: 'cls_jss2', school_id: schoolId || 'sch_demo_01', name: 'JSS 2', arm: 'Gold', created_at: '' },
          { id: 'cls_jss3', school_id: schoolId || 'sch_demo_01', name: 'JSS 3', arm: 'Gold', created_at: '' },
          { id: 'cls_ss1', school_id: schoolId || 'sch_demo_01', name: 'SS 1', arm: 'Science', created_at: '' },
          { id: 'cls_ss2', school_id: schoolId || 'sch_demo_01', name: 'SS 2', arm: 'Science', created_at: '' },
          { id: 'cls_ss3', school_id: schoolId || 'sch_demo_01', name: 'SS 3', arm: 'Science', created_at: '' },
        ];
        setClasses(defaultClasses);
        setClassId(defaultClasses[0].id);
      } finally {
        setLoadingClasses(false);
      }
    }

    loadSchoolClasses();
  }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!firstName.trim()) throw new Error('Student first name is required');
      if (!lastName.trim()) throw new Error('Student last name is required');
      if (!classId) throw new Error('Please select an active class level');

      const response = await onboardingService.enrollStudent({
        first_name: firstName,
        last_name: lastName,
        class_id: classId,
        school_id: schoolId,
        institution_id: institutionId,
        gender,
        date_of_birth: dateOfBirth,
      });

      setEnrolledStudent(response);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: any) {
      console.error('EnrollStudent RPC error:', err);
      setError(err.message || 'Student enrollment failed. Please verify form details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleEnrollAnother = () => {
    setFirstName('');
    setLastName('');
    setEnrolledStudent(null);
    setError(null);
  };

  const proceedToDashboard = () => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'dashboard');
      if (institutionId) url.searchParams.set('inst_id', institutionId);
      window.location.href = url.toString();
    }
  };

  const getSelectedClassName = () => {
    const cls = classes.find(c => c.id === (enrolledStudent?.class_id || classId));
    return cls ? `${cls.name} (${cls.arm || 'Gold'})` : 'JSS 1 (Gold)';
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Sparkles className="w-4 h-4" /> SEFAES Canonical Onboarding • Step 3
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Student Enrollment & ID Generation
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enrol students with authoritative registry mapping. The backend automatically generates official student matriculation numbers.
          </p>
        </div>
        <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold">Enrollment Error</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Flashcard Receipt on Success */}
      {enrolledStudent ? (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 border border-emerald-200 text-center animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-full mb-2">
            Student Matriculation Verified
          </span>

          <h2 className="text-2xl font-bold text-slate-900">
            Student Enrollment Flashcard
          </h2>
          <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
            Matriculation record sealed in Supabase PostgreSQL students registry.
          </p>

          {/* Flashcard Box */}
          <div className="mt-6 max-w-md mx-auto p-6 bg-white rounded-2xl border border-emerald-200 shadow-md text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Matric / Student #</p>
                <p className="font-mono text-base font-bold text-emerald-700">{enrolledStudent.student_number}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyNumber(enrolledStudent.student_number)}
                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                title="Copy Student Number"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400">Student Name</p>
                <p className="font-semibold text-slate-800">{firstName} {lastName}</p>
              </div>
              <div>
                <p className="text-slate-400">Enrolled Class</p>
                <p className="font-semibold text-slate-800">{getSelectedClassName()}</p>
              </div>
              <div>
                <p className="text-slate-400">Gender</p>
                <p className="font-semibold text-slate-800 capitalize">{gender}</p>
              </div>
              <div>
                <p className="text-slate-400">Enrolment Date</p>
                <p className="font-semibold text-slate-800">{new Date(enrolledStudent.enrolled_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Student Record ID:</span>
              <span className="font-mono text-slate-600 truncate max-w-[180px]">{enrolledStudent.student_id}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-enroll-another-student"
              onClick={handleEnrollAnother}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-300 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enrol Another Student</span>
            </button>
            <button
              id="btn-proceed-to-portal"
              onClick={proceedToDashboard}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Launch School Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Field 1 & 2: First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-student-first-name"
                    type="text"
                    required
                    placeholder="e.g. Chukwuma"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-student-last-name"
                    type="text"
                    required
                    placeholder="e.g. Adeleke"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Field 3: Class Selection Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Level & Arm <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Layers className="w-4 h-4" />
                </div>
                <select
                  id="select-student-class"
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.arm || 'Gold'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field 4 & 5: Gender & Date of Birth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={gender === 'male'}
                      onChange={() => setGender('male')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2">Male</span>
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={gender === 'female'}
                      onChange={() => setGender('female')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2">Female</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="input-student-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-end">
            <button
              id="btn-submit-student"
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enrolling in Supabase SSoT...</span>
                </>
              ) : (
                <>
                  <span>Enroll Student & Issue ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
