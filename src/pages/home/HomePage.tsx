import React from 'react';
import { 
  ArrowRight, 
  Users, 
  Shield, 
  Zap, 
  Star, 
  GraduationCap, 
  Lock, 
  Award,
  BookOpen,
  FileCheck,
  Check,
  Sparkles,
  Heart
} from 'lucide-react';
import TeacherApprovalCard from './components/TeacherApprovalCard';
import PrincipalTimeSavedCard from './components/PrincipalTimeSavedCard';

export interface HomePageProps {
  onStartOnboarding?: () => void;
  onOpenDashboard?: (instId?: string) => void;
}

const FeatureCard: React.FC<{ icon: any; title: string; desc: string }> = ({ icon: Icon, title, desc }) => (
  <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
  </div>
);

export const HomePage: React.FC<HomePageProps> = ({ onStartOnboarding, onOpenDashboard }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Gradifi</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#impact" className="hover:text-indigo-600 transition-colors">Live Impact</a>
            <a href="#empowerment" className="hover:text-indigo-600 transition-colors">Teacher Control</a>
            <a href="#cbt-lab" className="hover:text-indigo-600 transition-colors">CBT Simulation</a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#trust" className="hover:text-indigo-600 transition-colors">Compliance</a>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => onOpenDashboard?.()}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={onStartOnboarding}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Photo Showcase */}
      <main className="flex-1 px-6 pt-12 pb-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Phase 1 Trust Badges */}
            <div className="flex flex-wrap gap-2.5 text-xs font-semibold">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-xs">
                <Shield className="w-4 h-4 text-emerald-600" /> NDPR Certified
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200/80 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-xs">
                <Zap className="w-4 h-4 text-blue-600" /> Offline-First
              </span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-xs">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" /> Trusted by 10+ Nigerian Schools
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
              The Authoritative Assessment Platform for <span className="text-indigo-600">Nigerian Schools</span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
              Eliminate term-end broadsheet chaos. Empower your teachers with AI-drafted rubric grading while maintaining 100% human authority and SEFAES compliance.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button 
                onClick={onStartOnboarding}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 text-base shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Start Free Trial – We'll Call to Help</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={onStartOnboarding}
                className="bg-white border border-slate-200 text-slate-700 px-7 py-4 rounded-2xl font-bold hover:bg-slate-50 text-base shadow-sm transition-colors cursor-pointer"
              >
                Launch 14-Step Wizard
              </button>
            </div>

            {/* Quick Proof Pills */}
            <div className="pt-4 flex items-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> Instant Setup
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> Zero IT Infrastructure Required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> Free Phone Support
              </span>
            </div>
          </div>

          {/* Right Column: Hero Photo Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative Ambient Glow */}
              <div className="absolute -top-6 -right-6 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

              {/* Main Classroom Photo */}
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-white">
                <img 
                  src="/images/hero_students.png" 
                  alt="Nigerian secondary school students studying with digital tablets" 
                  className="w-full h-[420px] object-cover object-center"
                />
                
                {/* Floating Glassmorphism Badge Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/85 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">99.4% Broadsheet Accuracy</h4>
                      <p className="text-[11px] text-slate-300">WAEC & NECO Curriculum Aligned</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wide">
                    Live
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Section 1: Live Network Impact Counter (Principal Human Anchor) */}
      <section id="impact" className="py-8 bg-slate-100/60 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
              Proven School Efficiency
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              Real Impact for School Principals
            </h2>
          </div>
          <PrincipalTimeSavedCard />
        </div>
      </section>

      {/* Section 2: Human-in-the-Loop Teacher Empowerment (with Teacher Classroom Photo) */}
      <section id="empowerment" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Teacher Empowerment
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-3">
              AI Speed with Total Teacher Authority
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              Gradifi never automates grading blindly. AI generates transparent draft rubrics in seconds — your teachers review, adjust, and approve every single score.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Teacher Classroom Photo Side Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white">
                <img 
                  src="/images/teacher_classroom.png" 
                  alt="Nigerian Secondary School Teacher with Digital Tablet in Classroom" 
                  className="w-full h-[380px] object-cover"
                />
                <div className="p-6 bg-slate-900 text-white space-y-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                    <span className="text-xs font-semibold text-rose-300">Empowering Nigerian Educators</span>
                  </div>
                  <p className="text-xs italic text-slate-300 leading-relaxed">
                    “Gradifi gives me 10 hours back every week while keeping me in complete control of my student rubrics.”
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    — Senior Literature Teacher, Federal Government College
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Teacher Approval Card */}
            <div className="lg:col-span-7">
              <TeacherApprovalCard />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: CBT Simulation & Computer Lab Photo Showcase */}
      <section id="cbt-lab" className="py-20 px-6 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Offline CBT Examinations
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Seamless CBT & Broad-sheet Compilation
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Conduct Computer Based Tests (CBT) for WAEC, NECO, and internal term examinations right inside your computer lab — even without active internet connection.
            </p>

            <ul className="space-y-3.5 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
                <span>Zero bandwidth dependency during exam administration</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
                <span>Instant automated scoring against WAEC marking schemes</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
                <span>One-click broadsheet compilation for Principal sign-off</span>
              </li>
            </ul>

            <div className="pt-2">
              <button 
                onClick={onStartOnboarding}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl text-sm shadow-md transition-colors cursor-pointer"
              >
                Experience CBT Simulation
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl">
              <img 
                src="/images/cbt_lab.png" 
                alt="Nigerian secondary students in computer lab taking CBT examination" 
                className="w-full h-[380px] object-cover"
              />
              <div className="absolute top-4 right-4 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 backdrop-blur-sm border border-white/20">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Offline Mode Active
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section 4: Core Value Pillars */}
      <section id="features" className="bg-slate-50 py-20 px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Built Specifically for the Nigerian Education Ecosystem
            </h2>
            <p className="text-slate-600 mt-3">
              Designed from the ground up for Nigerian secondary schools, WAEC/NECO standards, and local network realities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Users} 
              title="Seamless Onboarding" 
              desc="Guided step-by-step setup: School Profile → Class Structure → Teacher Roster → Live Deployment in minutes." 
            />
            <FeatureCard 
              icon={Shield} 
              title="NDPR Data Sovereignty" 
              desc="Fully compliant with Nigerian Data Protection Regulation. Your student and staff records are encrypted and protected." 
            />
            <FeatureCard 
              icon={Zap} 
              title="Offline-First Sync Engine" 
              desc="Grade assessments and compile broadsheets without active internet. Automatically syncs whenever network restores." 
            />
            <FeatureCard 
              icon={BookOpen} 
              title="SEFAES Alignment" 
              desc="Pre-loaded with standardized rubrics aligned with West African Secondary Curriculum standards." 
            />
            <FeatureCard 
              icon={FileCheck} 
              title="Instant Broadsheet Generation" 
              desc="Generate term report cards and school broadsheets in one click, eliminating weeks of manual math errors." 
            />
            <FeatureCard 
              icon={Award} 
              title="Verifiable Credentials" 
              desc="Issue tamper-proof digital transcripts and certificates backed by secure cryptographic validation." 
            />
          </div>
        </div>
      </section>

      {/* Section 5: Trust & Compliance Assurance Banner */}
      <section id="trust" className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" /> Institutional Data Security
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold">Ready to modernize your school administration?</h3>
            <p className="text-slate-400 text-sm max-w-xl">
              Join 35+ forward-thinking schools across Nigeria saving hundreds of administrative hours each term.
            </p>
          </div>
          <button 
            onClick={onStartOnboarding}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Start Free Trial Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">Gradifi</span>
          </div>
          <p className="text-xs text-slate-500">
            © 2026 Gradifi Inc. SEFAES-Certified. Built with pride for Nigerian Secondary Schools.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
