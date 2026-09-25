import React, { useState, useEffect } from 'react';
import { X, Search, IndianRupee, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { memberService, paymentService } from '../services/api';
import { Member } from '../types';
import { formatINR, getTodayDateString } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickPaymentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { activeGym } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Payment form state
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other'>('UPI');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeGym) {
      loadMembersWithDue();
      setSelectedMember(null);
      setSearch('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setAmount(0);
      setReference('');
      setNotes('');
      setPaymentDate(getTodayDateString());
    }
  }, [isOpen, activeGym]);

  const loadMembersWithDue = async () => {
    if (!activeGym) return;
    setLoadingMembers(true);
    try {
      // First load members with pending payment
      const pending = await memberService.getMembers(activeGym.id, { filter: 'pending_payment' });
      // If none, load all active members
      if (pending.length > 0) {
        setMembers(pending);
      } else {
        const all = await memberService.getMembers(activeGym.id, { filter: 'active' });
        setMembers(all);
      }
    } catch (err) {
      console.error('Failed to load members for payment:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  if (!isOpen || !activeGym) return null;

  const handleSelectMember = (m: Member) => {
    setSelectedMember(m);
    const outstanding = Number(m.current_membership?.remaining_amount || 0);
    setAmount(outstanding > 0 ? outstanding : 1000);
    setErrorMsg(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !activeGym) return;

    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than ₹0');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await paymentService.collectPayment(activeGym.id, {
        member_id: selectedMember.id,
        membership_id: selectedMember.current_membership?.id,
        amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        transaction_reference: reference || undefined,
        notes: notes || 'Quick payment log from dashboard',
      });

      setSuccessMsg('Payment recorded successfully ✓');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(s) ||
      m.phone.includes(s) ||
      (m.member_code && m.member_code.toLowerCase().includes(s))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Collect Payment</h2>
              <p className="text-xs text-slate-500">Record cash, UPI or card fee collection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200/80 text-red-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!selectedMember ? (
            /* Step 1: Select Member */
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Select member to log payment (name, phone)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-sans"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {loadingMembers ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading members...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No matching members found.
                  </div>
                ) : (
                  filteredMembers.map(m => {
                    const due = Number(m.current_membership?.remaining_amount || 0);
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMember(m)}
                        className="w-full py-2.5 px-3 flex items-center justify-between text-left hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{m.phone}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {due > 0 ? (
                            <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                              Due: {formatINR(due)}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              No balance due
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Payment Details */
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900">{selectedMember.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedMember.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Change Member
                </button>
              </div>

              {Number(selectedMember.current_membership?.remaining_amount || 0) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex justify-between items-center text-xs">
                  <span className="text-amber-800 font-medium">Outstanding Balance:</span>
                  <span className="font-black text-amber-900 font-mono">
                    {formatINR(selectedMember.current_membership?.remaining_amount)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Collection Amount (₹)*
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-xl text-base font-black text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Method*</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date*</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ref / UTR ID (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="UPI Ref ID, Txn No, or Receipt No"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                >
                  {submitting ? 'Saving Payment...' : 'Save Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
