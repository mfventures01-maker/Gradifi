import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HomePage } from './pages/home/HomePage';
import { CreateInstitution } from './pages/onboarding/CreateInstitution';
import { CreateTeacher } from './pages/onboarding/CreateTeacher';
import { CreateStudent } from './pages/onboarding/CreateStudent';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';
import { AuthGuard } from './components/AuthGuard';

import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { PrincipalDashboard } from './pages/principal/PrincipalDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ParentDashboard } from './pages/parent/ParentDashboard';
import { BursarDashboard } from './pages/bursar/BursarDashboard';
import { VPDashboard } from './pages/vp/VPDashboard';

export type AppView = 
  | 'home' 
  | 'onboarding' 
  | 'dashboard' 
  | 'create-institution' 
  | 'create-teacher' 
  | 'create-student'
  | 'auth'
  | 'portal-teacher'
  | 'portal-principal'
  | 'portal-student'
  | 'portal-parent'
  | 'portal-bursar'
  | 'portal-vp';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [activeInstitutionId, setActiveInstitutionId] = useState<string>('inst_demo_01');
  const [activeSchoolId, setActiveSchoolId] = useState<string>('sch_demo_01');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as AppView;
    const pageParam = params.get('page');
    const stepParam = parseInt(params.get('step') || '1', 10);
    const instParam = params.get('inst_id');
    const schParam = params.get('school_id');

    if (location.pathname === '/portal/teacher') setCurrentView('portal-teacher');
    else if (location.pathname === '/portal/principal') setCurrentView('portal-principal');
    else if (location.pathname === '/portal/student') setCurrentView('portal-student');
    else if (location.pathname === '/portal/parent') setCurrentView('portal-parent');
    else if (location.pathname === '/portal/bursar') setCurrentView('portal-bursar');
    else if (location.pathname === '/portal/vp') setCurrentView('portal-vp');
    else if (location.pathname === '/dashboard') setCurrentView('dashboard');
    else if (pageParam === 'create-institution' || pageParam === 'institution') setCurrentView('create-institution');
    else if (pageParam === 'create-teacher' || pageParam === 'teachers') setCurrentView('create-teacher');
    else if (pageParam === 'create-student' || pageParam === 'students') setCurrentView('create-student');
    else if (viewParam === 'onboarding') {
      setCurrentView('onboarding');
      setOnboardingStep(stepParam || 1);
    } else if (viewParam) {
      setCurrentView(viewParam);
    }

    if (instParam) setActiveInstitutionId(instParam);
    if (schParam) setActiveSchoolId(schParam);
  }, [location.pathname]);

  const navigateTo = (view: AppView, step: number = 1, instId?: string, schId?: string) => {
    setCurrentView(view);
    setOnboardingStep(step);
    if (instId) setActiveInstitutionId(instId);
    if (schId) setActiveSchoolId(schId);

    if (view === 'portal-teacher') navigate('/portal/teacher');
    else if (view === 'portal-principal') navigate('/portal/principal');
    else if (view === 'portal-student') navigate('/portal/student');
    else if (view === 'portal-parent') navigate('/portal/parent');
    else if (view === 'portal-bursar') navigate('/portal/bursar');
    else if (view === 'portal-vp') navigate('/portal/vp');
    else if (view === 'dashboard') navigate('/portal/principal');
    else {
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      if (view === 'onboarding') url.searchParams.set('step', step.toString());
      else url.searchParams.delete('step');
      if (instId) url.searchParams.set('inst_id', instId);
      if (schId) url.searchParams.set('school_id', schId);
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Routes>
        <Route path="/portal/teacher" element={<TeacherDashboard />} />
        <Route path="/portal/principal" element={<PrincipalDashboard />} />
        <Route path="/portal/student" element={<StudentDashboard />} />
        <Route path="/portal/parent" element={<ParentDashboard />} />
        <Route path="/portal/bursar" element={<BursarDashboard />} />
        <Route path="/portal/vp" element={<VPDashboard />} />
        <Route path="/dashboard" element={<PrincipalDashboard />} />

        {/* Fallback View Router for query params & stateful wizard */}
        <Route
          path="*"
          element={
            <>
              {/* Atomic Institution Onboarding Route */}
              {currentView === 'create-institution' && (
                <div className="min-h-screen py-10 px-4">
                  <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
                    <button
                      onClick={() => navigateTo('home')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to Gradifi Home
                    </button>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        onClick={() => navigateTo('onboarding', 1)}
                        className="text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        Launch 14-Step Wizard
                      </button>
                    </div>
                  </div>
                  <CreateInstitution
                    onSuccess={(instId, schId) => {
                      setActiveInstitutionId(instId);
                      setActiveSchoolId(schId);
                    }}
                    onNavigateToTeachers={() => navigateTo('create-teacher', 1, activeInstitutionId, activeSchoolId)}
                  />
                </div>
              )}

              {/* Atomic Teacher Onboarding Route */}
              {currentView === 'create-teacher' && (
                <div className="min-h-screen py-10 px-4">
                  <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
                    <button
                      onClick={() => navigateTo('create-institution')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to Institution Details
                    </button>
                    <span className="text-xs font-mono text-slate-400">School ID: {activeSchoolId}</span>
                  </div>
                  <CreateTeacher
                    institutionId={activeInstitutionId}
                    schoolId={activeSchoolId}
                    onNavigateToStudents={() => navigateTo('create-student', 1, activeInstitutionId, activeSchoolId)}
                  />
                </div>
              )}

              {/* Atomic Student Onboarding Route */}
              {currentView === 'create-student' && (
                <div className="min-h-screen py-10 px-4">
                  <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
                    <button
                      onClick={() => navigateTo('create-teacher')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to Teacher Registration
                    </button>
                    <span className="text-xs font-mono text-slate-400">School ID: {activeSchoolId}</span>
                  </div>
                  <CreateStudent
                    institutionId={activeInstitutionId}
                    schoolId={activeSchoolId}
                    onNavigateToDashboard={() => navigateTo('portal-principal', 1, activeInstitutionId)}
                  />
                </div>
              )}

              {/* Standard Home Landing View */}
              {currentView === 'home' && (
                <HomePage
                  onStartOnboarding={() => navigateTo('create-institution')}
                  onOpenDashboard={(instId) => navigateTo('portal-principal', 1, instId || activeInstitutionId)}
                />
              )}

              {/* 14-Step Full Onboarding Wizard */}
              {currentView === 'onboarding' && (
                <OnboardingWizard
                  initialStep={onboardingStep}
                  initialInstitutionId={activeInstitutionId}
                  onComplete={(instId) => navigateTo('portal-principal', 1, instId)}
                  onExitHome={() => navigateTo('home')}
                />
              )}

              {/* Roles Portals Mapping Fallback */}
              {currentView === 'portal-teacher' && <TeacherDashboard />}
              {currentView === 'portal-principal' && <PrincipalDashboard />}
              {currentView === 'portal-student' && <StudentDashboard />}
              {currentView === 'portal-parent' && <ParentDashboard />}
              {currentView === 'portal-bursar' && <BursarDashboard />}
              {currentView === 'portal-vp' && <VPDashboard />}

              {/* Main Administrative Portal & Terminal Dashboard */}
              {currentView === 'dashboard' && <PrincipalDashboard />}
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
