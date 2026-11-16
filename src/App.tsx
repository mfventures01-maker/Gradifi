import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { HomePage } from './features/home/HomePage';
import { DashboardLayout } from './features/dashboard/DashboardLayout';
import { RectorDeanDashboard } from './features/higher-ed/RectorDeanDashboard';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';
import { CreateInstitution } from './pages/onboarding/CreateInstitution';
import { CreateTeacher } from './pages/onboarding/CreateTeacher';
import { CreateStudent } from './pages/onboarding/CreateStudent';
import { AuthGuard } from './components/AuthGuard';
import type { AuthSessionState } from './services/authService';

export type AppView =
  | 'home'
  | 'onboarding'
  | 'dashboard'
  | 'create-institution'
  | 'create-teacher'
  | 'create-student'
  | 'auth';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [activeInstitutionId, setActiveInstitutionId] = useState('');
  const [activeSchoolId, setActiveSchoolId] = useState('');
  const [identity, setIdentity] = useState<AuthSessionState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const page = params.get('page');
    const step = Number.parseInt(params.get('step') || '1', 10);
    if (page === 'create-institution' || page === 'institution' || view === 'create-institution') {
      setCurrentView('create-institution');
    } else if (page === 'create-teacher' || page === 'teachers' || view === 'create-teacher') {
      setCurrentView('create-teacher');
    } else if (page === 'create-student' || page === 'students' || view === 'create-student') {
      setCurrentView('create-student');
    } else if (view === 'onboarding') {
      setCurrentView('onboarding');
      setOnboardingStep(Number.isFinite(step) && step > 0 ? step : 1);
    } else if (view === 'dashboard' || view === 'auth') {
      setCurrentView('dashboard');
    }
    const institutionId = params.get('inst_id');
    const schoolId = params.get('school_id');
    if (institutionId) setActiveInstitutionId(institutionId);
    if (schoolId) setActiveSchoolId(schoolId);
  }, []);

  const navigateTo = (view: AppView, step = 1, institutionId?: string, schoolId?: string) => {
    setCurrentView(view);
    setOnboardingStep(step);
    if (institutionId) setActiveInstitutionId(institutionId);
    if (schoolId) setActiveSchoolId(schoolId);

    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (view === 'onboarding') url.searchParams.set('step', String(step));
    else url.searchParams.delete('step');
    if (institutionId) url.searchParams.set('inst_id', institutionId);
    else if (view === 'home') url.searchParams.delete('inst_id');
    if (schoolId) url.searchParams.set('school_id', schoolId);
    else if (view === 'home') url.searchParams.delete('school_id');
    url.searchParams.delete('role');
    window.history.pushState({}, '', url.toString());
  };

  const renderAuthenticatedDashboard = () => {
    if (!identity?.isAuthenticated || !identity.actorType || !identity.institutionId) {
      return (
        <div className="mx-auto mt-12 flex max-w-xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><h2 className="font-bold">Institution identity not resolved</h2><p className="mt-1 text-sm leading-6">Your Supabase session is authenticated, but no active institution actor with an institution scope was resolved. Dashboard access is withheld until the identity record is corrected.</p></div>
        </div>
      );
    }

    const actorType = identity.actorType.toLowerCase();
    if (actorType === 'dean' || actorType === 'rector') {
      return <RectorDeanDashboard identity={identity} onLogout={() => { setIdentity(null); navigateTo('home'); }} />;
    }

    const schoolActorTabs: Record<string, string> = {
      principal: 'principal',
      principal_admin: 'principal',
      school_admin: 'principal',
      vice_principal: 'vp',
      teacher: 'teacher',
      student: 'student',
      parent: 'parent',
      bursar: 'bursar',
    };
    if (!schoolActorTabs[actorType]) {
      return (
        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="font-bold">Dashboard not assigned to this actor type</h2>
          <p className="mt-1 text-sm">The authenticated actor type "{identity.actorType}" does not map to the school or higher-institution dashboard routes currently implemented.</p>
        </div>
      );
    }
    if (!identity.schoolId) {
      return <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">This school actor has no active campus/school scope. School dashboard access is withheld.</div>;
    }
    return <DashboardLayout institutionId={identity.institutionId} initialTab={schoolActorTabs[actorType]} onLogout={() => { setIdentity(null); navigateTo('home'); }} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {currentView === 'home' && (
        <HomePage
          onStartOnboarding={() => navigateTo('create-institution')}
          onGoToDashboard={() => navigateTo('dashboard')}
        />
      )}

      {currentView === 'create-institution' && (
        <div className="min-h-screen px-4 py-10">
          <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
            <button onClick={() => navigateTo('home')} className="text-xs font-semibold text-slate-500 hover:text-slate-900">← Back to Gradifi Home</button>
            <button onClick={() => navigateTo('onboarding', 1)} className="text-xs font-semibold text-blue-600 hover:underline">Launch school onboarding wizard</button>
          </div>
          <CreateInstitution
            onSuccess={(institutionId, schoolId) => { setActiveInstitutionId(institutionId); setActiveSchoolId(schoolId); }}
            onNavigateToTeachers={() => navigateTo('create-teacher', 1, activeInstitutionId, activeSchoolId)}
          />
        </div>
      )}

      {currentView === 'create-teacher' && (
        <div className="min-h-screen px-4 py-10">
          <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
            <button onClick={() => navigateTo('create-institution')} className="text-xs font-semibold text-slate-500 hover:text-slate-900">← Back to Institution Details</button>
            <span className="text-xs text-slate-400">School ID: {activeSchoolId || 'Not assigned'}</span>
          </div>
          <CreateTeacher institutionId={activeInstitutionId} schoolId={activeSchoolId} onNavigateToStudents={() => navigateTo('create-student', 1, activeInstitutionId, activeSchoolId)} />
        </div>
      )}

      {currentView === 'create-student' && (
        <div className="min-h-screen px-4 py-10">
          <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
            <button onClick={() => navigateTo('create-teacher')} className="text-xs font-semibold text-slate-500 hover:text-slate-900">← Back to Teacher Registration</button>
            <span className="text-xs text-slate-400">School ID: {activeSchoolId || 'Not assigned'}</span>
          </div>
          <CreateStudent institutionId={activeInstitutionId} schoolId={activeSchoolId} onNavigateToDashboard={() => navigateTo('dashboard', 1, activeInstitutionId, activeSchoolId)} />
        </div>
      )}

      {currentView === 'onboarding' && (
        <OnboardingWizard
          initialStep={onboardingStep}
          initialInstitutionId={activeInstitutionId}
          onComplete={(institutionId) => navigateTo('dashboard', 1, institutionId)}
          onExitHome={() => navigateTo('home')}
        />
      )}

      {currentView === 'dashboard' && (
        <AuthGuard onSessionResolved={setIdentity}>
          {renderAuthenticatedDashboard()}
        </AuthGuard>
      )}
    </div>
  );
}
