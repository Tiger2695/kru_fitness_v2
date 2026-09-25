import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Users,
  AlertCircle,
  Calendar,
  BarChart3,
  Download,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { formatINR, formatDate, downloadCSV, getTodayDateString, addDaysToDate } from '../utils';

export const ReportsView: React.FC = () => {
  const { activeGym } = useAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    totalCollected: 0,
    ptRevenue: 0,
    membershipRevenue: 0,
    totalPendingFees: 0,
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    methodBreakdown: [] as { method: string; total: number }[],
  });

  useEffect(() => {
    if (activeGym) {
      loadReportData();
    }
  }, [activeGym, period]);

  const loadReportData = async () => {
    if (!activeGym) return;
    const client = getSupabaseClient();
    if (!client) return;

    setLoading(true);
    try {
      const todayStr = getTodayDateString();
      let startDateStr = '';

      if (period === 'today') {
        startDateStr = todayStr;
      } else if (period === 'week') {
        startDateStr = addDaysToDate(todayStr, -7);
      } else if (period === 'month') {
        startDateStr = addDaysToDate(todayStr, -30);
      }

      // 1. Payments query
      let paymentsQuery = client
        .from('payments')
        .select('amount, payment_method, payment_date')
        .eq('gym_id', activeGym.id);

      if (startDateStr) {
        paymentsQuery = paymentsQuery.gte('payment_date', startDateStr);
      }

      const { data: payments } = await paymentsQuery;

      const totalCollected = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Method breakdown
      const methodMap: Record<string, number> = {};
      (payments || []).forEach(p => {
        const m = p.payment_method || 'other';
        methodMap[m] = (methodMap[m] || 0) + Number(p.amount || 0);
      });

      const methodBreakdown = Object.entries(methodMap).map(([method, total]) => ({
        method: method.toUpperCase(),
        total,
      }));

      // 2. Memberships & Pending
      const { data: memberships } = await client
        .from('memberships')
        .select('total_fee, basic_fee, pt_fee, remaining_amount, status, end_date')
        .eq('gym_id', activeGym.id);

      const totalPendingFees = (memberships || []).reduce((sum, m) => sum + Number(m.remaining_amount || 0), 0);
      const activeMembers = (memberships || []).filter(m => m.status === 'active' && m.end_date >= todayStr).length;
      const expiredMembers = (memberships || []).filter(m => m.status === 'expired' || m.end_date < todayStr).length;
      const ptRevenue = (memberships || []).reduce((sum, m) => sum + Number(m.pt_fee || 0), 0);

      // 3. Total members
      let memberCount = 0;
      const memberCountRes = await client
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', activeGym.id)
        .eq('is_active', true);

      if (memberCountRes.error && memberCountRes.error.code === '42703') {
        const fallbackCount = await client
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('gym_id', activeGym.id);
        memberCount = fallbackCount.count || 0;
      } else {
        memberCount = memberCountRes.count || 0;
      }

      setMetrics({
        totalCollected,
        ptRevenue,
        membershipRevenue: Math.max(0, totalCollected - ptRevenue),
        totalPendingFees,
        totalMembers: memberCount || 0,
        activeMembers,
        expiredMembers,
        methodBreakdown,
      });
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSummary = () => {
    downloadCSV(`GymOS_Report_Summary_${activeGym?.name || 'gym'}_${period}.csv`, [
      {
        Metric: 'Total Collection',
        Value: metrics.totalCollected,
        Period: period,
      },
      {
        Metric: 'Total Outstanding / Pending Fees',
        Value: metrics.totalPendingFees,
        Period: period,
      },
      {
        Metric: 'Total Members Count',
        Value: metrics.totalMembers,
        Period: period,
      },
      {
        Metric: 'Active Members Count',
        Value: metrics.activeMembers,
        Period: period,
      },
      {
        Metric: 'Expired Members Count',
        Value: metrics.expiredMembers,
        Period: period,
      },
    ]);
  };

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#64748B', '#0F172A'];

  if (!activeGym) return null;

  return (
    <div className="space-y-6">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Gym Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cloud performance and revenue metrics for {activeGym.name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors capitalize ${
                  period === p ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'Last 7 Days' : p === 'month' ? 'Last 30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportSummary}
            className="flex items-center space-x-2 px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Revenue & Outstanding Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Collection</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{formatINR(metrics.totalCollected)}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Actual revenue collected</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding Fees</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">{formatINR(metrics.totalPendingFees)}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Remaining uncollected balance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Gym Members</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{metrics.activeMembers}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Out of <span className="font-mono">{metrics.totalMembers}</span> total registered</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Revenue by Payment Method</h2>
          </div>

          {metrics.methodBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No payments recorded in this period.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.methodBreakdown}>
                  <XAxis dataKey="method" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [formatINR(value), 'Revenue']} />
                  <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Member Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Member Status Breakdown</h2>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
              <span className="text-xs font-bold text-emerald-900">Active Members</span>
              <span className="text-base font-bold text-emerald-700 font-mono">{metrics.activeMembers}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50/50 border border-red-200/80">
              <span className="text-xs font-bold text-red-900">Expired Members</span>
              <span className="text-base font-bold text-red-700 font-mono">{metrics.expiredMembers}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Total Registered Members</span>
              <span className="text-base font-bold text-slate-900 font-mono">{metrics.totalMembers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
