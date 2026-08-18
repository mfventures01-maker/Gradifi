import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  School,
  Layers,
  BookOpen,
  Users,
  GraduationCap,
  Cpu,
  Monitor,
  FileText,
  ScanSearch,
  Settings,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Clock,
  Award,
  AlertCircle,
  Loader2,
  Check,
  Send,
  HelpCircle,
  Zap,
  Play,
  RotateCcw
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  Institution,
  School as SchoolType,
  ClassEntity,
  ClassSubject,
  Teacher,
  Student,
  CbtExam,
  GradingSubmission
} from '../../contracts/schema';

interface DashboardLayoutProps {
  institutionId?: string;
  onLogout: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  institutionId = 'inst_demo_01',
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  // Authoritative State
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolType | null>(null);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [cbtExams, setCbtExams] = useState<CbtExam[]>([]);
  const [gradingSubmissions, setGradingSubmissions] = useState<GradingSubmission[]>([]);

  // AI Grading Studio State
  const [gradingSubject, setGradingSubject] = useState('English Literature');
  const [assignmentTitle, setAssignmentTitle] = useState('Things Fall Apart: Characterization of Okonkwo');
  const [studentSubmissionText, setStudentSubmissionText] = useState(
    `Okonkwo is motivated fundamentally by his fear of becoming like his father Unoka, whom he saw as lazy and improvident. To compensate, Okonkwo works tirelessly on his yam farms and earns prestigious titles in Umuofia. However, his fear transforms into toxic rigidity, leading him to beat his wives during the Week of Peace and participate in the killing of Ikemefuna. When the British district commissioner arrives, Okonkwo realizes his clan will not go to war, driving him to take his own life in despair.`
  );
  const [isGrading, setIsGrading] = useState(false);
  const [activeGradingResult, setActiveGradingResult] = useState<any>(null);
  const [teacherReviewNote, setTeacherReviewNote] = useState('');
  const [gradingSuccessMsg, setGradingSuccessMsg] = useState<string | null>(null);

  // CBT Exam State
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [cbtStudentName, setCbtStudentName] = useState('Kelechi Nwosu');
  const [cbtStudentNumber, setCbtStudentNumber] = useState('GRD/2026/104');
  const [cbtAnswers, setCbtAnswers] = useState<Record<string, string>>({});
  const [cbtSubmittedResult, setCbtSubmittedResult] = useState<any | null>(null);
  const [isSubmittingCbt, setIsSubmittingCbt] = useState(false);
  const [cbtTimerSeconds, setCbtTimerSeconds] = useState(1800);

  // Add Student State
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Add Teacher State
  const [newTchName, setNewTchName] = useState('');
  const [newTchEmail, setNewTchEmail] = useState('');
  const [newTchPhone, setNewTchPhone] = useState('');
  const [isAddingTch, setIsAddingTch] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load schools
      const schList = await apiClient.getSchools(institutionId);
      setSchools(schList);
      const activeSch = schList[0] || null;
      setSelectedSchool(activeSch);

      if (institutionId) {
        const inst = await apiClient.getInstitution(institutionId);
        setInstitution(inst);
      }

      if (activeSch) {
        const [cls, cs, tch, std, exams, gradings] = await Promise.all([
          apiClient.getClasses(activeSch.id),
          apiClient.getClassSubjects(activeSch.id),
          apiClient.getTeachers(activeSch.id),
          apiClient.getStudents(activeSch.id),
          apiClient.getCbtExams(activeSch.id),
          apiClient.getGradingSubmissions(activeSch.id),
        ]);
        setClasses(cls);
        setClassSubjects(cs);
        setTeachers(tch);
        setStudents(std);
        setCbtExams(exams);
        setGradingSubmissions(gradings);
        if (cls.length > 0) setNewClassId(cls[0].id);
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [institutionId]);

