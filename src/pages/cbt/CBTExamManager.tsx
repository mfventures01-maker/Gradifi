import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CBTExam } from '../../types/phase4.types';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  Edit3, 
  Play, 
  BarChart2, 
  Copy, 
  Archive, 
  FileCheck 
} from 'lucide-react';

export const CBTExamManager: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const sampleExams: CBTExam[] = [
    {
      id: 'ex_101',
      title: 'WAEC Mathematics Mock Examination 2026',
      subjectName: 'Mathematics',
      className: 'JSS 3 Gold',
      durationMinutes: 60,
      passMarkPercentage: 50,
      examDate: '2026-08-25',
      status: 'Active',
      totalQuestions: 50,
      totalMarks: 100,
      totalStudents: 42,
      averageScore: 72.4,
    },
    {
      id: 'ex_102',
      title: 'AP Literature Essay & Quiz #3',
      subjectName: 'English Language',
      className: 'SS 1 Emerald',
      durationMinutes: 45,
      passMarkPercentage: 50,
      examDate: '2026-08-28',
      status: 'Published',
      totalQuestions: 20,
      totalMarks: 50,
      totalStudents: 35,
    },
    {
      id: 'ex_103',
      title: 'Basic Science End of Term Exam',
      subjectName: 'Basic Science',
      className: 'JSS 1 Ruby',
      durationMinutes: 45,
      passMarkPercentage: 50,
      examDate: '2026-08-10',
      status: 'Completed',
      totalQuestions: 30,
      totalMarks: 60,
      totalStudents: 38,
      averageScore: 81.2,
    },
  ];

  const filteredExams = sampleExams.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.className.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || ex.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/portal/teacher')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Teacher Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-indigo-600" />
            <span>CBT Examination Manager</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Create, schedule, administer, and analyze CBT assessments.
          </p>
        </div>

        <button
          onClick={() => navigate('/cbt/builder')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New CBT Exam</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search exams, subjects, classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Published">Published</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {exam.subjectName} • {exam.className}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    exam.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : exam.status === 'Completed'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {exam.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h3>

              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                <span>⏱️ {exam.durationMinutes} mins</span>
                <span>❓ {exam.totalQuestions} Questions</span>
                <span>👥 {exam.totalStudents || 0} Enrolled</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => navigate(`/cbt/runner/${exam.id}`)}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Runner</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/cbt/results/${exam.id}`)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  title="View Analytics & Results"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(`/cbt/builder/${exam.id}`)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  title="Edit Exam"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
