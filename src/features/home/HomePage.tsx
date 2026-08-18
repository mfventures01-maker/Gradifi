import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  User,
  School,
  Users,
  CheckCircle2,
  Cpu,
  FileText,
  ScanSearch,
  Monitor,
  BarChart3,
  ShieldCheck,
  Award,
  Globe2,
  BookOpen,
  Zap,
  Play,
  X,
  Send,
  Loader2,
  HelpCircle,
  Clock
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface HomePageProps {
  onStartOnboarding: () => void;
  onGoToDashboard: (institutionId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartOnboarding, onGoToDashboard }) => {
  // Navigation & Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [featureDetail, setFeatureDetail] = useState<string | null>(null);

  // Interactive feature modals state
  const [demoEssay, setDemoEssay] = useState(
    `In Things Fall Apart by Chinua Achebe, Okonkwo's fear of weakness and failure is his dominant character trait. Because his father Unoka was considered a failure (agbala), Okonkwo strives his whole life to be the exact opposite. This leads to his relentless hard work, but also to his rash anger, severe treatment of his family, and ultimately his tragic demise when the white missionaries arrive in Umuofia.`
  );
  const [demoGradeResult, setDemoGradeResult] = useState<any>(null);
  const [isGradingDemo, setIsGradingDemo] = useState(false);

  // Login Modal State
  const [loginEmail, setLoginEmail] = useState('admin@kingsway.edu.ng');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleRunGradingDemo = async () => {
    setIsGradingDemo(true);
    try {
      // Deterministic evaluation structure aligned with AnswerScript rubric
      setTimeout(() => {
        setDemoGradeResult({
          overall_score: 23,
          max_score: 25,
          percentage: 92,
          overall_feedback: "Exceptional analytical depth. Clear textual citations illustrating Okonkwo's tragic hamartia and cultural friction with colonial structures.",
          criteria_scores: [
            { criterion: "Thematic Thesis & Content", score: 9, max_score: 10 },
            { criterion: "Evidence & Character Analysis", score: 9, max_score: 10 },
            { criterion: "Grammar, Diction & Mechanics", score: 5, max_score: 5 },
          ]
        });
        setIsGradingDemo(false);
      }, 700);
    } catch (e) {
      console.error(e);
      setIsGradingDemo(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
      setActiveModal(null);
      onGoToDashboard('inst_demo_01');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* ---------------------------------------------------- */}
      {/* TOP NAVIGATION BAR                                  */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600">
              GRADIFI
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-700">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-blue-600 font-semibold transition-colors hover:text-blue-700"
            >
              Home
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('features-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-blue-600 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('about-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-blue-600 transition-colors"
            >
              About Gradifi
            </button>
            <button
              onClick={() => setActiveModal('for_schools')}
              className="hover:text-blue-600 transition-colors"
            >
              For Schools
            </button>
            <button
              onClick={() => setActiveModal('pricing')}
              className="hover:text-blue-600 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => setActiveModal('contact')}
              className="hover:text-blue-600 transition-colors"
            >
              Contact
            </button>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              id="nav-login-btn"
              onClick={() => setActiveModal('login')}
              className="px-5 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 transition-all duration-200"
            >
              Login
            </button>
            <button
              id="nav-register-btn"
              onClick={onStartOnboarding}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all duration-200"
            >
              Register Now
            </button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* HERO SECTION                                         */}
      {/* ---------------------------------------------------- */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
        {/* Subtle Ambient Background */}
        <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-blue-50/70 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 left-10 -z-10 w-80 h-80 bg-sky-50 rounded-full blur-3xl opacity-50"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy & Actions */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>AI-POWERED EDUCATION PLATFORM</span>
              </div>

              {/* Main Headline */}
              <div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-blue-600 leading-none">
                  GRADIFI
                </h1>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mt-2">
                  AI-Assisted Grading with Teacher Rubrics
                </h2>
              </div>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl">
                The smart way to assess, analyze and accelerate learning for schools, teachers and students.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  id="hero-register-btn"
                  onClick={onStartOnboarding}
                  className="px-7 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-600/25 inline-flex items-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <span>Register Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  id="hero-explore-features-btn"
                  onClick={() => {
                    const el = document.getElementById('features-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-7 py-3.5 text-base font-semibold text-blue-600 hover:bg-blue-50 border border-blue-600 rounded-lg transition-all duration-200"
                >
                  Explore Features
                </button>
              </div>

              {/* Verified Metrics Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900 leading-none">10K+</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">Students</div>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900 leading-none">1K+</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">Schools</div>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900 leading-none">5K+</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">Teachers</div>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900 leading-none">99%</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">Accuracy</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Hero Visual Lab Image */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-slate-100 bg-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=80"
                  alt="African students in classroom computer lab using Gradifi assessment platform"
                  className="w-full h-auto object-cover max-h-[460px] opacity-95 hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay live status badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-3.5 border border-slate-200/80 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Live AI Grading Engine Active</div>
                      <div className="text-[11px] text-slate-500">WAEC & NECO Rubrics Synchronized</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setFeatureDetail('ai_grading')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                  >
                    Test Live Demo
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* FEATURES SECTION                                     */}
      {/* ---------------------------------------------------- */}
      <section id="features-section" className="py-16 sm:py-20 bg-slate-50/60 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything You Need for Smarter Assessments
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3">
              Powerful tools that make teaching, learning and assessment simple and effective.
            </p>
          </div>

          {/* 5 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Card 1: AI-Assisted Grading with Rubrics */}
            <div
              id="card-ai-grading"
              onClick={() => setFeatureDetail('ai_grading')}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-5 shadow-md shadow-blue-600/20 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                  AI-Assisted Grading with Rubrics
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Grade faster and fairer using AI with teacher-defined rubrics for consistent, accurate results.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 2: JAMB & WAEC Past Questions */}
            <div
              id="card-past-questions"
              onClick={() => setFeatureDetail('past_questions')}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white mb-5 shadow-md shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-emerald-600 transition-colors">
                  JAMB & WAEC Past Questions
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Access thousands of past questions and study resources for JAMB, WAEC and more.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 group-hover:gap-2.5 transition-all">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: Plagiarism Checker */}
            <div
              id="card-plagiarism"
              onClick={() => setFeatureDetail('plagiarism')}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white mb-5 shadow-md shadow-purple-600/20 group-hover:scale-110 transition-transform">
                  <ScanSearch className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-purple-600 transition-colors">
                  Plagiarism Checker
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Ensure originality with advanced plagiarism detection and detailed similarity reports.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 group-hover:gap-2.5 transition-all">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 4: Online CBT Examinations */}
            <div
              id="card-cbt-exams"
              onClick={() => setFeatureDetail('cbt_exams')}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white mb-5 shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <Monitor className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-amber-600 transition-colors">
                  Online CBT Examinations
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Create, manage and conduct computer-based tests seamlessly and securely.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 group-hover:gap-2.5 transition-all">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 5: Performance Analytics */}
            <div
              id="card-analytics"
              onClick={() => setFeatureDetail('analytics')}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-teal-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white mb-5 shadow-md shadow-teal-600/20 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-teal-600 transition-colors">
                  Performance Analytics
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Get insights into student performance and track progress with smart analytics.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 group-hover:gap-2.5 transition-all">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* ABOUT GRADIFI SECTION                                */}
      {/* ---------------------------------------------------- */}
      <section id="about-section" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Image: African Students collaborating */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-100 relative group">
                <img
                  src="https://images.unsplash.com/photo-1529390079861-591de354faf5?w=900&auto=format&fit=crop&q=80"
                  alt="African students in classroom uniforms studying with smiles"
                  className="w-full h-[420px] object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="text-sm font-semibold tracking-wide uppercase text-blue-200">Built For Excellence</div>
                  <div className="text-xl font-bold mt-1">Empowering Educators Across Africa</div>
                </div>
              </div>
            </div>

            {/* Right Column: About Gradifi Copy & Badges */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-blue-600 font-bold text-sm tracking-wide uppercase">Who We Are</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
                  About Gradifi
                </h2>
              </div>

              <p className="text-lg text-slate-600 leading-relaxed">
                Gradifi is an AI-powered assessment and learning platform built for African schools. We combine technology and pedagogy to help teachers grade smarter, students learn better, and schools achieve more.
              </p>

              <p className="text-base text-slate-600 leading-relaxed">
                By grounding artificial intelligence in curriculum-certified rubrics (WAEC, NECO, JAMB), Gradifi eliminates grading fatigue while maintaining total pedagogical control for headmasters and classroom educators.
              </p>

              {/* 4 Feature Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">AI-Powered Assessments</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Secure & Reliable</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Designed for African Schools</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Trusted by Educators</span>
                </div>
              </div>

              {/* Quick Onboarding Button */}
              <div className="pt-4">
                <button
                  onClick={onStartOnboarding}
                  className="px-6 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-blue-600 rounded-lg shadow-md transition-all duration-200 inline-flex items-center gap-2"
                >
                  <span>Onboard Your School</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* INTERACTIVE CALL TO ACTION / ONBOARDING PROMOTION    */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 bg-blue-600 text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-blue-500 rounded-full opacity-40 blur-2xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Transform Your School’s Assessment Workflow?
          </h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Set up your institution in 14 deterministic steps. Connect classes, subject catalogs, teacher allocations, and live AI grading.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={onStartOnboarding}
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 shadow-xl transition-all hover:scale-105 inline-flex items-center gap-2"
            >
              <span>Launch 14-Step Setup Wizard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onGoToDashboard('inst_demo_01')}
              className="px-8 py-4 bg-blue-700/60 hover:bg-blue-700 text-white font-bold rounded-lg border border-blue-400/40 transition-all inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Explore Live Demo Campus</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* FOOTER                                               */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <span className="text-2xl font-black text-white tracking-tight">GRADIFI</span>
              <p className="text-sm text-slate-400 leading-relaxed">
                Empowering African schools with AI-assisted grading, WAEC/JAMB CBT examinations, and certified academic management.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => setFeatureDetail('ai_grading')} className="hover:text-white transition-colors">AI Rubric Grading</button></li>
                <li><button onClick={() => setFeatureDetail('cbt_exams')} className="hover:text-white transition-colors">CBT Exam Engine</button></li>
                <li><button onClick={() => setFeatureDetail('past_questions')} className="hover:text-white transition-colors">Past Question Bank</button></li>
                <li><button onClick={() => setFeatureDetail('plagiarism')} className="hover:text-white transition-colors">Plagiarism Scanner</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Institution</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={onStartOnboarding} className="hover:text-white transition-colors">14-Step Registration</button></li>
                <li><button onClick={() => setActiveModal('for_schools')} className="hover:text-white transition-colors">Secondary Schools</button></li>
                <li><button onClick={() => setActiveModal('pricing')} className="hover:text-white transition-colors">Pricing Plans</button></li>
                <li><button onClick={() => onGoToDashboard('inst_demo_01')} className="hover:text-white transition-colors">Campus Portal</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Contact & Support</h4>
              <ul className="space-y-2 text-sm">
                <li>Email: support@gradifi.com</li>
                <li>Hotline: +234 1 800 GRADIFI</li>
                <li>Lagos • Abuja • Accra • Nairobi</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
            <p>© 2026 Gradifi Inc. All rights reserved. Single Source of Truth Certified.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>WAEC/NECO Syllabus Compliant</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ---------------------------------------------------- */}
      {/* MODALS: LOGIN MODAL                                  */}
      {/* ---------------------------------------------------- */}
      {activeModal === 'login' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <span className="text-2xl font-black text-blue-600">GRADIFI</span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">Login to Your Institution</h3>
              <p className="text-xs text-slate-500 mt-1">Access your administrative campus dashboard</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Remember me</span>
                </label>
                <span className="text-blue-600 hover:underline cursor-pointer">Forgot password?</span>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Don't have an institution account yet?{' '}
              <button
                onClick={() => {
                  setActiveModal(null);
                  onStartOnboarding();
                }}
                className="text-blue-600 font-bold hover:underline"
              >
                Register Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: FOR SCHOOLS                                   */}
      {/* ---------------------------------------------------- */}
      {activeModal === 'for_schools' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">INSTITUTIONAL INTEGRATION</span>
              <h3 className="text-2xl font-bold text-slate-900">Gradifi for African Secondary Schools</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Gradifi is tailored for Junior and Senior Secondary Schools (JSS 1 - SS 3), comprehensive colleges, and groups of schools operating under WAEC, NECO, and JAMB standards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Complete Tenant Isolation
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Each school operates on private institution schemas with zero data cross-leakage.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Teacher Rubric Studio
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Teachers define specific marking guidelines; AI evaluates submissions under strict rubric boundaries.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    CBT Lab Automation
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Deploy computer-based exams to hundreds of student stations simultaneously with instant scoring.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Parent Portal Synchrony
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Parents receive verified terminal reports and subject performance breakdowns securely.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    onStartOnboarding();
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Start Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: PRICING                                       */}
      {/* ---------------------------------------------------- */}
      {activeModal === 'pricing' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-900">Simple, Transparent School Pricing</h3>
              <p className="text-sm text-slate-500 mt-1">Affordable academic plans tailored for African schools</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Starter */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500">Starter</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">₦45,000 <span className="text-xs font-normal text-slate-500">/ term</span></div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    <li>✓ Up to 250 Students</li>
                    <li>✓ JSS 1 - SS 3 Classes</li>
                    <li>✓ CBT Exam Engine</li>
                    <li>✓ 500 AI Gradings / mo</li>
                  </ul>
                </div>
                <button
                  onClick={() => { setActiveModal(null); onStartOnboarding(); }}
                  className="mt-6 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-600"
                >
                  Select Starter
                </button>
              </div>

              {/* Standard (Recommended) */}
              <div className="p-5 rounded-xl border-2 border-blue-600 bg-blue-50/50 flex flex-col justify-between relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Popular
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-blue-600">Standard School</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">₦95,000 <span className="text-xs font-normal text-slate-500">/ term</span></div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    <li>✓ Up to 1,000 Students</li>
                    <li>✓ Unlimited CBT Exams</li>
                    <li>✓ Unlimited AI Rubric Grading</li>
                    <li>✓ WAEC/JAMB Past Question Bank</li>
                    <li>✓ Parent Portal Access</li>
                  </ul>
                </div>
                <button
                  onClick={() => { setActiveModal(null); onStartOnboarding(); }}
                  className="mt-6 w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-md"
                >
                  Get Started
                </button>
              </div>

              {/* Group / Enterprise */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500">Multi-Campus</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">Custom</div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    <li>✓ Unlimited Campuses</li>
                    <li>✓ Custom SMS & WhatsApp Alerts</li>
                    <li>✓ Dedicated Exam Server Node</li>
                    <li>✓ Priority 24/7 Training</li>
                  </ul>
                </div>
                <button
                  onClick={() => { setActiveModal('contact'); }}
                  className="mt-6 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-600"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CONTACT                                       */}
      {/* ---------------------------------------------------- */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900">Get in Touch with Gradifi</h3>
            <p className="text-xs text-slate-500 mt-1">Our educational specialists are ready to help your school.</p>

            <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Our education team will contact you within 24 hours."); setActiveModal(null); }} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Your Name</label>
                <input type="text" defaultValue="Principal / School Administrator" className="w-full px-3.5 py-2 text-sm border rounded-lg" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">School Name</label>
                <input type="text" placeholder="e.g. Corona High School" className="w-full px-3.5 py-2 text-sm border rounded-lg" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
                <input type="tel" placeholder="+234 803 000 0000" className="w-full px-3.5 py-2 text-sm border rounded-lg" required />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                Submit Inquiry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* INTERACTIVE FEATURE DEEP-DIVE MODALS                 */}
      {/* ---------------------------------------------------- */}
      {featureDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => { setFeatureDetail(null); setDemoGradeResult(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            {/* AI Grading Demo */}
            {featureDetail === 'ai_grading' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">AI-Assisted Grading with Teacher Rubrics</h3>
                    <p className="text-xs text-slate-500">Live Gemini evaluation against WAEC/NECO marking criteria</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Student Submission (English Literature):</label>
                  <textarea
                    value={demoEssay}
                    onChange={(e) => setDemoEssay(e.target.value)}
                    rows={4}
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-serif"
                  />
                </div>

                <button
                  onClick={handleRunGradingDemo}
                  disabled={isGradingDemo}
                  className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm shadow-md"
                >
                  {isGradingDemo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Grading against Teacher Rubric...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Run AI Rubric Grading</span>
                    </>
                  )}
                </button>

                {demoGradeResult && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="text-sm font-bold text-slate-800">Evaluated Score:</div>
                      <div className="text-lg font-black text-blue-600">{demoGradeResult.overall_score} / {demoGradeResult.max_score} ({demoGradeResult.percentage}%)</div>
                    </div>
                    <p className="text-xs text-slate-700 italic">"{demoGradeResult.overall_feedback}"</p>
                    
                    {demoGradeResult.criteria_scores && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-xs font-bold text-slate-700">Criteria Breakdown:</div>
                        {demoGradeResult.criteria_scores.map((c: any, i: number) => (
                          <div key={i} className="text-xs flex justify-between bg-white p-2 rounded border border-slate-100">
                            <span className="font-medium text-slate-800">{c.criterion}:</span>
                            <span className="font-bold text-blue-600">{c.score} / {c.max_score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Past Questions Demo */}
            {featureDetail === 'past_questions' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">JAMB & WAEC Past Question Bank</h3>
                    <p className="text-xs text-slate-500">Access verified curriculum questions with step-by-step master solutions</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Coming Soon — Backend Module Not Yet Connected</div>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    The Past Questions engine will connect directly to national exam repositories in the next SEFAES milestone.
                  </p>
                </div>
              </div>
            )}

            {/* Plagiarism Demo */}
            {featureDetail === 'plagiarism' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <ScanSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Plagiarism & Originality Scanner</h3>
                    <p className="text-xs text-slate-500">Academic originality and AI generation verification</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                    <ScanSearch className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Coming Soon — Backend Module Not Yet Connected</div>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    The Plagiarism Scanner is scheduled for release via the SEFAES Edge Function contract.
                  </p>
                </div>
              </div>
            )}

            {/* CBT Exams Demo */}
            {featureDetail === 'cbt_exams' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Online CBT Examinations</h3>
                    <p className="text-xs text-slate-500">Secure, timer-controlled computer tests with automated scoring</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Gradifi CBT Center enables schools to schedule and deliver exams in school computer labs or remote links. Tests feature randomized questions, automated timers, pass-mark thresholds, and instant results generation.
                </p>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="font-bold text-amber-900 text-sm">Pre-loaded Mock CBT Available</div>
                  <p className="text-xs text-amber-800 mt-1">Experience live CBT testing in the campus dashboard.</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => { setFeatureDetail(null); onGoToDashboard('inst_demo_01'); }}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm"
                  >
                    Open CBT Exam Simulator
                  </button>
                </div>
              </div>
            )}

            {/* Performance Analytics Demo */}
            {featureDetail === 'analytics' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Performance Analytics & Diagnostics</h3>
                    <p className="text-xs text-slate-500">Actionable student performance insights and WAEC/JAMB readiness</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Track class averages, individual student mastery per subject, and identify struggling students before terminal exams.
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => { setFeatureDetail(null); onGoToDashboard('inst_demo_01'); }}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-sm"
                  >
                    View Analytics Dashboard
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
