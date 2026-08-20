import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Zap, Star, ArrowRight, 
  CheckCircle2
} from 'lucide-react';
import PrincipalTimeSavedCard from './components/PrincipalTimeSavedCard';
import TeacherApprovalCard from './components/TeacherApprovalCard';

interface HomePageProps {
  onStartOnboarding?: () => void;
  onOpenDashboard?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ 
  onStartOnboarding, 
  onOpenDashboard 
}) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    if (onStartOnboarding) {
      onStartOnboarding();
    } else {
      navigate('/onboarding');
    }
  };

  const handleDashboard = () => {
    if (onOpenDashboard) {
      onOpenDashboard();
    } else {
      navigate('/portal/principal');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-600">Gradifi</span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">SEFAES</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            id="btn-nav-sign-in"
            onClick={handleSignIn}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button 
            id="btn-nav-get-started"
            onClick={handleRegister}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium">
                <Shield className="w-3.5 h-3.5" /> NDPR Certified
              </span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-xs text-blue-700 font-medium">
                <Zap className="w-3.5 h-3.5" /> Offline-First
              </span>
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-xs text-amber-700 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Trusted by 10+ Nigerian Schools
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
              Academic Intelligence for Nigerian Schools
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              AI grading, offline-first CBT exams, and academic writing tools — 
              trusted by Nigerian secondary schools. Free for teachers and students.
            </p>

            <div className="flex flex-wrap gap-4">
              <button 
                id="btn-hero-start-free-trial"
                onClick={handleRegister}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
              >
                <span>Start Free Trial – We'll Call to Help</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                id="btn-hero-view-demo"
                onClick={handleDashboard}
                className="px-6 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer"
              >
                View Demo
              </button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 14-day free trial
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancel anytime
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="bg-slate-100 rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">
                  GD
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">SEFAES Academic Portal</p>
                  <p className="text-xs text-slate-500">Nigeria Secondary Education Standard</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">AI Script Evaluation</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">99.4% Accuracy</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">WAEC / NECO Alignment</span>
                  <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">Verified</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Offline CBT Exam Mode</span>
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Impact Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
          Real Impact for School Principals
        </h2>
        <PrincipalTimeSavedCard />
      </section>

      {/* Teacher Empowerment Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Teacher Empowerment
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              AI Speed with Total Teacher Authority. Gradifi never automates grading blindly. 
              AI generates transparent draft rubrics in seconds — your teachers review, 
              adjust, and approve every single score.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                FG
              </div>
              <div>
                <p className="font-medium text-slate-700">— Senior Literature Teacher</p>
                <p className="text-xs">Federal Government College, Lagos</p>
              </div>
            </div>
          </div>
          <TeacherApprovalCard />
        </div>
      </section>

      {/* CBT Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  OFFLINE CBT ENGINE
                </span>
                <span className="text-slate-400">SEFAES v4.2</span>
              </div>
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-300 font-semibold mb-1">Active Exam: Mathematics Mock II</p>
                <p className="text-xs text-slate-400">Sync Status: Queue Ready (Offline Mode)</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Offline CBT Examinations
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Students can complete exams even without internet. Results sync 
              automatically when connectivity is restored. Perfect for Nigerian 
              schools with unreliable power and internet.
            </p>
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 text-sm text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Offline Mode Active
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-sm text-slate-400">
        <p>© 2026 Gradifi • SEFAES Constitutional Engineering System</p>
        <p className="mt-1">Built for Nigerian secondary schools • NDPR Compliant</p>
      </footer>
    </div>
  );
};

export default HomePage;
