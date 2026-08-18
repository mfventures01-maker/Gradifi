import React, { useState, useEffect } from 'react';
import { HomePage } from './features/home/HomePage';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { DashboardLayout } from './features/dashboard/DashboardLayout';

export type AppView = 'home' | 'onboarding' | 'dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [activeInstitutionId, setActiveInstitutionId] = useState<string>('inst_demo_01');

  // Check URL params on initial load (e.g. ?view=onboarding&step=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as AppView;
    const stepParam = parseInt(params.get('step') || '1', 10);
    const instParam = params.get('inst_id');

    if (viewParam === 'onboarding') {
      setCurrentView('onboarding');
      setOnboardingStep(stepParam || 1);
    } else if (viewParam === 'dashboard') {
      setCurrentView('dashboard');
    }

    if (instParam) {
      setActiveInstitutionId(instParam);
    }
  }, []);

  const navigateTo = (view: AppView, step: number = 1, instId?: string) => {
    setCurrentView(view);
    setOnboardingStep(step);
    if (instId) setActiveInstitutionId(instId);

    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (view === 'onboarding') {
      url.searchParams.set('step', step.toString());
    } else {
      url.searchParams.delete('step');
    }
    if (instId) {
      url.searchParams.set('inst_id', instId);
    }
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {currentView === 'home' && (
        <HomePage
          onStartOnboarding={() => navigateTo('onboarding', 1)}
          onOpenDashboard={(instId) => navigateTo('dashboard', 1, instId || 'inst_demo_01')}
        />
      )}

      {currentView === 'onboarding' && (
        <OnboardingWizard
          initialStep={onboardingStep}
          initialInstitutionId={activeInstitutionId}
          onComplete={(instId) => navigateTo('dashboard', 1, instId)}
          onExitHome={() => navigateTo('home')}
        />
      )}

      {currentView === 'dashboard' && (
        <DashboardLayout
          institutionId={activeInstitutionId}
          onLogout={() => navigateTo('home')}
        />
      )}
    </div>
  );
}

