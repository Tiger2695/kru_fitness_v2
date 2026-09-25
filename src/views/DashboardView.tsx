import React, { useEffect, useState } from 'react';
import {
  Users,
  IndianRupee,
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowRight,
  UserPlus,
  RefreshCw,
  PauseCircle,
  RotateCw,
  Zap,
  UserCheck,
  CreditCard,
  PhoneCall,
  Dumbbell,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService, memberService } from '../services/api';
import { DashboardStats, Member } from '../types';
import { formatINR, formatDate, getDaysRemaining } from '../utils';
import { QuickCheckInModal } from '../components/QuickCheckInModal';
import { QuickPaymentModal } from '../components/QuickPaymentModal';
import { QuickHoldModal } from '../components/QuickHoldModal';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

interface Props {
  onNavigate: (view: string, filter?: string) => void;
  onOpenAddMember: () => void;
  onCollectPayment: (member: Member) => void;
  onRenew: (member: Member) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning 👋';
  if (hour < 17) return 'Good Afternoon 👋';
  return 'Good Evening 👋';
}

export const DashboardView: React.FC<Props> = ({
  onNavigate,
  onOpenAddMember,
  onCollectPayment,
  onRenew,
}) => {
  const { activeGym } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attentionMembers, setAttentionMembers] = useState<{
    pending: Member[];
    expiring: Member[];
  }>({ pending: [], expiring: [] });

  // Quick action modals
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);
  const [isQuickHoldOpen, setIsQuickHoldOpen] = useState(false);

  useEffect(() => {
    if (activeGym) {
      loadDashboard();
    }
  }, [activeGym]);

  const loadDashboard = async () => {
    if (!activeGym) return;
    setLoading(true);
    setLoadError(null);

    try {
      const data = await dashboardService.getStats(activeGym.id, !!activeGym.attendance_enabled);
      setStats(data);

      // Load actionable members for Today's Attention
      const [pendingList, expiringList] = await Promise.all([
        memberService.getMembers(activeGym.id, { filter: 'pending_payment' }),
        memberService.getMembers(activeGym.id, { filter: 'expiring' }),
      ]);

      setAttentionMembers({
        pending: pendingList.slice(0, 5),
        expiring: expiringList.slice(0, 5),
      });
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setLoadError(err?.message || 'We could not load dashboard information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeGym) return null;

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP GREETING HEADER (Compact & Focused) */}
      {/* ========================================================================= */}
      <div className="bg-white px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {getGreeting()}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Here's what needs your attention today.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          title="Refresh dashboard"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 flex items-center justify-center shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadDashboard}
            className="self-start sm:self-auto px-3 py-1 bg-amber-200 hover:bg-amber-300 font-bold rounded-xl text-amber-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. KEY METRICS SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className={`grid grid-cols-2 ${activeGym.attendance_enabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5 sm:gap-3`}>
        {/* Active Members */}
        <div
          onClick={() => onNavigate('members', 'active')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Members</span>
            <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {loading ? '—' : stats?.activeMembers ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Currently active</p>
        </div>

        {/* Fees Due */}
        <div
          onClick={() => onNavigate('members', 'pending_payment')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fees Due</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
            {loading ? '—' : formatINR(stats?.pendingFees ?? 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {stats?.attentionItems.pendingFeesCount ?? 0} members pending
          </p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => onNavigate('renewals')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expiring Soon</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
            {loading ? '—' : stats?.expiringSoon ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Due within 7 days</p>
        </div>

        {/* Collected Today */}
        <div
          onClick={() => onNavigate('payments')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Collected Today</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            {loading ? '—' : formatINR(stats?.todayCollection ?? 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded today</p>
        </div>

        {/* Today's Attendance */}
        {activeGym.attendance_enabled && (
          <div
            onClick={() => onNavigate('attendance')}
            className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 transition-colors cursor-pointer col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Attendance</span>
              <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 font-mono">
              {loading ? '—' : stats?.todayAttendance ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Check-ins today</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. TODAY'S ATTENTION */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Today's Attention</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any category to open the filtered members list</p>
          </div>
        </div>

        {/* 4 Actionable summary triggers - Each directly opens the corresponding filtered member list */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Expiring Soon */}
          <div
            onClick={() => onNavigate('members', 'expiring')}
            className="p-3 sm:p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors"
          >
            <p className="text-xs font-semibold text-amber-900">Expiring Soon</p>
            <p className="text-lg sm:text-xl font-bold text-amber-900 font-mono mt-1">
              {stats?.attentionItems.expiringWithin7DaysCount || 0}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">Due in 7 days</p>
          </div>

          {/* Expired Memberships */}
          <div
            onClick={() => onNavigate('members', 'expired')}
            className="p-3 sm:p-3.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <p className="text-xs font-semibold text-red-900">Expired Memberships</p>
            <p className="text-lg sm:text-xl font-bold text-red-900 font-mono mt-1">
              {stats?.attentionItems.expiredCount || 0}
            </p>
            <p className="text-[11px] text-red-700 mt-0.5">Past expiry date</p>
          </div>

          {/* Pending Fees */}
          <div
            onClick={() => onNavigate('members', 'pending_payment')}
            className="p-3 sm:p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors"
          >
            <p className="text-xs font-semibold text-amber-900">Pending Fees</p>
            <p className="text-lg sm:text-xl font-bold text-amber-900 font-mono mt-1">
              {stats?.attentionItems.pendingFeesCount || 0}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">Members with balance</p>
          </div>

          {/* On Hold */}
          <div
            onClick={() => onNavigate('members', 'on_hold')}
            className="p-3 sm:p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <p className="text-xs font-semibold text-blue-900">On Hold</p>
            <p className="text-lg sm:text-xl font-bold text-blue-900 font-mono mt-1">
              {stats?.attentionItems.onHoldCount || 0}
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5">Currently paused</p>
          </div>
        </div>

        {/* Actionable Direct Lists OR Concise Empty State */}
        {attentionMembers.pending.length === 0 && attentionMembers.expiring.length === 0 ? (
          <div className="py-4 px-4 text-center rounded-xl bg-slate-50/80 border border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
            <span className="text-xs font-bold text-slate-700">You're all caught up 🎉</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-xs text-slate-500">No members currently need attention.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* Pending Fees List */}
            <div className="border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Pending Fees ({attentionMembers.pending.length})
                </h3>
                <button
                  onClick={() => onNavigate('members', 'pending_payment')}
                  className="text-xs text-teal-700 hover:underline font-semibold flex items-center space-x-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {attentionMembers.pending.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-medium">
                  No pending payments 🎉
                </div>
              ) : (
                <div className="space-y-2">
                  {attentionMembers.pending.map(m => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{m.phone}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className="text-xs font-bold text-amber-700 font-mono mr-1">
                          {formatINR(m.current_membership?.remaining_amount)}
                        </span>
                        <WhatsAppButton
                          phone={m.phone}
                          message={whatsappTemplates.duePaymentReminder({
                            gymName: activeGym.name,
                            memberName: m.name,
                            dueAmount: Number(m.current_membership?.remaining_amount || 0),
                            planName: m.current_membership?.plan?.name,
                            gymPhone: activeGym.phone,
                          })}
                          title="Send fee balance reminder on WhatsApp"
                          variant="subtle"
                        />
                        <button
                          onClick={() => onCollectPayment(m)}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-95 transition-all"
                        >
                          Collect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring Soon List */}
            <div className="border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Expiring Within 7 Days ({attentionMembers.expiring.length})
                </h3>
                <button
                  onClick={() => onNavigate('members', 'expiring')}
                  className="text-xs text-teal-700 hover:underline font-semibold flex items-center space-x-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {attentionMembers.expiring.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-medium">
                  No memberships expiring soon 👍
                </div>
              ) : (
                <div className="space-y-2">
                  {attentionMembers.expiring.map(m => {
                    const daysLeft = m.current_membership
                      ? getDaysRemaining(m.current_membership.end_date)
                      : 0;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Expires: <span className="font-mono">{formatDate(m.current_membership?.end_date)}</span> ({daysLeft}d left)
                          </p>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <WhatsAppButton
                            phone={m.phone}
                            message={whatsappTemplates.membershipExpiry({
                              gymName: activeGym.name,
                              memberName: m.name,
                              endDate: m.current_membership?.end_date || '',
                              daysRemaining: daysLeft,
                              planName: m.current_membership?.plan?.name || 'Gym',
                              gymPhone: activeGym.phone,
                            })}
                            title="Send renewal reminder on WhatsApp"
                            variant="subtle"
                          />
                          <button
                            onClick={() => onRenew(m)}
                            className="shrink-0 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-95 transition-all"
                          >
                            Renew
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. QUICK ACTIONS (Operational Shortcuts) */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Quick Actions</h2>
          <span className="text-[11px] text-slate-400">Daily operational shortcuts</span>
        </div>

        <div className={`grid grid-cols-2 ${activeGym.attendance_enabled ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-2.5 sm:gap-3`}>
          {/* 1. Add Member */}
          <button
            onClick={onOpenAddMember}
            className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-teal-50/60 hover:border-teal-300 text-left transition-all flex flex-col justify-between group"
          >
            <div className="p-2 bg-teal-700 text-white rounded-lg shadow-xs w-fit mb-2 group-hover:bg-teal-800 transition-colors">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Add Member</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Register new</p>
            </div>
          </button>

          {/* 2. Collect Payment */}
          <button
            onClick={() => setIsQuickPaymentOpen(true)}
            className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-emerald-50/60 hover:border-emerald-300 text-left transition-all flex flex-col justify-between group"
          >
            <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs w-fit mb-2 group-hover:bg-emerald-700 transition-colors">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Collect Payment</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Cash / UPI</p>
            </div>
          </button>

          {/* 3. Renew Membership */}
          <button
            onClick={() => onNavigate('renewals')}
            className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-amber-50/60 hover:border-amber-300 text-left transition-all flex flex-col justify-between group"
          >
            <div className="p-2 bg-amber-600 text-white rounded-lg shadow-xs w-fit mb-2 group-hover:bg-amber-700 transition-colors">
              <RotateCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Renew Membership</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Extend plan</p>
            </div>
          </button>

          {/* 4. Put on Hold */}
          <button
            onClick={() => setIsQuickHoldOpen(true)}
            className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50/60 hover:border-blue-300 text-left transition-all flex flex-col justify-between group"
          >
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs w-fit mb-2 group-hover:bg-blue-700 transition-colors">
              <PauseCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Put on Hold</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Pause membership</p>
            </div>
          </button>

          {/* 5. Check-in (ONLY if attendance enabled) */}
          {activeGym.attendance_enabled && (
            <button
              onClick={() => setIsCheckInOpen(true)}
              className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-teal-50/60 hover:border-teal-300 text-left transition-all flex flex-col justify-between col-span-2 sm:col-span-1 group"
            >
              <div className="p-2 bg-teal-600 text-white rounded-lg shadow-xs w-fit mb-2 group-hover:bg-teal-700 transition-colors">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">Check-in</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Log entry</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Quick Check-in Modal (Only when Attendance is enabled) */}
      {activeGym.attendance_enabled && (
        <QuickCheckInModal
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
          onSuccess={() => {
            loadDashboard();
          }}
        />
      )}

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={isQuickPaymentOpen}
        onClose={() => setIsQuickPaymentOpen(false)}
        onSuccess={() => {
          loadDashboard();
        }}
      />

      {/* Quick Hold Modal */}
      <QuickHoldModal
        isOpen={isQuickHoldOpen}
        onClose={() => setIsQuickHoldOpen(false)}
        onSuccess={() => {
          loadDashboard();
        }}
      />
    </div>
  );
};
