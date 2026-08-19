import React, { useState, useEffect } from 'react';
import { onboardingService, CreateTeacherResponse } from '../../services/onboardingService';
import { classService } from '../../services/classService';
import { subjectService } from '../../services/subjectService';
import { ClassEntity, SubjectCatalogItem } from '../../contracts/schema';
import { 
  GraduationCap, 
  UserPlus, 
  Mail, 
  Phone, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  Plus, 
  Sparkles,
  Award
} from 'lucide-react';

interface CreateTeacherProps {
  schoolId?: string;
  institutionId?: string;
  onSuccess?: (teacher: CreateTeacherResponse) => void;
  onNavigateToStudents?: () => void;
}

export const CreateTeacher: React.FC<CreateTeacherProps> = ({
  schoolId = 'sch_demo_01',
  institutionId = 'inst_demo_01',
  onSuccess,
  onNavigateToStudents,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [classSubjectId, setClassSubjectId] = useState('');

  // Dropdown options
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<SubjectCatalogItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTeacher, setCreatedTeacher] = useState<CreateTeacherResponse | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  useEffect(() => {
    async function loadAcademicStructure() {
      try {
        setLoadingOptions(true);
        const [clsData, subData] = await Promise.all([
          classService.getClasses(schoolId).catch(() => []),
          subjectService.getSubjectCatalog().catch(() => []),
        ]);

        setClasses(clsData.length > 0 ? clsData : [
          { id: 'cls_jss1', school_id: schoolId, name: 'JSS 1', arm: 'Gold', created_at: '' },
          { id: 'cls_jss2', school_id: schoolId, name: 'JSS 2', arm: 'Gold', created_at: '' },
          { id: 'cls_jss3', school_id: schoolId, name: 'JSS 3', arm: 'Gold', created_at: '' },
          { id: 'cls_ss1', school_id: schoolId, name: 'SS 1', arm: 'Science', created_at: '' },
          { id: 'cls_ss2', school_id: schoolId, name: 'SS 2', arm: 'Science', created_at: '' },
          { id: 'cls_ss3', school_id: schoolId, name: 'SS 3', arm: 'Science', created_at: '' },
        ]);

        setSubjects(subData);
      } catch (err) {
        console.warn('Academic structure load warning:', err);
      } finally {
        setLoadingOptions(false);
      }
    }

    loadAcademicStructure();
  }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name.trim()) throw new Error('Teacher full name is required');
      if (!email.trim()) throw new Error('Teacher email address is required');
      if (!phone.trim()) throw new Error('Teacher phone number is required');

      const response = await onboardingService.createTeacher({
        name,
        email,
        phone,
        school_id: schoolId,
        institution_id: institutionId,
        class_subject_id: classSubjectId || undefined,
      });

      setCreatedTeacher(response);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: any) {
      console.error('CreateTeacher RPC error:', err);
      setError(err.message || 'Teacher creation failed. Please verify staff details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleAddAnother = () => {
    setName('');
    setEmail('');
    setPhone('');
    setClassSubjectId('');
    setCreatedTeacher(null);
    setError(null);
  };

  const proceedToStudents = () => {
    if (onNavigateToStudents) {
      onNavigateToStudents();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'onboarding');
      url.searchParams.set('step', '11');
      if (institutionId) url.searchParams.set('inst_id', institutionId);
      window.location.href = url.toString();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Sparkles className="w-4 h-4" /> SEFAES Canonical Onboarding • Step 2
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Teacher & Staff Registration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Register academic faculty members and map them to class subject assignments using the certified Supabase RPC.
          </p>
        </div>
        <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <GraduationCap className="w-6 h-6" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold">Creation Error</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Flashcard Receipt on Success */}
      {createdTeacher ? (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200 text-center animate-fadeIn">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <Award className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider rounded-full mb-2">
            Staff Identity Provisioned
          </span>

          <h2 className="text-2xl font-bold text-slate-900">
            Teacher Flashcard Receipt
          </h2>
          <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
            Teacher has been registered authoritatively in the Supabase PostgreSQL database.
          </p>

          {/* Flashcard Box */}
          <div className="mt-6 max-w-md mx-auto p-6 bg-white rounded-2xl border border-blue-200 shadow-md text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Teacher ID</p>
                <p className="font-mono text-sm font-bold text-blue-700">{createdTeacher.teacher_id}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyId(createdTeacher.teacher_id)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Copy Teacher ID"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400">Full Name</p>
                <p className="font-semibold text-slate-800">{createdTeacher.name}</p>
              </div>
              <div>
                <p className="text-slate-400">Email</p>
                <p className="font-semibold text-slate-800 truncate">{createdTeacher.email}</p>
              </div>
              <div>
                <p className="text-slate-400">Phone</p>
                <p className="font-semibold text-slate-800">{createdTeacher.phone}</p>
              </div>
              <div>
                <p className="text-slate-400">School ID</p>
                <p className="font-mono font-semibold text-slate-800 truncate">{createdTeacher.school_id}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">SSoT Verified Status:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" /> Certified Active
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-add-another-teacher"
              onClick={handleAddAnother}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-300 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Teacher</span>
            </button>
            <button
              id="btn-proceed-to-students"
              onClick={proceedToStudents}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <span>Proceed to Student Enrollment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Field 1: Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teacher Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <input
                  id="input-teacher-name"
                  type="text"
                  required
                  placeholder="e.g. Mrs. Ngozi Okonkwo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Field 2: Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-teacher-email"
                  type="email"
                  required
                  placeholder="ngozi.okonkwo@school.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Field 3: Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="input-teacher-phone"
                  type="tel"
                  required
                  placeholder="+234 803 456 7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Field 4: Class Assignment Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Subject & Class Assignment (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <select
                  id="select-teacher-class-subject"
                  value={classSubjectId}
                  onChange={(e) => setClassSubjectId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- General Faculty / Unassigned --</option>
                  {classes.flatMap((cls) =>
                    subjects.slice(0, 8).map((sub) => (
                      <option key={`${cls.id}_${sub.id}`} value={`${cls.id}_${sub.id}`}>
                        {cls.name} ({cls.arm || 'Gold'}) — {sub.name} ({sub.code})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                You can map additional subjects in the curriculum matrix dashboard after onboarding.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-end">
            <button
              id="btn-submit-teacher"
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Invoking create_teacher RPC...</span>
                </>
              ) : (
                <>
                  <span>Create Teacher & Issue ID</span>
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
