import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/home/HomePage';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthGuard } from './components/AuthGuard';

// Phase 3: Dashboards
import { PrincipalDashboard } from './pages/principal/PrincipalDashboard';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ParentDashboard } from './pages/parent/ParentDashboard';
import { BursarDashboard } from './pages/bursar/BursarDashboard';
import { VPDashboard } from './pages/vp/VPDashboard';

// Phase 4: AI Grading & CBT
import { GradingQueue } from './pages/grading/GradingQueue';
import { GradingReview } from './pages/grading/GradingReview';
import { CBTExamBuilder } from './pages/cbt/CBTExamBuilder';
import { CBTExamRunner } from './pages/cbt/CBTExamRunner';
import { CBTExamManager } from './pages/cbt/CBTExamManager';
import { CBTResultsViewer } from './pages/cbt/CBTResultsViewer';

// Phase 5: Writing Tools
import { WritingToolsHubPage } from './pages/writing/WritingToolsHubPage';
import { WordCounterPage } from './pages/writing/WordCounterPage';
import { ParaphraserPage } from './pages/writing/ParaphraserPage';
import { ReadabilityCheckerPage } from './pages/writing/ReadabilityCheckerPage';
import { CitationGeneratorPage } from './pages/writing/CitationGeneratorPage';
import { SummarizerPage } from './pages/writing/SummarizerPage';

import { OfflineStatus } from './components/OfflineStatus';

import { PlagiarismPage } from './pages/writing/PlagiarismPage';

import { GradingEngineTestPage } from './pages/grading/GradingEngineTestPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Phase 1: Public Homepage */}
        <Route 
          path="/" 
          element={<HomePage />} 
        />
        
        {/* Public Grading Engine Test Page */}
        <Route path="/grading/engine-test" element={<GradingEngineTestPage />} />
        <Route path="/test-grading.html" element={<GradingEngineTestPage />} />
        
        {/* Phase 2: Onboarding (No Auth Required) */}
        <Route path="/onboarding" element={<OnboardingWizard />} />
        
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Phase 3: Dashboards (Auth Required) */}
        <Route path="/portal" element={<AuthGuard />}>
          <Route path="principal" element={<PrincipalDashboard />} />
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="student" element={<StudentDashboard />} />
          <Route path="parent" element={<ParentDashboard />} />
          <Route path="bursar" element={<BursarDashboard />} />
          <Route path="vp" element={<VPDashboard />} />
        </Route>

        <Route path="/dashboard" element={<AuthGuard><PrincipalDashboard /></AuthGuard>} />
        
        {/* Phase 4: AI Grading & CBT (Auth Required) */}
        <Route path="/grading" element={<AuthGuard />}>
          <Route path="queue" element={<GradingQueue />} />
          <Route path="review/:scriptId" element={<GradingReview />} />
        </Route>
        
        <Route path="/cbt" element={<AuthGuard />}>
          <Route path="builder" element={<CBTExamBuilder />} />
          <Route path="builder/:examId" element={<CBTExamBuilder />} />
          <Route path="runner/:examId" element={<CBTExamRunner />} />
          <Route path="results/:examId" element={<CBTResultsViewer />} />
          <Route path="manager" element={<CBTExamManager />} />
        </Route>
        
        {/* Phase 5: Writing Tools (Public - No Auth Required) */}
        <Route path="/tools" element={<WritingToolsHubPage />} />
        <Route path="/tools/plagiarism" element={<PlagiarismPage />} />
        <Route path="/tools/word-counter" element={<WordCounterPage />} />
        <Route path="/tools/paraphraser" element={<ParaphraserPage />} />
        <Route path="/tools/readability" element={<ReadabilityCheckerPage />} />
        <Route path="/tools/readability-checker" element={<ReadabilityCheckerPage />} />
        <Route path="/tools/citation" element={<CitationGeneratorPage />} />
        <Route path="/tools/citation-generator" element={<CitationGeneratorPage />} />
        <Route path="/tools/summarizer" element={<SummarizerPage />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <OfflineStatus />
    </BrowserRouter>
  );
}

export default App;
