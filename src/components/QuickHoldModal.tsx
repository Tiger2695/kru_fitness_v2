import React, { useState, useEffect } from 'react';
import { X, Search, PauseCircle, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { memberService, membershipService } from '../services/api';
import { Member } from '../types';
import { getTodayDateString, addDaysToDate, getDaysDifference, formatDate } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickHoldModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { activeGym } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Hold form state
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(addDaysToDate(getTodayDateString(), 7));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeGym) {
      loadActiveMembers();
      setSelectedMember(null);
      setSearch('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setStartDate(getTodayDateString());
      setEndDate(addDaysToDate(getTodayDateString(), 7));
      setReason('');
    }
  }, [isOpen, activeGym]);

  const loadActiveMembers = async () => {
    if (!activeGym) return;
    setLoadingMembers(true);
    try {
      const data = await memberService.getMembers(activeGym.id, { filter: 'active' });
      setMembers(data);
    } catch (err) {
      console.error('Failed to load active members for hold:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.member_code && m.member_code.toLowerCase().includes(q))
    );
  });

  const currentMembership = selectedMember?.current_membership;
  const holdDays = getDaysDifference(startDate, endDate);
  const currentExpiry = currentMembership?.end_date;
  const newExtendedExpiry = currentExpiry ? addDaysToDate(currentExpiry, holdDays) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGym || !selectedMember || !currentMembership) return;

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('Hold end date cannot be earlier than start date');
      return;
    }
    if (holdDays <= 0) {
      setErrorMsg('Hold duration must be at least 1 day');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await membershipService.holdMembership(activeGym.id, currentMembership.id, {
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      });

      setSuccessMsg(`Membership for ${selectedMember.name} has been paused until ${formatDate(endDate)}.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to put membership on hold. Please try again.');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Put Membership on Hold</h2>
              <p className="text-xs text-slate-500">Temporarily pause a member's active plan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMsg ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Membership Placed on Hold</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">{successMsg}</p>
            </div>
          ) : !selectedMember ? (
            /* Step 1: Member Selection */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Active Member to Put on Hold
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search member by name or mobile number..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {loadingMembers ? (
                  <div className="p-6 text-center text-xs text-slate-500">Loading active members...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No active members found.
                  </div>
                ) : (
                  filteredMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{m.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{m.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-teal-700">
                          {m.current_membership?.plan?.name || 'Active Plan'}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Expires: {formatDate(m.current_membership?.end_date)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Hold Details */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Selected Member Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{selectedMember.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedMember.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Change Member
                </button>
              </div>

              {/* Clear Explanation per Constitution Section 14 */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Original Expiry Date:</span>
                  <span className="font-semibold text-slate-900 font-mono">{formatDate(currentExpiry)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Hold Duration:</span>
                  <span className="font-semibold text-blue-700 font-mono">{holdDays} days</span>
                </div>
                <div className="flex justify-between text-slate-800 pt-1.5 border-t border-blue-200/60">
                  <span className="font-bold">Membership will be extended by:</span>
                  <span className="font-bold text-blue-800 font-mono">{holdDays} days</span>
                </div>
                {newExtendedExpiry && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>New Expiry Date:</span>
                    <span className="font-bold text-teal-700 font-mono">{formatDate(newExtendedExpiry)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Until <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Travel, Exams, Medical recovery..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors text-xs disabled:opacity-50 flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Holding...' : 'Confirm Hold'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
