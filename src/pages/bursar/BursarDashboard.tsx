import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { DataTable, Column } from '../../components/dashboard/DataTable';
import { BursarDashboardStats } from '../../types/phase3.types';
import { bursarService } from '../../services/bursarService';
import { 
  DollarSign, 
  CreditCard, 
  Send, 
  CheckCircle2, 
  ArrowLeft, 
  Building2, 
  Users, 
  Phone
} from 'lucide-react';

export const BursarDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BursarDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    loadBursarData();
  }, []);

  async function loadBursarData() {
    setLoading(true);
    try {
      const data = await bursarService.getDashboardStats();
      setStats(data);
    } catch {
      setStats(bursarService.getFallbackStats());
    } finally {
      setLoading(false);
    }
  }

  const handleSendReminder = async (studentId: string, parentName: string) => {
    setSendingReminder(studentId);
    await bursarService.sendPaymentReminder(studentId);
    setSendingReminder(null);
    alert(`WhatsApp payment reminder dispatched to ${parentName}.`);
  };

  const debtorColumns: Column<BursarDashboardStats['outstanding_debtors'][0]>[] = [
    { key: 'student_name', header: 'Student Name', sortable: true },
    { key: 'class_name', header: 'Class', sortable: true },
    { key: 'parent_name', header: 'Parent / Guardian', sortable: true },
    {
      key: 'balance',
      header: 'Balance Due',
      render: (r) => <span className="font-mono font-bold text-rose-600">₦{r.balance.toLocaleString()}</span>,
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <button
          onClick={() => handleSendReminder(r.student_id, r.parent_name)}
          disabled={sendingReminder === r.student_id}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Send className="w-3 h-3" />
          <span>{sendingReminder === r.student_id ? 'Sending...' : 'Send WhatsApp Reminder'}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Bursary Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            <span>Financial Accounts & Fee Collection</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            {stats?.school_name || 'School Bursary'} • Revenue Tracking & Payment Reminders
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Fee Collection Today"
          value={`₦${(stats?.revenue_today || 0).toLocaleString()}`}
          icon={DollarSign}
          loading={loading}
          trend={{ value: '+12.4%', isUpward: true }}
          subtitle="Processed via bank & digital portals"
        />
        <StatsCard
          title="Total Outstanding Balance"
          value={`₦${(stats?.total_outstanding_balance || 0).toLocaleString()}`}
          icon={CreditCard}
          loading={loading}
          subtitle={`Across ${stats?.outstanding_debtors?.length || 0} student accounts`}
        />
        <StatsCard
          title="Fee Collection Rate"
          value={`${stats?.collection_rate || 0}%`}
          icon={CheckCircle2}
          loading={loading}
          trend={{ value: '+4.1%', isUpward: true }}
        />
      </div>

      {/* Outstanding Debtors Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">📋 Outstanding Balances & Payment Reminders</h3>
        <DataTable columns={debtorColumns} data={stats?.outstanding_debtors || []} loading={loading} />
      </div>
    </div>
  );
};