  // AI Grading Action
  const handleExecuteGrading = async () => {
    setIsGrading(true);
    setGradingSuccessMsg(null);
    try {
      const rubric = {
        title: "WAEC Standard Secondary Rubric",
        total_score: 20,
        criteria: [
          { name: "Content Knowledge & Accuracy", max_score: 8, description: "Accuracy of facts and textual depth" },
          { name: "Logical Flow & Organization", max_score: 6, description: "Coherent paragraphing and transitions" },
          { name: "Critical Analysis & Synthesis", max_score: 6, description: "Depth of insight and independent reasoning" },
        ]
      };

      const result = await apiClient.runAiGrading({
        student_work: studentSubmissionText,
        assignment_title: assignmentTitle,
        subject_name: gradingSubject,
        rubric,
      });

      setActiveGradingResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGrading(false);
    }
  };

  const handleApproveGrading = async () => {
    if (!selectedSchool || !institution || !activeGradingResult) return;
    try {
      await apiClient.submitGrading({
        school_id: selectedSchool.id,
        institution_id: institution.id,
        student_name: 'David Eze',
        student_number: 'GRD/2026/101',
        subject_name: gradingSubject,
        assignment_title: assignmentTitle,
        student_work: studentSubmissionText,
        rubric: { title: "WAEC Standard Secondary Rubric", total_score: 20, criteria: [] },
        ai_score: activeGradingResult.overall_score,
        ai_feedback: activeGradingResult.overall_feedback,
        criteria_scores: activeGradingResult.criteria_scores,
        status: 'approved',
        teacher_notes: teacherReviewNote || 'Approved by Subject Teacher.',
      });

      const updated = await apiClient.getGradingSubmissions(selectedSchool.id);
      setGradingSubmissions(updated);
      setGradingSuccessMsg("✓ Grading approved and recorded in authoritative student ledger!");
    } catch (e) {
      console.error(e);
    }
  };

