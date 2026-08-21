import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, Zap, Star, ArrowRight, 
  CheckCircle2, Sparkles
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
    if (onStartOnboarding) onStartOnboarding();
    else navigate('/onboarding');
  };
  const handleDashboard = () => {
    if (onOpenDashboard) onOpenDashboard();
    else navigate('/portal/principal');
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
          {/* Dashboard Dropdown */}
          <div className="relative group">
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1 flex items-center gap-1">
              <span>Dashboard</span>
              <span className="text-xs">▾</span>
            </button>
            <div className="absolute right-0 hidden group-hover:block bg-white border border-slate-200 rounded-xl shadow-xl py-2 min-w-[180px] z-50">
              <Link to="/portal/principal" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium">Principal</Link>
              <Link to="/portal/teacher" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium">Teacher</Link>
              <Link to="/portal/student" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium">Student</Link>
              <Link to="/portal/parent" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium">Parent</Link>
              <Link to="/portal/bursar" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium">Bursar</Link>
              <Link to="/portal/vp" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium">VP</Link>
            </div>
          </div>
          <button 
            onClick={handleSignIn}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button 
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

            <div className="flex flex-wrap gap-4 mb-8">
              <button 
                onClick={handleRegister}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
              >
                <span>Start Free Trial – We'll Call to Help</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDashboard}
                className="px-6 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer"
              >
                View Demo
              </button>
            </div>

            {/* FREE WRITING TOOLS HERO INSET */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> 100% Free Academic Writing Tools
                </span>
                <span className="text-[11px] text-slate-400 font-medium">No Registration Required</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'Word Counter', icon: '📝', path: '/tools/word-counter' },
                  { name: 'Paraphraser', icon: '🔄', path: '/tools/paraphraser' },
                  { name: 'Readability', icon: '📖', path: '/tools/readability-checker' },
                  { name: 'Citation Builder', icon: '📚', path: '/tools/citation-generator' },
                  { name: 'Summarizer', icon: '📄', path: '/tools/summarizer' }
                ].map((tool) => (
                  <Link
                    key={tool.name}
                    to={tool.path}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 text-center hover:shadow-md hover:border-indigo-300 transition-all block group"
                  >
                    <div className="text-xl mb-1 group-hover:scale-110 transition-transform">{tool.icon}</div>
                    <p className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-600 truncate">{tool.name}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 14-day free trial
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancel anytime
              </span>
            </div>
          </div>

          <div className="relative">
            <img 
              src="/images/hero_students.png" 
              alt="Nigerian students learning" 
              className="rounded-2xl shadow-xl w-full"
              onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23f1f5f9"/><text x="50" y="150" font-family="sans-serif" font-size="20" fill="%236b7280">Nigerian Students</text></svg>'; }}
            />
            <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500">WAEC & NECO Aligned</p>
              <p className="text-sm font-bold text-slate-900">99.4% Accuracy</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE: Human-in-the-Loop AI Grading */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-100">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-8">
          🤖 Human-in-the-Loop AI Grading
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50/70 rounded-2xl p-6 text-center border border-blue-200/80 shadow-xs">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-slate-900 text-base mb-1">AI Drafts Rubric</h3>
            <p className="text-xs text-slate-600 leading-relaxed">AI generates transparent draft rubrics in seconds following WAEC/NECO marking schemes.</p>
          </div>
          <div className="bg-amber-50/70 rounded-2xl p-6 text-center border border-amber-200/80 shadow-xs">
            <div className="text-4xl mb-3">👩‍🏫</div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Teacher Reviews</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Teachers review, adjust sliders, and verify every single score before releasing grades.</p>
          </div>
          <div className="bg-emerald-50/70 rounded-2xl p-6 text-center border border-emerald-200/80 shadow-xs">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Approve & Release</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Teachers approve or override scores with mandatory justification and audit trail.</p>
          </div>
        </div>
        <div className="text-center mt-6">
          <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 text-xs font-bold text-emerald-800">
            ⭐ Save 12 hours per term on grading
          </span>
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
              <img 
                src="/images/teacher_classroom.png" 
                alt="Teacher" 
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="24" fill="%23e2e8f0"/><text x="24" y="28" font-family="sans-serif" font-size="20" text-anchor="middle" fill="%236b7280">👩‍🏫</text></svg>'; }}
              />
              <div>
                <p className="font-medium text-slate-700">— Senior Literature Teacher</p>
                <p className="text-xs text-slate-400">Federal Government College, Lagos</p>
              </div>
            </div>
          </div>
          <TeacherApprovalCard />
        </div>
      </section>

      {/* FEATURE: Offline CBT Examinations */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-100">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-8">
          📶 Offline CBT Examinations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <img 
              src="/images/cbt_lab.png" 
              alt="CBT Lab" 
              className="rounded-2xl shadow-xl w-full"
              onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23f1f5f9"/><text x="50" y="150" font-family="sans-serif" font-size="20" fill="%236b7280">CBT Lab</text></svg>'; }}
            />
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Works Offline</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Students complete exams without active internet connection.</p>
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <span className="text-2xl">🔄</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Auto-Sync</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Results and attempt logs sync automatically when network connectivity is restored.</p>
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <span className="text-2xl">⏱️</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Live Timer</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Built-in countdown timer with automatic answer submission on time-up.</p>
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 text-xs font-bold text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Offline Mode Active • Auto-sync • No internet needed
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
