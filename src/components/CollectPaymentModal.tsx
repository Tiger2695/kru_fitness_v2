import React, { useState, useEffect } from 'react';
import { IndianRupee, AlertCircle, Check, X } from 'lucide-react';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/api';
import { formatINR, getTodayDateString } from '../utils';
import { WhatsAppButton } from './WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

interface Props {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CollectPaymentModal: React.FC<Props> = ({ isOpen, member, onClose, onSuccess }) => {
  const { activeGym } = useAuth();
  const currentMembership = member?.current_membership;

  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other'>('UPI');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && currentMembership) {
      const outstanding = Number(currentMembership.remaining_amount || 0);
      setAmount(outstanding);
      setPaymentDate(getTodayDateString());
      setReference('');
      setNotes('');
      setErrorMsg(null);
      setIsSuccess(false);
    }
  }, [isOpen, currentMembership]);

  if (!isOpen || !member || !currentMembership) return null;

  const outstanding = Number(currentMembership.remaining_amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeGym) return;
    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than 0');
      return;
    }
    if (amount > outstanding) {
      setErrorMsg(`Amount cannot exceed remaining fee of ${formatINR(outstanding)}`);
      return;
    }

    setSaving(true);

    try {
      await paymentService.collectPayment(activeGym.id, {
        member_id: member.id,
        membership_id: currentMembership.id,
        amount: amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        transaction_reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record payment. Please try again.');
      setSaving(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Collect Payment</h2>
              <p className="text-xs text-slate-500">
                {member.name} • <span className="font-mono">{member.phone}</span>
              </p>
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
        {isSuccess ? (
          /* Confirmation Screen with WhatsApp Receipt */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Payment recorded successfully ✓
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Collected <span className="font-bold text-slate-800 font-mono">{formatINR(amount)}</span> from {member.name}
              </p>
            </div>

            {/* WhatsApp Receipt Action */}
            {activeGym && (
              <div className="pt-2 flex flex-col items-center gap-2">
                <WhatsAppButton
                  phone={member.phone}
                  message={whatsappTemplates.paymentReceipt({
                    gymName: activeGym.name,
                    memberName: member.name,
                    amount: amount,
                    paymentMethod: paymentMethod,
                    paymentDate: paymentDate,
                    receiptNo: reference || undefined,
                    planName: currentMembership?.plan?.name,
                    remainingDue: Math.max(0, outstanding - amount),
                    gymPhone: activeGym.phone,
                  })}
                  label="Send WhatsApp Receipt"
                  title="Send receipt to member via WhatsApp"
                  size="md"
                  variant="solid"
                  className="w-full justify-center py-2.5"
                />
                <button
                  type="button"
                  onClick={handleDone}
                  className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Payment Form (Constitution Section 12) */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Remaining Fee */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">Remaining Fee:</span>
              <span className="text-lg font-bold text-amber-950 font-mono">{formatINR(outstanding)}</span>
            </div>

            {/* Amount Paid Today */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Paid Today (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                autoFocus
                min={1}
                max={outstanding}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-base font-bold text-slate-900 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white"
              />
              {amount < outstanding && amount > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Remaining after payment: <strong className="font-mono">{formatINR(outstanding - amount)}</strong>
                </p>
              )}
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'UPI', label: 'UPI / GPay / PhonePe' },
                  { id: 'cash', label: 'Cash' },
                  { id: 'card', label: 'Card' },
                  { id: 'bank_transfer', label: 'Bank Transfer' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPaymentMethod(item.id as any)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-colors ${
                      paymentMethod === item.id
                        ? 'bg-teal-50 border-teal-700 text-teal-900 ring-1 ring-teal-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UPI / Cheque Ref.</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Cleared 2nd installment"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white"
              />
            </div>

            {/* Primary button: Save Payment (Constitution Section 12) */}
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
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-colors text-xs disabled:opacity-50 flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving Payment...' : 'Save Payment'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
