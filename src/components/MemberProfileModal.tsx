import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  History,
  RotateCw,
  PauseCircle,
  PlayCircle,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { MemberDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { memberService, membershipService } from '../services/api';
import { formatINR, formatDate, formatDateTime, getMembershipStatusBadge, getDaysRemaining } from '../utils';
import { WhatsAppButton } from './WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

interface Props {
  isOpen: boolean;
  memberId: string | null;
  onClose: () => void;
  onCollectPayment: (member: any) => void;
  onRenew: (member: any) => void;
  onHold: (member: any) => void;
  onRefreshList: () => void;
}

export const MemberProfileModal: React.FC<Props> = ({
  isOpen,
  memberId,
  onClose,
  onCollectPayment,
  onRenew,
  onHold,
  onRefreshList,
}) => {
  const { activeGym } = useAuth();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'memberships' | 'payments' | 'attendance'>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && memberId && activeGym) {
      loadDetails();
    }
  }, [isOpen, memberId, activeGym]);

  const loadDetails = async () => {
    if (!activeGym || !memberId) return;
    setLoading(true);
    try {
      const data = await memberService.getMemberById(activeGym.id, memberId);
      setMember(data);
    } catch (err) {
      console.error('Failed to load member detail', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !memberId) return null;

  const currentMembership = member?.current_membership;
  const daysRemaining = currentMembership ? getDaysRemaining(currentMembership.end_date) : undefined;
  const badge = currentMembership
    ? getMembershipStatusBadge(currentMembership.status, daysRemaining)
    : { label: 'No Plan', className: 'bg-slate-100 text-slate-600' };

  const handleResumeMembership = async () => {
    if (!activeGym || !currentMembership) return;
    setActionLoading(true);
    try {
      await membershipService.resumeMembership(activeGym.id, currentMembership.id);
      await loadDetails();
      onRefreshList();
    } catch (err: any) {
      alert(err?.message || 'Failed to resume membership');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center font-bold text-base">
              {member ? member.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">{member?.name || 'Member Profile'}</h2>
                {member?.member_code && (
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    {member.member_code}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                <span className="font-mono">{member?.phone}</span>
                {member?.gender && <span>• {member.gender}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none p-1 rounded-xl"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading member details...</div>
        ) : member ? (
          <div>
            {/* Quick Action Bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
              {currentMembership && Number(currentMembership.remaining_amount) > 0 && (
                <button
                  onClick={() => onCollectPayment(member)}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Collect <span className="font-mono">{formatINR(currentMembership.remaining_amount)}</span></span>
                </button>
              )}

              <button
                onClick={() => onRenew(member)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Renew Membership</span>
              </button>

              {/* WhatsApp Quick Alerts */}
              {activeGym && (
                <>
                  {currentMembership && Number(currentMembership.remaining_amount) > 0 ? (
                    <WhatsAppButton
                      phone={member.phone}
                      message={whatsappTemplates.duePaymentReminder({
                        gymName: activeGym.name,
                        memberName: member.name,
                        dueAmount: Number(currentMembership.remaining_amount),
                        planName: currentMembership.plan?.name,
                        gymPhone: activeGym.phone,
                      })}
                      label="WhatsApp Due Alert"
                      title="Send fee balance reminder on WhatsApp"
                      variant="solid"
                      size="md"
                    />
                  ) : currentMembership ? (
                    <WhatsAppButton
                      phone={member.phone}
                      message={whatsappTemplates.membershipExpiry({
                        gymName: activeGym.name,
                        memberName: member.name,
                        planName: currentMembership.plan?.name || 'Gym',
                        endDate: currentMembership.end_date,
                        daysRemaining: getDaysRemaining(currentMembership.end_date),
                        gymPhone: activeGym.phone,
                      })}
                      label="WhatsApp Expiry Alert"
                      title="Send expiry reminder on WhatsApp"
                      variant="solid"
                      size="md"
                    />
                  ) : (
                    <WhatsAppButton
                      phone={member.phone}
                      message={`Namaste *${member.name}* ji! 🙏\nGreetings from *${activeGym.name}*.\n— Team *${activeGym.name}*`}
                      label="WhatsApp"
                      title="Send message on WhatsApp"
                      variant="solid"
                      size="md"
                    />
                  )}
                </>
              )}

              {currentMembership && currentMembership.status === 'active' && (
                <button
                  onClick={() => onHold(member)}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Hold Membership</span>
                </button>
              )}

              {currentMembership && currentMembership.status === 'on_hold' && (
                <button
                  onClick={handleResumeMembership}
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Resume Membership</span>
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 text-xs font-bold border-b-2 mr-6 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-teal-700 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overview & Financials
              </button>
              <button
                onClick={() => setActiveTab('memberships')}
                className={`py-3 text-xs font-bold border-b-2 mr-6 transition-colors ${
                  activeTab === 'memberships'
                    ? 'border-teal-700 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Membership History ({member.memberships.length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-3 text-xs font-bold border-b-2 mr-6 transition-colors ${
                  activeTab === 'payments'
                    ? 'border-teal-700 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Payment Receipts ({member.payments.length})
              </button>
              {activeGym?.attendance_enabled && (
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`py-3 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'attendance'
                      ? 'border-teal-700 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Attendance History ({member.attendance.length})
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Current Active Plan Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Membership</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    {currentMembership ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Plan</p>
                          <p className="text-sm font-bold text-slate-900">
                            {currentMembership.plan?.name || 'Standard'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Start Date</p>
                          <p className="text-sm font-bold text-slate-900 font-mono">{formatDate(currentMembership.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Expiry Date</p>
                          <p className="text-sm font-bold text-slate-900 font-mono">{formatDate(currentMembership.end_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">PT Status</p>
                          <p className="text-sm font-bold text-slate-900">
                            {currentMembership.pt_enabled ? 'Included' : 'None'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No active membership found. Click Renew to assign a plan.</p>
                    )}
                  </div>

                  {/* Financial Summary */}
                  {currentMembership && (
                    <div className="p-4 bg-blue-50/40 border border-blue-200/80 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">Financial Balance</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <p className="text-xs text-slate-500">Total Fee</p>
                          <p className="text-base font-extrabold text-slate-900 font-mono">{formatINR(currentMembership.total_fee)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <p className="text-xs text-slate-500">Paid Amount</p>
                          <p className="text-base font-extrabold text-emerald-700 font-mono">{formatINR(currentMembership.paid_amount)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <p className="text-xs text-slate-500">Remaining Balance</p>
                          <p
                            className={`text-base font-extrabold font-mono ${
                              Number(currentMembership.remaining_amount) > 0 ? 'text-amber-700' : 'text-slate-700'
                            }`}
                          >
                            {formatINR(currentMembership.remaining_amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Member Contact Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                      <h3 className="font-bold uppercase tracking-wider text-slate-500">Contact Details</h3>
                      <p className="text-slate-700"><strong>Mobile:</strong> <span className="font-mono">{member.phone}</span></p>
                      {member.email && <p className="text-slate-700"><strong>Email:</strong> {member.email}</p>}
                      {member.address && <p className="text-slate-700"><strong>Address:</strong> {member.address}</p>}
                      {member.date_of_birth && (
                        <p className="text-slate-700"><strong>DOB:</strong> <span className="font-mono">{formatDate(member.date_of_birth)}</span></p>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                      <h3 className="font-bold uppercase tracking-wider text-slate-500">Emergency & Remarks</h3>
                      {member.emergency_contact_name || member.emergency_contact_phone ? (
                        <p className="text-slate-700">
                          <strong>Contact:</strong> {member.emergency_contact_name} (<span className="font-mono">{member.emergency_contact_phone}</span>)
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">No emergency contact recorded</p>
                      )}
                      {member.notes && (
                        <p className="text-slate-700 pt-1">
                          <strong>Notes:</strong> {member.notes}
                        </p>
                      )}
                      <p className="text-slate-400 text-[11px] pt-1">Member since: <span className="font-mono">{formatDate(member.created_at)}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'memberships' && (
                <div className="space-y-3">
                  {member.memberships.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No membership history available.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Plan</th>
                            <th className="p-3">Period</th>
                            <th className="p-3">Total Fee</th>
                            <th className="p-3">Paid</th>
                            <th className="p-3">Balance</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {member.memberships.map(ms => (
                            <tr key={ms.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-900">{ms.plan?.name || 'Custom Plan'}</td>
                              <td className="p-3 text-slate-600 font-mono">
                                {formatDate(ms.start_date)} → {formatDate(ms.end_date)}
                              </td>
                              <td className="p-3 font-semibold font-mono">{formatINR(ms.total_fee)}</td>
                              <td className="p-3 text-emerald-700 font-semibold font-mono">{formatINR(ms.paid_amount)}</td>
                              <td className="p-3 font-semibold text-amber-800 font-mono">{formatINR(ms.remaining_amount)}</td>
                              <td className="p-3">
                                <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                                  {ms.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-3">
                  {member.payments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No payments recorded yet.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Reference / Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {member.payments.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-900 font-mono">{formatDate(p.payment_date)}</td>
                              <td className="p-3 font-bold text-emerald-700 font-mono">{formatINR(p.amount)}</td>
                              <td className="p-3">
                                <span className="uppercase px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded">
                                  {p.payment_method}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 font-mono">
                                {p.transaction_reference || p.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'attendance' && activeGym?.attendance_enabled && (
                <div className="space-y-3">
                  {member.attendance.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No attendance check-ins recorded.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date & Check-In</th>
                            <th className="p-3">Check-Out</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {member.attendance.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800 font-mono">{formatDateTime(a.check_in)}</td>
                              <td className="p-3 text-slate-600 font-mono">{formatDateTime(a.check_out) || 'Active (in gym)'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
