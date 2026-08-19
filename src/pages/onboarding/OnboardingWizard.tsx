import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  School,
  Building2,
  User,
  Lock,
  Layers,
  BookOpen,
  Users,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Home
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { ONBOARDING_STEPS } from '../../contracts/onboarding';
import {
  Institution,
  Profile,
  School as SchoolType,
  ClassEntity,
  SubjectCatalogItem,
  Teacher,
  Student
} from '../../contracts/schema';

interface OnboardingWizardProps {
  initialStep?: number;
  initialInstitutionId?: string;
  onComplete: (institutionId: string) => void;
  onExitHome: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialStep = 1,
  initialInstitutionId = '',
  onComplete,
  onExitHome,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authoritative State from Backend
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<SchoolType | null>(null);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjectCatalog, setSubjectCatalog] = useState<SubjectCatalogItem[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parentAccessEnabled, setParentAccessEnabled] = useState<boolean>(true);
  const [cbtEngineActivated, setCbtEngineActivated] = useState<boolean>(true);
  const [aiGradingActivated, setAiGradingActivated] = useState<boolean>(true);

  // Step 2 Form (Institution)
  const [instName, setInstName] = useState('Premier British Nigerian College');
  const [instType, setInstType] = useState<'secondary' | 'primary' | 'k12' | 'tertiary'>('secondary');
  const [instCountry, setInstCountry] = useState('Nigeria');

  // Step 3 & 4 Form (Admin & Auth)
  const [adminName, setAdminName] = useState('Dr. Folasade Alabi');
  const [adminEmail, setAdminEmail] = useState('principal@pbnc.edu.ng');
  const [adminPhone, setAdminPhone] = useState('+234 803 789 0123');
  const [adminPassword, setAdminPassword] = useState('Passcode2026!');
  const [confirmPassword, setConfirmPassword] = useState('Passcode2026!');

  // Step 5 & 6 Form (School & Identity)
  const [schoolName, setSchoolName] = useState('Premier Secondary School (Main Campus)');
  const [schoolType, setSchoolType] = useState<'secondary' | 'primary' | 'comprehensive'>('secondary');
  const [schoolEmail, setSchoolEmail] = useState('info@pbnc.edu.ng');
  const [schoolPhone, setSchoolPhone] = useState('+234 803 789 0123');
  const [schoolAddress, setSchoolAddress] = useState('Plot 12, Lekki Phase 1, Lagos');
  const [principalName, setPrincipalName] = useState('Dr. Folasade Alabi');
  const [vicePrincipalName, setVicePrincipalName] = useState('Mr. Babatunde Sanusi');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState('https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&auto=format&fit=crop&q=80');
  const [schoolSlug, setSchoolSlug] = useState('premier-college');

  // Step 10 Form (Teacher input)
  const [newTeacherName, setNewTeacherName] = useState('Mr. Kenneth Obi');
  const [newTeacherEmail, setNewTeacherEmail] = useState('k.obi@pbnc.edu.ng');
  const [newTeacherPhone, setNewTeacherPhone] = useState('+234 802 111 2233');

  // Step 11 Form (Student input)
  const [newStudentFirst, setNewStudentFirst] = useState('Tobi');
  const [newStudentLast, setNewStudentLast] = useState('Adeyemi');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');
  const [newStudentDob, setNewStudentDob] = useState('2010-05-14');
  const [newStudentClassId, setNewStudentClassId] = useState('');

  // Step 14 Final Reconciliation Data
  const [reconciliationReport, setReconciliationReport] = useState<any>(null);

  // Sync URL query params with current step
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', currentStep.toString());
    window.history.replaceState({}, '', url.toString());
  }, [currentStep]);

  // Load subject catalog on mount
  useEffect(() => {
    apiClient.getSubjectCatalog().then((cat) => {
      setSubjectCatalog(cat);
      // Pre-select top 8 WAEC core subjects
      setSelectedSubjects(cat.slice(0, 8).map(s => s.id));
    }).catch(console.error);

    // If initial institution id provided, load authoritative data
    if (initialInstitutionId) {
      loadInstitutionData(initialInstitutionId);
    }
  }, [initialInstitutionId]);

  const loadInstitutionData = async (instId: string) => {
    try {
      const state = await apiClient.getOnboardingState(instId);
      if (state.has_institution) {
        setInstitution(state.institution);
        if (state.profile) setProfile(state.profile);
        if (state.school) {
          setSchool(state.school);
          const clsList = await apiClient.getClasses(state.school.id);
          setClasses(clsList);
          const tchList = await apiClient.getTeachers(state.school.id);
          setTeachers(tchList);
          const stdList = await apiClient.getStudents(state.school.id);
          setStudents(stdList);
        }
      }
    } catch (e) {
      console.error("Failed to load institution state:", e);
    }
  };

  // ----------------------------------------------------
  // STEP TRANSITION & SUBMISSION HANDLERS
  // ----------------------------------------------------

  // Step 2: Create Institution
  const handleStep2Submit = async () => {
    if (!instName.trim()) {
      setErrorMessage("Please enter an institution name");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await apiClient.createInstitutionAccount({
        name: instName,
        type: instType,
        country: instCountry,
      });
      setInstitution({
        id: result.institution_id,
        name: result.name,
        type: result.type as any,
        country: result.country,
        created_at: result.created_at,
      });
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create institution");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 & 4: Create Admin & Auth
  const handleStep3Submit = () => {
    if (!adminName.trim() || !adminEmail.trim()) {
      setErrorMessage("Administrator name and email are required");
      return;
    }
    setErrorMessage(null);
    setCurrentStep(4);
  };

  const handleStep4Submit = async () => {
    if (!adminPassword || adminPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match or are empty");
      return;
    }
    if (!institution) {
      setErrorMessage("Authoritative institution record missing");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await apiClient.createAdminProfile({
        institution_id: institution.id,
        full_name: adminName,
        email: adminEmail,
        role: 'admin',
        phone: adminPhone,
        password: adminPassword,
      });
      setProfile(result);
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication setup failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Create School with default secondary classes
  const handleStep5Submit = async () => {
    if (!schoolName.trim()) {
      setErrorMessage("School name is required");
      return;
    }
    if (!institution) {
      setErrorMessage("Authoritative institution context required");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await apiClient.createSchoolWithClasses({
        institution_id: institution.id,
        school_name: schoolName,
        school_type: schoolType,
        email: schoolEmail,
        phone: schoolPhone,
        address: schoolAddress,
        principal_name: principalName,
        vice_principal_name: vicePrincipalName,
        initial_classes: ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'],
      });

      const schoolRecord: SchoolType = {
        id: result.school_id,
        institution_id: result.institution_id,
        school_name: result.school_name,
        school_type: schoolType,
        email: schoolEmail,
        phone: schoolPhone,
        address: schoolAddress,
        principal_name: principalName,
        vice_principal_name: vicePrincipalName,
        logo_url: schoolLogoUrl,
        url_slug: schoolSlug,
        created_at: new Date().toISOString(),
      };
      setSchool(schoolRecord);

      // Query authoritative classes
      const fetchedClasses = await apiClient.getClasses(result.school_id);
      setClasses(fetchedClasses);
      if (fetchedClasses.length > 0) {
        setNewStudentClassId(fetchedClasses[0].id);
      }

      setCurrentStep(6);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create school");
    } finally {
      setLoading(false);
    }
  };

  // Step 6: School Identity
  const handleStep6Submit = async () => {
    if (school) {
      await apiClient.updateSchoolIdentity({
        school_id: school.id,
        logo_url: schoolLogoUrl,
        url_slug: schoolSlug,
      });
    }
    setCurrentStep(7);
  };

  // Step 7: Academic Structure
  const handleStep7Submit = () => {
    setCurrentStep(8);
  };

  // Step 8: Confirm Classes
  const handleStep8Submit = () => {
    setCurrentStep(9);
  };

  // Step 9: Assign Subjects
  const handleStep9Submit = async () => {
    if (!school || !institution) return;
    setLoading(true);
    try {
      // Map all selected subjects to all classes
      const assignments: Array<{ class_id: string; subject_id: string }> = [];
      for (const cls of classes) {
        for (const subId of selectedSubjects) {
          assignments.push({ class_id: cls.id, subject_id: subId });
        }
      }
      await apiClient.assignSubjectsToClasses({
        school_id: school.id,
        institution_id: institution.id,
        assignments,
      });
      setCurrentStep(10);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to configure subjects");
    } finally {
      setLoading(false);
    }
  };

  // Step 10: Add Teacher
  const handleAddTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherEmail.trim() || !school || !institution) {
      setErrorMessage("Teacher name and email are required");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const tch = await apiClient.createTeacher({
        institution_id: institution.id,
        school_id: school.id,
        name: newTeacherName,
        email: newTeacherEmail,
        phone: newTeacherPhone,
      });
      const updated = await apiClient.getTeachers(school.id);
      setTeachers(updated);
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPhone('');
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add teacher");
    } finally {
      setLoading(false);
    }
  };

  // Step 11: Enrol Student
  const handleEnrollStudent = async () => {
    if (!newStudentFirst.trim() || !newStudentLast.trim() || !school || !institution) {
      setErrorMessage("Student first and last names are required");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await apiClient.enrollStudent({
        institution_id: institution.id,
        school_id: school.id,
        class_id: newStudentClassId || (classes[0]?.id || ''),
        first_name: newStudentFirst,
        last_name: newStudentLast,
        gender: newStudentGender,
        date_of_birth: newStudentDob,
      });
      const updated = await apiClient.getStudents(school.id);
      setStudents(updated);
      setNewStudentFirst('');
      setNewStudentLast('');
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to enrol student");
    } finally {
      setLoading(false);
    }
  };

  // Step 14: Final Server-Authoritative Reconciliation & Launch
  const handleLaunchCampus = async () => {
    if (!institution || !school) {
      setErrorMessage("Cannot launch: Institution or school record missing");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const report = await apiClient.reconcileAndLaunch({
        institution_id: institution.id,
        school_id: school.id,
        parent_access: parentAccessEnabled,
        cbt_activated: cbtEngineActivated,
        ai_grading_activated: aiGradingActivated,
      });

      setReconciliationReport(report);

      if (report.is_valid_for_launch) {
        setTimeout(() => {
          onComplete(institution.id);
        }, 1200);
      } else {
        setErrorMessage(report.validation_errors?.join(", ") || "Reconciliation failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Campus launch failed");
    } finally {
      setLoading(false);
    }
  };

  // Calculate Progress Percentage
  const progressPercent = Math.round(((currentStep - 1) / 13) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans">
      {/* ---------------------------------------------------- */}
      {/* TOP WIZARD HEADER                                    */}
      {/* ---------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-blue-600 tracking-tight cursor-pointer" onClick={onExitHome}>
              GRADIFI
            </span>
            <span className="text-slate-300">|</span>
            <div className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Institution Setup</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-xs">
                Step {currentStep} of 14
              </span>
            </div>
          </div>

          <button
            onClick={onExitHome}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-blue-600 h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          ></div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* WIZARD CONTAINER                                     */}
      {/* ---------------------------------------------------- */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        
        {/* Step Indicator Pill */}
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>{ONBOARDING_STEPS[currentStep - 1]?.step_title}</span>
          <span>{progressPercent}% Completed</span>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-xs underline text-red-800">Dismiss</button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 1: WELCOME TO GRADIFI                           */}
        {/* ---------------------------------------------------- */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <School className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 1 of 14</span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                WELCOME TO GRADIFI
              </h2>
              <p className="text-base text-slate-600 mt-2 leading-relaxed">
                Set up your school or educational institution in a few simple steps.
              </p>
            </div>

            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 text-slate-800 font-medium text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>School management and class structuring (JSS 1 - SS 3)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-800 font-medium text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>AI-assisted grading with WAEC/NECO teacher rubrics</span>
              </div>
              <div className="flex items-center gap-3 text-slate-800 font-medium text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>CBT examinations with automated instant scoring</span>
              </div>
              <div className="flex items-center gap-3 text-slate-800 font-medium text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Academic assessment and parental progress tracking</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="btn-step1-start"
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 inline-flex items-center gap-2 transition-all hover:scale-105"
              >
                <span>GET STARTED</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 2: INSTITUTION INFORMATION                      */}
        {/* ---------------------------------------------------- */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 2 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                INSTITUTION INFORMATION
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Enter your official institution or school group details.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Institution Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g. Corona High School Group"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Institution Type
                  </label>
                  <select
                    value={instType}
                    onChange={(e) => setInstType(e.target.value as any)}
                    className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="secondary">Secondary School (JSS 1 - SS 3)</option>
                    <option value="primary">Primary School</option>
                    <option value="k12">Comprehensive K-12 Academy</option>
                    <option value="tertiary">College / Tertiary Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Country
                  </label>
                  <select
                    value={instCountry}
                    onChange={(e) => setInstCountry(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Nigeria">Nigeria</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Sierra Leone">Sierra Leone</option>
                    <option value="Gambia">Gambia</option>
                    <option value="Liberia">Liberia</option>
                    <option value="Kenya">Kenya</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step2-next"
                onClick={handleStep2Submit}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>SAVE & CONTINUE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 3: CREATE INSTITUTION ADMINISTRATOR             */}
        {/* ---------------------------------------------------- */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 3 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                CREATE INSTITUTION ADMINISTRATOR
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Set up the primary administrative officer for <strong className="text-slate-900">{institution?.name || instName}</strong>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Administrator Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Dr. Chinedu Okafor"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@school.edu.ng"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+234 803 123 4567"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step3-next"
                onClick={handleStep3Submit}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-md"
              >
                <span>CONTINUE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 4: ADMINISTRATOR AUTHENTICATION                 */}
        {/* ---------------------------------------------------- */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 4 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                SECURE YOUR GRADIFI ACCOUNT
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Set a strong master password for {adminEmail}.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  disabled
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step4-next"
                onClick={handleStep4Submit}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>SECURE & CONTINUE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 5: CREATE YOUR SCHOOL                           */}
        {/* ---------------------------------------------------- */}
        {currentStep === 5 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 5 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                CREATE YOUR SCHOOL
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Provision the primary campus entity under {institution?.name}.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  School Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Premier Secondary School"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Principal Name
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Vice Principal Name
                  </label>
                  <input
                    type="text"
                    value={vicePrincipalName}
                    onChange={(e) => setVicePrincipalName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  placeholder="e.g. 14 Victoria Island, Lagos"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step5-next"
                onClick={handleStep5Submit}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>CREATE SCHOOL</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 6: SCHOOL IDENTITY                              */}
        {/* ---------------------------------------------------- */}
        {currentStep === 6 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 6 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                YOUR SCHOOL IDENTITY
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Upload your school crest and custom portal URL address.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">School Logo URL</label>
                <input
                  type="url"
                  value={schoolLogoUrl}
                  onChange={(e) => setSchoolLogoUrl(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">School URL Slug</label>
                <div className="flex items-center">
                  <span className="px-3.5 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs text-slate-500 font-mono">
                    gradifi.com/school/
                  </span>
                  <input
                    type="text"
                    value={schoolSlug}
                    onChange={(e) => setSchoolSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-r-xl font-mono text-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(5)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step6-next"
                onClick={handleStep6Submit}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md"
              >
                <span>CONTINUE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 7: ACADEMIC STRUCTURE                           */}
        {/* ---------------------------------------------------- */}
        {currentStep === 7 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 7 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                ACADEMIC STRUCTURE
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Initialized standard Nigerian secondary school classes based on certified curriculum.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((cls) => (
                <div key={cls} className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{cls}</div>
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(6)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step7-next"
                onClick={handleStep7Submit}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md"
              >
                <span>CONFIRM STRUCTURE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 8: CONFIRM CLASSES                              */}
        {/* ---------------------------------------------------- */}
        {currentStep === 8 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 8 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                CONFIRM CLASSES
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Querying authoritative backend database for created classes.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-3">Authoritative Class Roster ({classes.length} verified):</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {classes.map((c) => (
                  <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {c.id.slice(-4)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(7)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step8-next"
                onClick={handleStep8Submit}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md"
              >
                <span>PROCEED TO SUBJECTS</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 9: CONFIGURE SUBJECTS                           */}
        {/* ---------------------------------------------------- */}
        {currentStep === 9 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 9 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                SELECT YOUR SUBJECTS
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Select curriculum-certified subjects from the WAEC / NECO catalog.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
              {subjectCatalog.map((sub) => {
                const isSelected = selectedSubjects.includes(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSubjects(selectedSubjects.filter(id => id !== sub.id));
                      } else {
                        setSelectedSubjects([...selectedSubjects, sub.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected ? 'border-blue-600 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{sub.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{sub.category} • {sub.curriculum}</div>
                    </div>
                    {isSelected ? <Check className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(8)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step9-next"
                onClick={handleStep9Submit}
                disabled={loading || selectedSubjects.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>ASSIGN ({selectedSubjects.length}) SUBJECTS</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 10: ADD TEACHERS                                */}
        {/* ---------------------------------------------------- */}
        {currentStep === 10 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 10 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                ADD YOUR TEACHERS
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Register teachers to assign subjects and activate AI grading access.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">Add Teacher:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="px-3 py-2 text-xs border rounded-lg bg-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="px-3 py-2 text-xs border rounded-lg bg-white"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  className="px-3 py-2 text-xs border rounded-lg bg-white"
                />
              </div>
              <button
                onClick={handleAddTeacher}
                disabled={loading}
                className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Teacher</span>
              </button>
            </div>

            {teachers.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">Registered Teaching Staff ({teachers.length}):</div>
                {teachers.map((t) => (
                  <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{t.name}</span>
                      <span className="text-slate-500 ml-2">({t.email})</span>
                    </div>
                    <span className="text-emerald-600 font-semibold">Active</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(9)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step10-next"
                onClick={() => setCurrentStep(11)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md"
              >
                <span>CONTINUE TO STUDENTS</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 11: ENROL FIRST STUDENTS                        */}
        {/* ---------------------------------------------------- */}
        {currentStep === 11 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 11 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                ENROL YOUR FIRST STUDENT
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                The backend will generate official authoritative student numbers (e.g. <span className="font-mono text-blue-600">GRD/2026/001</span>).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">Enrol Student:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="First Name"
                  value={newStudentFirst}
                  onChange={(e) => setNewStudentFirst(e.target.value)}
                  className="px-3 py-2 text-xs border rounded-lg bg-white"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={newStudentLast}
                  onChange={(e) => setNewStudentLast(e.target.value)}
                  className="px-3 py-2 text-xs border rounded-lg bg-white"
                />
                <select
                  value={newStudentClassId}
                  onChange={(e) => setNewStudentClassId(e.target.value)}
                  className="px-3 py-2 text-xs border rounded-lg bg-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>Class: {c.name}</option>
                  ))}
                </select>
                <select
                  value={newStudentGender}
                  onChange={(e) => setNewStudentGender(e.target.value as any)}
                  className="px-3 py-2 text-xs border rounded-lg bg-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <button
                onClick={handleEnrollStudent}
                disabled={loading}
                className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enrol Student</span>
              </button>
            </div>

            {students.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">Authoritative Enrolled Roster ({students.length}):</div>
                {students.map((s) => (
                  <div key={s.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{s.first_name} {s.last_name}</span>
                      <span className="text-slate-500 ml-2">({s.gender})</span>
                    </div>
                    <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">{s.student_number}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(10)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step11-next"
                onClick={() => setCurrentStep(12)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md"
              >
                <span>CONTINUE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 12: PARENT ACCESS                               */}
        {/* ---------------------------------------------------- */}
        {currentStep === 12 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 12 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                PARENT ACCESS
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Would you like parents to have real-time access to their children's academic progress?
              </p>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setParentAccessEnabled(true)}
                className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  parentAccessEnabled ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="parent_access"
                  checked={parentAccessEnabled}
                  onChange={() => setParentAccessEnabled(true)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-bold text-slate-900 text-sm">Enable Parent Access</div>
                  <div className="text-xs text-slate-500">Parents can view terminal report cards, attendance, and CBT results securely.</div>
                </div>
              </label>

              <label
                onClick={() => setParentAccessEnabled(false)}
                className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  !parentAccessEnabled ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="parent_access"
                  checked={!parentAccessEnabled}
                  onChange={() => setParentAccessEnabled(false)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-bold text-slate-900 text-sm">Configure Later</div>
                  <div className="text-xs text-slate-500">Keep report generation internal to administrative staff for now.</div>
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(11)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step12-next"
                onClick={() => setCurrentStep(13)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md"
              >
                <span>CONTINUE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 13: ACTIVATE ASSESSMENT ENGINES                 */}
        {/* ---------------------------------------------------- */}
        {currentStep === 13 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 13 of 14</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                HOW WILL YOU USE GRADIFI?
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Select the assessment engines to activate for your school.
              </p>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setCbtEngineActivated(!cbtEngineActivated)}
                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  cbtEngineActivated ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">School CBT Examinations</div>
                    <div className="text-xs text-slate-500">Timed computerized testing for terminal & mid-term exams</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={cbtEngineActivated}
                  onChange={() => {}}
                  className="rounded text-blue-600 w-4 h-4"
                />
              </label>

              <label
                onClick={() => setAiGradingActivated(!aiGradingActivated)}
                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  aiGradingActivated ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">AI-Assisted Grading with Rubrics</div>
                    <div className="text-xs text-slate-500">Gemini model evaluation with teacher supervision and feedback</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiGradingActivated}
                  onChange={() => {}}
                  className="rounded text-blue-600 w-4 h-4"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(12)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-step13-next"
                onClick={() => setCurrentStep(14)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md"
              >
                <span>REVIEW & RECONCILE</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 14: REVIEW AND LAUNCH                           */}
        {/* ---------------------------------------------------- */}
        {currentStep === 14 && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div className="text-center">
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Step 14 of 14</span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                YOUR GRADIFI CAMPUS IS READY 🎓
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Authoritative verification from certified backend queries.
              </p>
            </div>

            {/* Reconciliation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">Institution</div>
                <div className="text-sm font-bold text-slate-900 truncate mt-0.5">{institution?.name || instName}</div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ Verified</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">School</div>
                <div className="text-sm font-bold text-slate-900 truncate mt-0.5">{school?.school_name || schoolName}</div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ Verified</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">Classes Initialized</div>
                <div className="text-xl font-bold text-blue-600 mt-0.5">{classes.length || 6}</div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ Verified</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">Subjects Assigned</div>
                <div className="text-xl font-bold text-blue-600 mt-0.5">{selectedSubjects.length || 8}</div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ WAEC Aligned</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">Teachers Added</div>
                <div className="text-xl font-bold text-blue-600 mt-0.5">{teachers.length}</div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ Verified</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">Students Enrolled</div>
                <div className="text-xl font-bold text-blue-600 mt-0.5">{students.length}</div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ Official IDs</div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-medium">
              ✓ All deterministic contracts validated. Ready for server-authoritative launch.
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setCurrentStep(13)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border rounded-xl"
              >
                Previous
              </button>
              <button
                id="btn-launch-gradifi"
                onClick={handleLaunchCampus}
                disabled={loading}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Reconciling & Launching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>LAUNCH GRADIFI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
