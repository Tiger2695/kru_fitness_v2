import React, { useState, useEffect } from 'react';
import { RotateCw, IndianRupee, Calendar, Check, AlertCircle } from 'lucide-react';
import { Member, MembershipPlan } from '../types';
import { useAuth } from '../context/AuthContext';
import { membershipService, planService } from '../services/api';
import { getTodayDateString, addDaysToDate, formatINR, calculateFinancials, formatDate } from '../utils';
import { WhatsAppButton } from './WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

interface Props {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RenewMembershipModal: React.FC<Props> = ({ isOpen, member, onClose, onSuccess }) => {
  const { activeGym } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayDateString());

  const [basicFee, setBasicFee] = useState<number>(0);
  const [ptEnabled, setPtEnabled] = useState<boolean>(false);
  const [ptFee, setPtFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other'>('UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('Renewed membership');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && activeGym) {
      loadPlans();
      setErrorMsg(null);
    }
  }, [isOpen, activeGym]);

  const loadPlans = async () => {
    if (!activeGym) return;
    try {
      const data = await planService.getPlans(activeGym.id);
      setPlans(data);
      if (data.length > 0) {
        // If member had a plan, select that or default to 1st
        const prevPlanId = member?.current_membership?.plan_id;
        const matchingPlan = data.find(p => p.id === prevPlanId) || data[0];

        setSelectedPlanId(matchingPlan.id);
        setBasicFee(Number(matchingPlan.price));
        setInitialPayment(Number(matchingPlan.price));

        // Start date: if member's current membership end date is in the future, start from the next day
        const currentEnd = member?.current_membership?.end_date;
        const todayStr = getTodayDateString();
        if (currentEnd && currentEnd >= todayStr) {
          setStartDate(addDaysToDate(currentEnd, 1));
        } else {
          setStartDate(todayStr);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const pPrice = Number(plan.price);
      setBasicFee(pPrice);
      const calc = calculateFinancials(pPrice, ptEnabled ? ptFee : 0, discount, pPrice + (ptEnabled ? ptFee : 0) - discount);
      setInitialPayment(calc.totalFee);
    }
  };

  if (!isOpen || !member) return null;

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const durationDays = selectedPlan?.duration_days || 30;
  const calculatedEndDate = addDaysToDate(startDate, durationDays);

  const financials = calculateFinancials(
    basicFee,
    ptEnabled ? ptFee : 0,
    discount,
    initialPayment
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeGym) return;
    if (!selectedPlanId) {
      setErrorMsg('Please select a membership plan');
      return;
    }
    if (initialPayment > financials.totalFee) {
      setErrorMsg('Payment amount cannot exceed total fee');
      return;
    }

    setSaving(true);

    try {
      await membershipService.renewMembership(activeGym.id, member.id, {
        plan_id: selectedPlanId,
        start_date: startDate,
        basic_fee: basicFee,
        pt_enabled: ptEnabled,
        pt_fee: ptEnabled ? ptFee : 0,
        discount: discount,
        total_fee: financials.totalFee,
        initial_payment: initialPayment,
        payment_method: paymentMethod,
        transaction_reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to renew membership.');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Renew Membership</h2>
              <p className="text-xs text-slate-500">{member.name} (<span className="font-mono">{member.phone}</span>)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none p-1 rounded-xl"
          >
            &times;
          </button>
        </div>

        {isSuccess ? (
          /* Confirmation Screen with WhatsApp Receipt */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Membership Renewed Successfully! ✓
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Renewed <span className="font-semibold text-slate-700">{selectedPlan?.name}</span> for {member.name}
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
                    amount: initialPayment,
                    paymentMethod: paymentMethod,
                    paymentDate: startDate,
                    receiptNo: reference || undefined,
                    planName: selectedPlan?.name,
                    remainingDue: financials.remainingAmount,
                    gymPhone: activeGym.phone,
                  })}
                  label="Send WhatsApp Receipt & Confirmation"
                  title="Send renewal confirmation and receipt via WhatsApp"
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
          /* Form */
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Membership Recap */}
          {member.current_membership && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <p className="font-semibold text-slate-700">Previous Membership Expiry:</p>
              <p className="text-slate-900 font-bold font-mono">
                {member.current_membership.end_date} (Status: {member.current_membership.status})
              </p>
            </div>
          )}

          {/* Plan & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Select New Plan <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPlanId}
                onChange={e => handlePlanChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.duration_days} days) - ₹{p.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
            <span>Duration: <strong className="font-mono">{durationDays} days</strong></span>
            <span>New Expiry: <strong className="text-emerald-700 font-mono">{calculatedEndDate}</strong></span>
          </div>

          {/* Fees Calculation */}
          <div className="p-4 bg-blue-50/40 border border-blue-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Fees & Collection</h3>
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ptEnabled}
                  onChange={e => {
                    setPtEnabled(e.target.checked);
                    if (!e.target.checked) setPtFee(0);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-600"
                />
                <span>Personal Training (PT)</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Basic Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={basicFee}
                  onChange={e => setBasicFee(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 text-sm font-semibold font-mono border border-slate-300 rounded-xl bg-white"
                />
              </div>

              {ptEnabled && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">PT Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={ptFee}
                    onChange={e => setPtFee(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 text-sm font-semibold font-mono border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-600 mb-1">Discount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 text-sm font-semibold font-mono border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Total Renewal Fee:</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">{formatINR(financials.totalFee)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Paid Today (₹)</label>
                <input
                  type="number"
                  min={0}
                  max={financials.totalFee}
                  value={initialPayment}
                  onChange={e => setInitialPayment(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm font-bold font-mono border border-teal-500 bg-white rounded-xl focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-700"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-2 pt-1 font-semibold">
              <span className="text-slate-600">Remaining Balance:</span>
              <span className={`font-mono ${financials.remainingAmount > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700'}`}>
                {formatINR(financials.remainingAmount)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-colors text-sm disabled:opacity-50 flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Processing Renewal...' : 'Renew Membership'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
