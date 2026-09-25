import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Clock,
  CheckCircle2,
  Database,
  Plus,
  Download,
  Upload,
  IndianRupee,
  FileSpreadsheet,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gymService, planService, memberService, paymentService } from '../services/api';
import { getSupabaseClient } from '../lib/supabase';
import { MembershipPlan } from '../types';
import { formatINR, downloadCSV, getTodayDateString } from '../utils';
import { ExcelImportModal } from '../components/ExcelImportModal';

interface Props {
  onOpenDatabaseSetup: () => void;
}

export const SettingsView: React.FC<Props> = ({ onOpenDatabaseSetup }) => {
  const { activeGym, refreshGyms, connectionStatus } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // New Plan form state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDays, setNewPlanDays] = useState(30);
  const [newPlanPrice, setNewPlanPrice] = useState(1500);
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Attendance toggle state
  const [togglingAttendance, setTogglingAttendance] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);

  // Excel Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    if (activeGym) {
      loadPlans();
    }
  }, [activeGym]);

  const loadPlans = async () => {
    if (!activeGym) return;
    setLoadingPlans(true);
    try {
      const data = await planService.getPlans(activeGym.id);
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleToggleAttendance = async () => {
    if (!activeGym) return;
    setTogglingAttendance(true);
    setAttendanceMsg(null);
    try {
      const nextState = !activeGym.attendance_enabled;
      await gymService.toggleAttendance(activeGym.id, nextState);
      await refreshGyms();
      setAttendanceMsg(
        nextState
          ? 'Attendance module has been enabled for this gym.'
          : 'Attendance module disabled. Attendance menus and cards are now hidden.'
      );
    } catch (err: any) {
      setAttendanceMsg(err?.message || 'Failed to update attendance preference.');
    } finally {
      setTogglingAttendance(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGym || !newPlanName.trim()) return;

    setSavingPlan(true);
    try {
      await planService.createPlan(activeGym.id, {
        name: newPlanName.trim(),
        duration_days: newPlanDays,
        price: newPlanPrice,
        description: newPlanDesc.trim() || undefined,
      });

      setNewPlanName('');
      setNewPlanDays(30);
      setNewPlanPrice(1500);
      setNewPlanDesc('');
      await loadPlans();
    } catch (err: any) {
      alert(err?.message || 'Failed to create plan');
    } finally {
      setSavingPlan(false);
    }
  };

  // Section 19: Export CSVs
  const handleExportMembers = async () => {
    if (!activeGym) return;
    const members = await memberService.getMembers(activeGym.id, { filter: 'all' });
    const rows = members.map(m => ({
      'Member Code': m.member_code || '',
      'Name': m.name,
      'Phone': m.phone,
      'Email': m.email || '',
      'Gender': m.gender || '',
      'Current Plan': m.current_membership?.plan?.name || '',
      'Start Date': m.current_membership?.start_date || '',
      'End Date': m.current_membership?.end_date || '',
      'Total Fee (INR)': m.current_membership?.total_fee || 0,
      'Paid Fee (INR)': m.current_membership?.paid_amount || 0,
      'Remaining Fee (INR)': m.current_membership?.remaining_amount || 0,
      'Status': m.current_membership?.status || 'inactive',
    }));
    downloadCSV(`KruFitness_Members_${activeGym.name}_${getTodayDateString()}.csv`, rows);
  };

  const handleExportPayments = async () => {
    if (!activeGym) return;
    const payments = await paymentService.getPayments(activeGym.id);
    const rows = payments.map(p => ({
      'Payment ID': p.id,
      'Date': p.payment_date,
      'Member': p.member?.name || '',
      'Phone': p.member?.phone || '',
      'Amount (INR)': p.amount,
      'Method': p.payment_method,
      'Reference': p.transaction_reference || '',
      'Notes': p.notes || '',
    }));
    downloadCSV(`KruFitness_Payments_${activeGym.name}_${getTodayDateString()}.csv`, rows);
  };

  const handleExportMemberships = async () => {
    if (!activeGym) return;
    const client = getSupabaseClient();
    if (!client) return;

    const { data } = await client
      .from('memberships')
      .select('*, member:members(name, phone), plan:membership_plans(name)')
      .eq('gym_id', activeGym.id);

    const rows = (data || []).map((ms: any) => ({
      'Membership ID': ms.id,
      'Member Name': ms.member?.name || '',
      'Phone': ms.member?.phone || '',
      'Plan': ms.plan?.name || '',
      'Start Date': ms.start_date,
      'End Date': ms.end_date,
      'Status': ms.status,
      'Total Fee': ms.total_fee,
      'Paid Fee': ms.paid_amount,
      'Remaining Fee': ms.remaining_amount,
    }));
    downloadCSV(`KruFitness_Memberships_${activeGym.name}_${getTodayDateString()}.csv`, rows);
  };

  if (!activeGym) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-black text-slate-900">Gym Settings & Tools</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure attendance, membership plans, data backup exports, and cloud sync
        </p>
      </div>

      {/* Attendance Module Configuration (Section 9 Requirement) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Optional Attendance Module</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle member attendance tracking for your gym. If disabled, all attendance UI is hidden.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleAttendance}
            disabled={togglingAttendance}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeGym.attendance_enabled
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                : 'bg-teal-700 text-white hover:bg-teal-800'
            }`}
          >
            {togglingAttendance
              ? 'Updating...'
              : activeGym.attendance_enabled
              ? 'Disable Attendance'
              : 'Enable Attendance'}
          </button>
        </div>

        {attendanceMsg && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
            {attendanceMsg}
          </div>
        )}
      </div>

      {/* Membership Plans Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-slate-900">Membership Plans</h2>
        <p className="text-xs text-slate-500">
          Plans available for member registrations and renewals at {activeGym.name}
        </p>

        {/* Existing plans list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => (
            <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="text-sm font-bold text-slate-900">{p.name}</p>
              <p className="text-lg font-black text-teal-700 font-mono">{formatINR(p.price)}</p>
              <p className="text-xs text-slate-500 font-medium"><span className="font-mono">{p.duration_days}</span> days validity</p>
              {p.description && <p className="text-[11px] text-slate-400 pt-1">{p.description}</p>}
            </div>
          ))}
        </div>

        {/* Create new plan form */}
        <form onSubmit={handleCreatePlan} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">+ Create Custom Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
              <input
                type="text"
                required
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
                placeholder="e.g. 2 Months Special"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Days)</label>
              <input
                type="number"
                required
                min={1}
                value={newPlanDays}
                onChange={e => setNewPlanDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={newPlanPrice}
                onChange={e => setNewPlanPrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-700 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingPlan}
                className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                {savingPlan ? 'Saving...' : 'Add Plan'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* CSV Data Export */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Export Gym Data (CSV)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Never locked in. Download your complete member, fee, and transaction lists in Excel/CSV format.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportMembers}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center space-x-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <span>Export Members CSV</span>
          </button>

          <button
            onClick={handleExportPayments}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center space-x-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <span>Export Payments CSV</span>
          </button>

          <button
            onClick={handleExportMemberships}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center space-x-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <span>Export Memberships CSV</span>
          </button>
        </div>
      </div>

      {/* Excel / CSV Import (Batch Tool) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import Members from Excel / CSV</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Migrate easily from manual Excel registers with column mapping, data preview, and validation.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs active:scale-98"
          >
            Open Import Wizard
          </button>
        </div>
      </div>

      {/* Cloud Synchronization & Data Security */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Cloud Storage & Synchronization</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Status: {connectionStatus?.connected ? 'Encrypted cloud database connected and active' : 'Configuration required'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenDatabaseSetup}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-800 rounded-xl transition-colors"
          >
            Manage Connection
          </button>
        </div>
      </div>

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {}}
      />
    </div>
  );
};
