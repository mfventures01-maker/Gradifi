import React, { useState, useEffect } from 'react';
import { HomePage } from './features/home/HomePage';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { DashboardLayout } from './features/dashboard/DashboardLayout';
import { CreateInstitution } from './pages/onboarding/CreateInstitution';
import { CreateTeacher } from './pages/onboarding/CreateTeacher';
import { CreateStudent } from './pages/onboarding/CreateStudent';
import { AuthGuard } from './components/AuthGuard';

export type AppView = 
  | 'home' 
  | 'onboarding' 
  | 'dashboard' 
  | 'teacher'
  | 'principal'
  | 'student'
  | 'parent'
  | 'bursar'
  | 'vp'
  | 'create-institution' 
  | 'create-teacher' 
  | 'create-student'
  | 'auth';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [activeInstitutionId, setActiveInstitutionId] = useState<string>('inst_demo_01');
  const [activeSchoolId, setActiveSchoolId] = useState<string>('sch_demo_01');
  const [activeDashboardTab, setActiveDashboardTab] = useState<string>('overview');

  // Check URL params on initial load (e.g. ?view=onboarding&step=1, ?page=create-institution, ?role=teacher)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as AppView;
    const pageParam = params.get('page');
    const roleParam = params.get('role');
    const stepParam = parseInt(params.get('step') || '1', 10);
    const instParam = params.get('inst_id');
    const schParam = params.get('school_id');

    if (pageParam === 'create-institution' || pageParam === 'institution') {
      setCurrentView('create-institution');
    } else if (pageParam === 'create-teacher' || pageParam === 'teachers') {
      setCurrentView('create-teacher');
    } else if (pageParam === 'create-student' || pageParam === 'students') {
      setCurrentView('create-student');
    } else if (roleParam) {
      setCurrentView('dashboard');
      setActiveDashboardTab(roleParam);
    } else if (viewParam === 'onboarding') {
      setCurrentView('onboarding');
      setOnboardingStep(stepParam || 1);
    } else if (viewParam === 'teacher' || viewParam === 'principal' || viewParam === 'student' || viewParam === 'parent' || viewParam === 'bursar' || viewParam === 'vp') {
      setCurrentView('dashboard');
      setActiveDashboardTab(viewParam);
    } else if (viewParam === 'dashboard') {
      setCurrentView('dashboard');
    } else if (viewParam === 'create-institution' || viewParam === 'create-teacher' || viewParam === 'create-student' || viewParam === 'auth') {
      setCurrentView(viewParam);
    }

    if (instParam) setActiveInstitutionId(instParam);
    if (schParam) setActiveSchoolId(schParam);
  }, []);

  const navigateTo = (view: AppView, step: number = 1, instId?: string, schId?: string, roleTab?: string) => {
    setCurrentView(view);
    setOnboardingStep(step);
    if (roleTab) setActiveDashboardTab(roleTab);
    if (instId) setActiveInstitutionId(instId);
    if (schId) setActiveSchoolId(schId);

    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (view === 'onboarding') {
      url.searchParams.set('step', step.toString());
    } else {
      url.searchParams.delete('step');
    }
    if (roleTab) {
      url.searchParams.set('role', roleTab);
    } else {
      url.searchParams.delete('role');
    }
    if (instId) {
      url.searchParams.set('inst_id', instId);
    }
    if (schId) {
      url.searchParams.set('school_id', schId);
    }
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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
            onNavigateToDashboard={() => navigateTo('dashboard', 1, activeInstitutionId)}
          />
        </div>
      )}

      {/* Standard Home Landing View */}
      {currentView === 'home' && (
        <HomePage
          onStartOnboarding={() => navigateTo('create-institution')}
          onGoToDashboard={(instId, role) => navigateTo('dashboard', 1, instId || 'inst_demo_01', undefined, role)}
        />
      )}

      {/* 14-Step Full Onboarding Wizard */}
      {currentView === 'onboarding' && (
        <OnboardingWizard
          initialStep={onboardingStep}
          initialInstitutionId={activeInstitutionId}
          onComplete={(instId) => navigateTo('dashboard', 1, instId)}
          onExitHome={() => navigateTo('home')}
        />
      )}

      {/* Main Administrative Portal & Terminal Dashboard */}
      {currentView === 'dashboard' && (
        <AuthGuard fallback={
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <div className="mb-4 text-center">
                <button
                  onClick={() => navigateTo('home')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  ← Return to Home
                </button>
              </div>
              <AuthGuard
                onSessionResolved={(identity) => {
                  if (identity.institutionId) setActiveInstitutionId(identity.institutionId);
                  if (identity.schoolId) setActiveSchoolId(identity.schoolId);
                  if (identity.actorType) {
                    const roleMap: Record<string, string> = {
                      teacher: 'teacher',
                      principal: 'principal',
                      school_admin: 'principal',
                      student: 'student',
                      parent: 'parent',
                      bursar: 'bursar',
                      vice_principal: 'vp',
                    };
                    if (roleMap[identity.actorType]) {
                      setActiveDashboardTab(roleMap[identity.actorType]);
                    }
                  }
                }}
              >
                <DashboardLayout
                  institutionId={activeInstitutionId}
                  initialTab={activeDashboardTab}
                  onLogout={() => navigateTo('home')}
                />
              </AuthGuard>
            </div>
          </div>
        }>
          <DashboardLayout
            institutionId={activeInstitutionId}
            initialTab={activeDashboardTab}
            onLogout={() => navigateTo('home')}
          />
        </AuthGuard>
      )}
    </div>
  );
}