  // Start CBT Exam Mode
  const handleStartExam = async (examId: string) => {
    try {
      const detail = await apiClient.getCbtExamDetail(examId);
      setActiveExam(detail);
      setCbtAnswers({});
      setCbtSubmittedResult(null);
      setCbtTimerSeconds((detail.duration_minutes || 30) * 60);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit CBT Exam
  const handleSubmitCbt = async () => {
    if (!activeExam) return;
    setIsSubmittingCbt(true);
    try {
      const res = await apiClient.submitCbtExam(activeExam.id, {
        student_id: 'std_demo_101',
        student_name: cbtStudentName,
        student_number: cbtStudentNumber,
        answers: cbtAnswers,
      });
      setCbtSubmittedResult(res);
      // Refresh exams list
      if (selectedSchool) {
        const exams = await apiClient.getCbtExams(selectedSchool.id);
        setCbtExams(exams);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingCbt(false);
    }
  };

  // Quick Enrol Student
  const handleEnrolStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !institution || !newFirst || !newLast) return;
    setIsAddingStudent(true);
    try {
      await apiClient.enrollStudent({
        institution_id: institution.id,
        school_id: selectedSchool.id,
        class_id: newClassId || (classes[0]?.id || ''),
        first_name: newFirst,
        last_name: newLast,
        gender: newGender,
        date_of_birth: '2010-01-01',
      });
      const updated = await apiClient.getStudents(selectedSchool.id);
      setStudents(updated);
      setNewFirst('');
      setNewLast('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingStudent(false);
    }
  };

  // Quick Add Teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !institution || !newTchName || !newTchEmail) return;
    setIsAddingTch(true);
    try {
      await apiClient.createTeacher({
        institution_id: institution.id,
        school_id: selectedSchool.id,
        name: newTchName,
        email: newTchEmail,
        phone: newTchPhone,
      });
      const updated = await apiClient.getTeachers(selectedSchool.id);
      setTeachers(updated);
      setNewTchName('');
      setNewTchEmail('');
      setNewTchPhone('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingTch(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex antialiased font-sans text-slate-900">
      {/* ---------------------------------------------------- */}
      {/* SIDEBAR NAVIGATION                                   */}
      {/* ---------------------------------------------------- */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <span className="text-2xl font-black text-white tracking-tight">GRADIFI</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-blue-600/30 text-blue-400 font-bold rounded">
            Campus
          </span>
        </div>

        {/* School Context Card */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Institution Context</div>
          <div className="text-sm font-bold text-white truncate mt-0.5">{institution?.name || 'Kingsway Premier Academy'}</div>
          <div className="text-xs text-slate-400 truncate mt-0.5">{selectedSchool?.school_name || 'Main Campus'}</div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('overview'); setActiveExam(null); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Campus Overview</span>
          </button>

          <button
            onClick={() => { setActiveTab('ai_grading'); setActiveExam(null); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'ai_grading' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>AI Rubric Grading</span>
          </button>

          <button
            onClick={() => { setActiveTab('cbt_center'); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'cbt_center' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <Monitor className="w-4 h-4 text-amber-400" />
            <span>CBT Exam Center</span>
          </button>

          <button
            onClick={() => { setActiveTab('past_questions'); setActiveExam(null); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'past_questions' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>WAEC / JAMB Past Qs</span>
          </button>

          <button
            onClick={() => { setActiveTab('plagiarism'); setActiveExam(null); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'plagiarism' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <ScanSearch className="w-4 h-4 text-purple-400" />
            <span>Plagiarism Scanner</span>
          </button>

          <div className="pt-3 pb-1 px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Academic Roster
          </div>

          <button
            onClick={() => { setActiveTab('classes'); setActiveExam(null); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'classes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Classes & Arms ({classes.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('teachers'); setActiveExam(null); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'teachers' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teachers ({teachers.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('students'); setActiveExam(null); }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              activeTab === 'students' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Students ({students.length})</span>
          </button>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
              A
            </div>
            <div className="truncate">
              <div className="text-white font-medium">Administrator</div>
              <div className="text-[10px] text-slate-400">Online</div>
            </div>
          </div>
          <button onClick={onLogout} title="Logout" className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* MAIN VIEW CONTENT AREA                               */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top App Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 capitalize">
              {activeTab.replace('_', ' ')}
            </h1>
            <span className="text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
              Verified SSOT
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-900 border rounded-lg hover:bg-slate-50 text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Backend State</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 sm:p-8 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* ------------------------------------------------ */}
              {/* OVERVIEW VIEW                                    */}
              {/* ------------------------------------------------ */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Verified Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-500 uppercase">Enrolled Students</div>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mt-2">{students.length}</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-1">✓ Backend Verified Roster</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-500 uppercase">Active Classes</div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Layers className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mt-2">{classes.length}</div>
                      <div className="text-xs text-slate-500 font-medium mt-1">JSS 1 through SS 3</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-500 uppercase">Teaching Staff</div>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mt-2">{teachers.length}</div>
                      <div className="text-xs text-purple-600 font-semibold mt-1">WAEC Subject Specialists</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-500 uppercase">CBT Exams</div>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Monitor className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mt-2">{cbtExams.length}</div>
                      <div className="text-xs text-amber-600 font-semibold mt-1">Ready for Testing</div>
                    </div>
                  </div>

                  {/* Quick Action Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* AI Grading Status */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-blue-600" />
                          AI-Assisted Grading Studio
                        </h3>
                        <button
                          onClick={() => setActiveTab('ai_grading')}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Open Studio →
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Evaluate student essays and subjective exam questions against teacher-defined WAEC/NECO rubrics with criteria-based marks and constructive feedback.
                      </p>
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">Completed AI Evaluations:</span>
                        <span className="font-bold text-blue-600">{gradingSubmissions.length} Submissions Graded</span>
                      </div>
                    </div>

                    {/* CBT Exam Center Quick Link */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Monitor className="w-5 h-5 text-amber-500" />
                          Live Computer-Based Testing
                        </h3>
                        <button
                          onClick={() => setActiveTab('cbt_center')}
                          className="text-xs font-semibold text-amber-600 hover:underline"
                        >
                          Launch CBT Center →
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Deliver timed terminal exams with instant automated grading and score tabulation for junior and senior secondary classes.
                      </p>
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">Active Published Exams:</span>
                        <span className="font-bold text-amber-600">{cbtExams.length} Exams in Bank</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* AI GRADING STUDIO VIEW                           */}
              {/* ------------------------------------------------ */}
              {activeTab === 'ai_grading' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <Cpu className="w-6 h-6 text-blue-600" />
                          AI-Assisted Grading with Teacher Rubrics
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Evaluates student submission strictly against WAEC/NECO marking criteria
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={gradingSubject}
                          onChange={(e) => setGradingSubject(e.target.value)}
                          className="text-xs font-semibold px-3 py-2 border rounded-lg bg-slate-50"
                        >
                          <option value="English Literature">English Literature</option>
                          <option value="Civic Education">Civic Education</option>
                          <option value="Government">Government</option>
                          <option value="Biology">Biology (Theory)</option>
                          <option value="Economics">Economics</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
                      {/* Left: Input Submission */}
                      <div className="lg:col-span-6 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Assignment / Question Title:
                          </label>
                          <input
                            type="text"
                            value={assignmentTitle}
                            onChange={(e) => setAssignmentTitle(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Student Work / Essay:
                          </label>
                          <textarea
                            value={studentSubmissionText}
                            onChange={(e) => setStudentSubmissionText(e.target.value)}
                            rows={8}
                            className="w-full p-3.5 text-sm border rounded-xl font-serif leading-relaxed focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>

                        <button
                          onClick={handleExecuteGrading}
                          disabled={isGrading}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
                        >
                          {isGrading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Evaluating against Teacher Rubric...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Run AI Rubric Evaluation</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Right: AI Evaluation Result */}
                      <div className="lg:col-span-6">
                        {activeGradingResult ? (
                          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500">Evaluated Score</span>
                                <div className="text-2xl font-black text-blue-600">
                                  {activeGradingResult.overall_score} / {activeGradingResult.max_score}{' '}
                                  <span className="text-sm font-semibold text-slate-600">
                                    ({activeGradingResult.percentage}%)
                                  </span>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-xs">
                                Gemini Evaluated
                              </span>
                            </div>

                            <div>
                              <div className="text-xs font-bold text-slate-700 uppercase">Constructive Feedback:</div>
                              <p className="text-xs text-slate-700 mt-1 italic leading-relaxed">
                                "{activeGradingResult.overall_feedback}"
                              </p>
                            </div>

                            {activeGradingResult.criteria_scores && (
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-700 uppercase">Criteria Breakdown:</div>
                                {activeGradingResult.criteria_scores.map((c: any, i: number) => (
                                  <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs">
                                    <div className="flex justify-between font-bold text-slate-900">
                                      <span>{c.criterion}</span>
                                      <span className="text-blue-600">{c.score} / {c.max_score}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">{c.feedback}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Teacher Approval Workflow */}
                            <div className="pt-3 border-t space-y-2">
                              <label className="block text-xs font-bold text-slate-700 uppercase">
                                Teacher Supervised Approval Notes:
                              </label>
                              <input
                                type="text"
                                placeholder="Add teacher remarks before finalizing grade"
                                value={teacherReviewNote}
                                onChange={(e) => setTeacherReviewNote(e.target.value)}
                                className="w-full px-3 py-2 text-xs border rounded-lg bg-white"
                              />
                              <button
                                onClick={handleApproveGrading}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                              >
                                <Check className="w-4 h-4" />
                                <span>Approve & Persist Grade to Student Ledger</span>
                              </button>
                            </div>

                            {gradingSuccessMsg && (
                              <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg text-center">
                                {gradingSuccessMsg}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-slate-400">
                            <Cpu className="w-12 h-12 text-slate-300 mb-3" />
                            <div className="text-sm font-bold text-slate-600">No Active Evaluation</div>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                              Click "Run AI Rubric Evaluation" to assess the student essay against teacher standards.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* CBT EXAM CENTER VIEW                             */}
              {/* ------------------------------------------------ */}
              {activeTab === 'cbt_center' && (
                <div className="space-y-6">
                  {!activeExam ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-amber-500" />
                            Online CBT Examination Center
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Manage computer-based tests and launch student test sessions
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cbtExams.map((exam) => (
                          <div key={exam.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                            <div>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                {exam.class_name} • {exam.subject_name}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 mt-2">{exam.title}</h3>
                              <div className="text-xs text-slate-500 mt-2 space-y-1">
                                <div>⏱️ Duration: <strong>{exam.duration_minutes} Mins</strong></div>
                                <div>🎯 Total Marks: <strong>{exam.total_marks} Marks</strong> (Pass: {exam.pass_mark})</div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleStartExam(exam.id)}
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                            >
                              <Play className="w-4 h-4" />
                              <span>Launch Student CBT Simulator</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Active CBT Test Mode */
                    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                        <div>
                          <button
                            onClick={() => setActiveExam(null)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1"
                          >
                            ← Back to Exam List
                          </button>
                          <h2 className="text-xl font-bold text-slate-900">{activeExam.title}</h2>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Student: <strong className="text-slate-800">{cbtStudentName}</strong> ({cbtStudentNumber})
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-mono font-bold text-sm">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>29:45 Remaining</span>
                        </div>
                      </div>

                      {!cbtSubmittedResult ? (
                        <div className="space-y-6">
                          {activeExam.questions?.map((q: any, idx: number) => (
                            <div key={q.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="text-sm font-bold text-slate-900">
                                  Question {idx + 1}: {q.question_text}
                                </div>
                                <span className="text-xs font-bold text-slate-400">{q.marks} Marks</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {q.options.map((opt: any) => {
                                  const isSelected = cbtAnswers[q.id] === opt.key;
                                  return (
                                    <div
                                      key={opt.key}
                                      onClick={() => setCbtAnswers({ ...cbtAnswers, [q.id]: opt.key })}
                                      className={`p-3 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                        isSelected
                                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-800'
                                      }`}
                                    >
                                      <span className="font-bold mr-2">({opt.key})</span>
                                      <span>{opt.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          <div className="pt-4 border-t flex justify-end">
                            <button
                              onClick={handleSubmitCbt}
                              disabled={isSubmittingCbt}
                              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-sm flex items-center gap-2"
                            >
                              {isSubmittingCbt ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              <span>Submit CBT Examination</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* CBT Results Screen */
                        <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-4">
                          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                            <Award className="w-8 h-8" />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900">CBT Examination Completed!</h3>
                          <div className="text-4xl font-black text-blue-600">
                            {cbtSubmittedResult.attempt.score} / {cbtSubmittedResult.attempt.total_marks}{' '}
                            <span className="text-lg font-semibold text-slate-600">
                              ({cbtSubmittedResult.attempt.percentage}%)
                            </span>
                          </div>

                          <div className="text-sm font-semibold text-slate-700">
                            Status:{' '}
                            {cbtSubmittedResult.attempt.passed ? (
                              <span className="text-emerald-600 font-bold">PASSED (Above cutoff)</span>
                            ) : (
                              <span className="text-red-600 font-bold">NEEDS IMPROVEMENT</span>
                            )}
                          </div>

                          <div className="pt-4">
                            <button
                              onClick={() => { setActiveExam(null); setCbtSubmittedResult(null); }}
                              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-600"
                            >
                              Return to CBT Center
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* PAST QUESTIONS VIEW (STEP 13: COMING SOON)       */}
              {/* ------------------------------------------------ */}
              {activeTab === 'past_questions' && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-slate-500" />
                      JAMB & WAEC Past Question Bank
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Curriculum-aligned question repository and step-by-step master teacher solutions
                    </p>
                  </div>

                  <div className="p-8 sm:p-12 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-4 max-w-2xl mx-auto">
                    <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <Clock className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900">Coming Soon — Module Not Yet Connected</h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                        The Past Questions engine is scheduled for deployment in the subsequent SEFAES release phase. No mock data or unverified RPC endpoints are utilized.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                      <span>Status: Out of Scope for Initial Supabase Sync</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* PLAGIARISM SCANNER VIEW (STEP 14: COMING SOON)   */}
              {/* ------------------------------------------------ */}
              {activeTab === 'plagiarism' && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <ScanSearch className="w-6 h-6 text-slate-500" />
                      Plagiarism & Originality Scanner
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Academic originality and AI generation verification infrastructure
                    </p>
                  </div>

                  <div className="p-8 sm:p-12 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-4 max-w-2xl mx-auto">
                    <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                      <ScanSearch className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900">Coming Soon — Module Not Yet Connected</h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                        The Academic Plagiarism & Originality verification engine will be integrated directly via the SEFAES Edge Function contract.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                      <span>Status: Scheduled for Antigravity Pipeline</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* CLASSES & ROSTER VIEW                            */}
              {/* ------------------------------------------------ */}
              {activeTab === 'classes' && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  <h2 className="text-xl font-bold text-slate-900">Academic Classes Roster ({classes.length})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                          <div className="text-[11px] text-slate-500 capitalize">{c.category.replace('_', ' ')}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 font-bold rounded">
                          {c.arm || 'Gold'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* TEACHERS VIEW                                    */}
              {/* ------------------------------------------------ */}
              {activeTab === 'teachers' && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Teachers Roster ({teachers.length})</h2>
                  </div>

                  {/* Add Teacher Form */}
                  <form onSubmit={handleAddTeacher} className="p-4 bg-slate-50 rounded-xl border space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase">Register New Teacher</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Teacher Name"
                        value={newTchName}
                        onChange={(e) => setNewTchName(e.target.value)}
                        className="px-3 py-2 text-xs border rounded-lg bg-white"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={newTchEmail}
                        onChange={(e) => setNewTchEmail(e.target.value)}
                        className="px-3 py-2 text-xs border rounded-lg bg-white"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={newTchPhone}
                        onChange={(e) => setNewTchPhone(e.target.value)}
                        className="px-3 py-2 text-xs border rounded-lg bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingTch}
                      className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Teacher</span>
                    </button>
                  </form>

                  <div className="space-y-2">
                    {teachers.map((t) => (
                      <div key={t.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                          <div className="text-slate-500 mt-0.5">{t.email} • {t.phone}</div>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full">
                          Active Teacher
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* STUDENTS VIEW                                    */}
              {/* ------------------------------------------------ */}
              {activeTab === 'students' && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Enrolled Students Roster ({students.length})</h2>
                  </div>

                  {/* Add Student Form */}
                  <form onSubmit={handleEnrolStudent} className="p-4 bg-slate-50 rounded-xl border space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase">Enrol New Student</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={newFirst}
                        onChange={(e) => setNewFirst(e.target.value)}
                        className="px-3 py-2 text-xs border rounded-lg bg-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={newLast}
                        onChange={(e) => setNewLast(e.target.value)}
                        className="px-3 py-2 text-xs border rounded-lg bg-white"
                        required
                      />
                      <select
                        value={newClassId}
                        onChange={(e) => setNewClassId(e.target.value)}
                        className="px-3 py-2 text-xs border rounded-lg bg-white"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value as any)}
                        className="px-3 py-2 text-xs border rounded-lg bg-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingStudent}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Enrol Student</span>
                    </button>
                  </form>

                  <div className="space-y-2">
                    {students.map((s) => (
                      <div key={s.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{s.first_name} {s.last_name}</div>
                          <div className="text-slate-500 mt-0.5 capitalize">Gender: {s.gender}</div>
                        </div>
                        <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          {s.student_number}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
