import React, { useState, useEffect } from 'react';
import { PauseCircle, AlertCircle, Check, X } from 'lucide-react';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';
import { membershipService } from '../services/api';
import { getTodayDateString, addDaysToDate, getDaysDifference, formatDate } from '../utils';

interface Props {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const HoldMembershipModal: React.FC<Props> = ({ isOpen, member, onClose, onSuccess }) => {
  const { activeGym } = useAuth();
  const currentMembership = member?.current_membership;

  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(addDaysToDate(getTodayDateString(), 7));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(getTodayDateString());
      setEndDate(addDaysToDate(getTodayDateString(), 7));
      setReason('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !member || !currentMembership) return null;

  const holdDays = getDaysDifference(startDate, endDate);
  const currentExpiry = currentMembership.end_date;
  const newExtendedExpiry = currentExpiry ? addDaysToDate(currentExpiry, holdDays) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeGym) return;
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('Hold end date cannot be earlier than start date');
      return;
    }
    if (holdDays <= 0) {
      setErrorMsg('Hold duration must be at least 1 day');
      return;
    }

    setSaving(true);

    try {
      await membershipService.holdMembership(activeGym.id, currentMembership.id, {
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to put membership on hold.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Put Membership on Hold</h2>
              <p className="text-xs text-slate-500">{member.name} • <span className="font-mono">{member.phone}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form (Constitution Section 14) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Clear Explanation per Constitution Section 14 */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
            <p className="font-semibold text-slate-900 leading-relaxed">
              This membership will be paused from <span className="font-bold text-blue-900">{formatDate(startDate)}</span> to <span className="font-bold text-blue-900">{formatDate(endDate)}</span>.
            </p>
            <p className="text-slate-700 font-semibold">
              The membership will be extended by <span className="font-bold text-blue-900">{holdDays}</span> days.
            </p>
            {newExtendedExpiry && (
              <p className="text-[11px] text-slate-500 pt-1 border-t border-blue-200/60">
                New Expiry Date: <span className="font-mono font-bold text-teal-700">{formatDate(newExtendedExpiry)}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date <span className="text-red-500">*</span>
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
                End Date <span className="text-red-500">*</span>
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
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors text-xs disabled:opacity-50 flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Placing on Hold...' : 'Put on Hold'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
