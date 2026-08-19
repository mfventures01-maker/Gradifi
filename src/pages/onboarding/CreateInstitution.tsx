import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingService, InstitutionPayload, SchoolFormPayload, TeacherFormPayload, StudentFormPayload } from '../../services/onboardingService';
import { useInstitutionStore } from '../../store/useInstitutionStore';
import {
    Building,
    School as SchoolIcon,
    Layout,
    Users,
    UserPlus,
    CheckCircle,
    ChevronRight,
    AlertCircle,
    Loader2,
    MapPin,
    Mail,
    Phone,
    BookOpen,
    GraduationCap,
    ArrowRight,
    Trophy,
    Calendar,
    Hash
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type OnboardingState =
    | 'INIT'
    | 'INSTITUTION_CREATED'
    | 'SCHOOL_CREATED'
    | 'CLASSES_INITIALIZED'
    | 'SUBJECTS_ASSIGNED'
    | 'TEACHERS_CREATED'
    | 'STUDENTS_ENROLLED'
    | 'ONBOARDING_COMPLETE';

export const CreateInstitution: React.FC = () => {
    const navigate = useNavigate();
    const { setInstitutionId, setInstitutionType, setSchoolId } = useInstitutionStore();

    const [state, setState] = useState<OnboardingState>('INIT');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync state with backend on mount
    useEffect(() => {
        const syncState = async () => {
            const storedInstitutionId = localStorage.getItem('institutionId');
            if (!storedInstitutionId) {
                setLoading(false);
                return;
            }

            try {
                const status = await onboardingService.getOnboardingStatus(storedInstitutionId);

                if (status.hasStudents) setState('ONBOARDING_COMPLETE');
                else if (status.hasTeachers) setState('TEACHERS_CREATED');
                else if (status.hasClasses) {
                    // Check if subjects are initialized
                    const subjects = await onboardingService.getClassSubjects(status.schoolId || storedInstitutionId);
                    if (subjects.length > 0) {
                        setClassSubjects(subjects);
                        setState('SUBJECTS_ASSIGNED');
                    } else {
                        setState('CLASSES_INITIALIZED');
                    }
                    const classList = await onboardingService.getClasses(status.schoolId || storedInstitutionId);
                    setClasses(classList);
                }
                else if (status.hasSchool) setState('SCHOOL_CREATED');
                else setState('INSTITUTION_CREATED');

                if (status.schoolId) {
                    setLocalSchoolId(status.schoolId);
                    setSchoolId(status.schoolId);
                }
            } catch (err) {
                console.error("ONBOARDING_SYNC_FAILURE:", err);
            } finally {
                setLoading(false);
            }
        };

        syncState();
    }, []);

    // Form Data
    const [institutionData, setInstitutionData] = useState<InstitutionPayload>({
        institution_name: '',
        institution_type: 'secondary_school',
        country: 'Nigeria',
        state: '',
        admin_email: '',
        password: ''
    });

    const [schoolId, setLocalSchoolId] = useState<string | null>(null);
    const [schoolData, setSchoolData] = useState<SchoolFormPayload>({
        institution_id: '',
        school_name: '',
        school_type: 'Secondary',
        address: ''
    });

    const [teacherData, setTeacherData] = useState<TeacherFormPayload>({
        school_id: '',
        name: '',
        email: '',
        phone: ''
    });

    const [studentData, setStudentData] = useState<StudentFormPayload>({
        class_id: '',
        first_name: '',
        last_name: '',
        gender: 'Male',
        student_number: '',
        date_of_birth: ''
    });

    const [classes, setClasses] = useState<any[]>([]);
    const [classSubjects, setClassSubjects] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

    // Step Progress
    const steps = [
        { id: 'INIT', label: 'Institution', icon: Building },
        { id: 'INSTITUTION_CREATED', label: 'School', icon: SchoolIcon },
        { id: 'SCHOOL_CREATED', label: 'Classes', icon: Layout },
        { id: 'CLASSES_INITIALIZED', label: 'Subjects', icon: BookOpen },
        { id: 'SUBJECTS_ASSIGNED', label: 'Teachers', icon: Users },
        { id: 'TEACHERS_CREATED', label: 'Students', icon: UserPlus },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === state);

    // Actions
    const handleCreateInstitution = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent double execution if already submitting
        if (isSubmitting) return;

        // Lock the UI immediately
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await onboardingService.createInstitutionAccount(institutionData);
            setInstitutionId(result.institution_id);
            setInstitutionType(institutionData.institution_type as any);
            setSchoolData(prev => ({ ...prev, institution_id: result.institution_id }));
            setState('INSTITUTION_CREATED');
        } catch (err: any) {
            setError(err.message || 'Failed to create institution');
        } finally {
            // IMPORTANT: Unlock the UI once the request finishes (success or failure)
            setIsSubmitting(false);
        }
    };

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const school = await onboardingService.createSchool(schoolData);
            setLocalSchoolId(school.id);
            setSchoolId(school.id);
            setState('SCHOOL_CREATED');
        } catch (err: any) {
            setError(err.message || 'Failed to create school');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInitializeClasses = async () => {
        if (!schoolId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onboardingService.initializeSecondaryClasses(schoolId);
            const classList = await onboardingService.getClasses(schoolId);
            setClasses(classList);
            setState('CLASSES_INITIALIZED');
        } catch (err: any) {
            setError(err.message || 'Failed to initialize classes');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInitializeSubjects = async () => {
        if (!schoolId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onboardingService.initializeClassSubjects(schoolId);
            const subjects = await onboardingService.getClassSubjects(schoolId);
            setClassSubjects(subjects);
            setState('SUBJECTS_ASSIGNED');
        } catch (err: any) {
            if (err.message?.includes('duplicate')) {
                const subjects = await onboardingService.getClassSubjects(schoolId);
                setClassSubjects(subjects);
                setState('SUBJECTS_ASSIGNED');
            } else {
                setError(err.message || 'Failed to initialize subjects');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId || !selectedSubjectId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onboardingService.createTeacher({
                name: teacherData.name,
                email: teacherData.email,
                phone: teacherData.phone,
                school_id: schoolId,
                class_subject_id: selectedSubjectId || undefined
            });
            setState('TEACHERS_CREATED');
        } catch (err: any) {
            setError(err.message || 'Failed to create teacher');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEnrollStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const student = await onboardingService.enrollStudent(studentData);
            await onboardingService.enrollStudentSubjects(student.student_id);
            setState('ONBOARDING_COMPLETE');
        } catch (err: any) {
            setError(err.message || 'Failed to enroll student');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-between mb-12 px-2 max-w-4xl mx-auto overflow-x-auto pb-4">
            {(steps ?? []).map((step, idx) => {
                const isCompleted = steps.findIndex(s => s.id === state) > idx || (state === 'ONBOARDING_COMPLETE');
                const isActive = step.id === state;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex flex-col items-center relative group min-w-[100px]">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                            isActive ? "bg-blue-600 text-white scale-110 -rotate-3" :
                                isCompleted ? "bg-green-500 text-white" : "bg-white text-slate-400 border border-slate-200"
                        )}>
                            {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                        </div>
                        <span className={cn(
                            "mt-3 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                            isActive ? "text-blue-600" : "text-slate-400"
                        )}>
                            {step.label}
                        </span>
                        {idx < steps.length - 1 && (
                            <div className={cn(
                                "hidden md:block absolute top-6 left-full w-full h-[2px] -z-10",
                                isCompleted ? "bg-green-500" : "bg-slate-200"
                            )} style={{ width: 'calc(100% - 3rem)' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );

    if (state === 'ONBOARDING_COMPLETE') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white">
                <div className="max-w-md w-full bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white text-center">
                    <div className="w-24 h-24 bg-green-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-green-500/20 rotate-6">
                        <Trophy className="w-12 h-12" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Onboarding Complete!</h1>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Your institution and school environment are now synchronized with the SEFAES core.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-2xl font-bold text-slate-900">1</p>
                            <p className="text-xs text-slate-500 font-medium">Students</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-2xl font-bold text-slate-900">1</p>
                            <p className="text-xs text-slate-500 font-medium">Teachers</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-2xl font-bold text-slate-900">{classes.length || '6'}</p>
                            <p className="text-xs text-slate-500 font-medium">Classes</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-2xl font-bold text-slate-900">{classSubjects.length || '96'}</p>
                            <p className="text-xs text-slate-500 font-medium">Subjects</p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(`/portal/${institutionData.institution_type}/dashboard`)}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 group"
                    >
                        Go to Dashboard
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-6 lg:px-8 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-50/50 via-slate-50 to-white">
            <div className="max-w-4xl mx-auto">
                {renderStepIndicator()}

                <div className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-[3rem] border border-white p-8 md:p-12 transition-all duration-500">
                    {error && (
                        <div className="mb-8 flex items-start bg-red-50 p-4 rounded-2xl border border-red-100 text-red-800 text-sm font-medium animate-in fade-in slide-in-from-top-4">
                            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}

                    {state === 'INIT' && (
                        <form onSubmit={handleCreateInstitution} className="space-y-6 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 mb-2">Institution Details</h2>
                                <p className="text-slate-500 mb-8">Let's start by creating your educational institution account.</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Institution Name</label>
                                    <div className="relative group">
                                        <Building className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            required
                                            className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            value={institutionData.institution_name}
                                            onChange={e => setInstitutionData({ ...institutionData, institution_name: e.target.value })}
                                            placeholder="e.g. Lagos City Academy"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Institution Type</label>
                                    <select
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={institutionData.institution_type}
                                        onChange={e => setInstitutionData({ ...institutionData, institution_type: e.target.value })}
                                    >
                                        <option value="secondary_school">Secondary School</option>
                                        <option value="university">University</option>
                                        <option value="corporate">Corporate</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">State</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            value={institutionData.state}
                                            onChange={e => setInstitutionData({ ...institutionData, state: e.target.value })}
                                            placeholder="e.g. Lagos"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Admin Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            value={institutionData.admin_email}
                                            onChange={e => setInstitutionData({ ...institutionData, admin_email: e.target.value })}
                                            placeholder="admin@school.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Admin Password</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={institutionData.password}
                                        onChange={e => setInstitutionData({ ...institutionData, password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full md:w-auto px-12 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Creating Institution...
                                        </>
                                    ) : (
                                        <>
                                            Create Account
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {state === 'INSTITUTION_CREATED' && (
                        <form onSubmit={handleCreateSchool} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 mb-2">School Setup</h2>
                                <p className="text-slate-500 mb-8">Setup your first school within this institution.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">School Name</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={schoolData.school_name}
                                        onChange={e => setSchoolData({ ...schoolData, school_name: e.target.value })}
                                        placeholder="e.g. South Campus"
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1">School Type</label>
                                        <select
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            value={schoolData.school_type}
                                            onChange={e => setSchoolData({ ...schoolData, school_type: e.target.value as any })}
                                        >
                                            <option value="Secondary">Secondary</option>
                                            <option value="Primary">Primary</option>
                                        </select>
                                </div>
                                <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Address</label>
                                        <input
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            value={schoolData.address}
                                            onChange={e => setSchoolData({ ...schoolData, address: e.target.value })}
                                            placeholder="123 Education Way"
                                        />
                                    </div>
                                </div>
                                </div>
                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || loading}
                                    className="w-full md:w-auto px-12 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-70 group"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Continue'}
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </form>
                    )}

                    {state === 'SCHOOL_CREATED' && (
                        <div className="text-center py-12 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-8">
                                <Layout className="w-10 h-10" />
                </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4">Initialize Academic Ladder</h2>
                            <p className="text-slate-600 mb-10 max-w-md mx-auto">
                                The system will automatically generate the Nigerian secondary class ladder (JSS1 - SS3) for your school.
                            </p>
                            <button
                                onClick={handleInitializeClasses}
                                disabled={isSubmitting || loading}
                                className="px-12 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-70 mx-auto group"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Initialize Classes'}
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
            </div>
                    )}

                    {state === 'CLASSES_INITIALIZED' && (
                        <div className="text-center py-12 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="w-20 h-20 bg-indigo-100 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-8">
                                <BookOpen className="w-10 h-10" />
        </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4">Populate Subject System</h2>
                            <p className="text-slate-600 mb-10 max-w-md mx-auto">
                                We will map over 150+ subjects from the national catalog to your new classes automatically.
                            </p>
                            <button
                                onClick={handleInitializeSubjects}
                                disabled={isSubmitting || loading}
                                className="px-12 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-70 mx-auto group"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Initialize Subjects'}
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {state === 'SUBJECTS_ASSIGNED' && (
                        <form onSubmit={handleCreateTeacher} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 mb-2">Create Lead Teacher</h2>
                                <p className="text-slate-500 mb-8">Register the first teacher and assign their specialization.</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={teacherData.name}
                                        onChange={e => setTeacherData({ ...teacherData, name: e.target.value })}
                                        placeholder="Dr. Sarah Johnson"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={teacherData.email}
                                        onChange={e => setTeacherData({ ...teacherData, email: e.target.value })}
                                        placeholder="sarah@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Class Assignment</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={selectedSubjectId}
                                        onChange={e => setSelectedSubjectId(e.target.value)}
                                    >
                                        <option value="">Select a Subject Mapping</option>
                                        {(classSubjects ?? []).map((cs: any) => (
                                            <option key={cs.id} value={cs.id}>
                                                {cs.subject_catalog?.name || 'Subject'} ({cs.classes?.name || 'Class'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Phone</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={teacherData.phone}
                                        onChange={e => setTeacherData({ ...teacherData, phone: e.target.value })}
                                        placeholder="+234..."
                                    />
                                </div>
                            </div>
                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || loading}
                                    className="w-full md:w-auto px-12 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-70 group"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Create Teacher'}
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </form>
                    )}

                    {state === 'TEACHERS_CREATED' && (
                        <form onSubmit={handleEnrollStudent} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 mb-2">Enroll First Student</h2>
                                <p className="text-slate-500 mb-8">Add the first student to finalize the system synchronization.</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">First Name</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={studentData.first_name}
                                        onChange={e => setStudentData({ ...studentData, first_name: e.target.value })}
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Last Name</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={studentData.last_name}
                                        onChange={e => setStudentData({ ...studentData, last_name: e.target.value })}
                                        placeholder="Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Class</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={studentData.class_id}
                                        onChange={e => setStudentData({ ...studentData, class_id: e.target.value })}
                                    >
                                        <option value="">Select a Class</option>
                                        {(classes ?? []).map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Gender</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 px-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        value={studentData.gender}
                                        onChange={e => setStudentData({ ...studentData, gender: e.target.value as any })}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Student Number</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            value={studentData.student_number}
                                            onChange={e => setStudentData({ ...studentData, student_number: e.target.value })}
                                            placeholder="STU-2024-001"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Date of Birth</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="date"
                                            className="w-full bg-slate-50 border-0 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            value={studentData.date_of_birth}
                                            onChange={e => setStudentData({ ...studentData, date_of_birth: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || loading}
                                    className="w-full md:w-auto px-12 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-70 group"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Complete Enrollment'}
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateInstitution;


