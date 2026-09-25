import React, { useState, useEffect } from 'react';
import { UserPlus, IndianRupee, Calendar, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { memberService, planService } from '../services/api';
import { MembershipPlan } from '../types';
import { getTodayDateString, addDaysToDate, formatINR, calculateFinancials } from '../utils';
import { phoneRegex } from '../schemas';
import { WhatsAppButton } from './WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMemberModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { activeGym, user } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Required Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayDateString());

  // Financial fields
  const [basicFee, setBasicFee] = useState<number>(0);
  const [ptEnabled, setPtEnabled] = useState<boolean>(false);
  const [ptFee, setPtFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other'>('cash');
  const [transactionRef, setTransactionRef] = useState('');

  // Optional fields toggle
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredMember, setRegisteredMember] = useState<{
    name: string;
    phone: string;
    planName: string;
    startDate: string;
    endDate: string;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && activeGym) {
      loadPlans();
      // Reset form
      setName('');
      setPhone('');
      setStartDate(getTodayDateString());
      setPtEnabled(false);
      setPtFee(0);
      setDiscount(0);
      setShowMoreDetails(false);
      setErrorMsg(null);
    }
  }, [isOpen, activeGym]);

  const loadPlans = async () => {
    if (!activeGym) return;
    setLoadingPlans(true);
    try {
      const data = await planService.getPlans(activeGym.id);
      setPlans(data);
      if (data.length > 0) {
        setSelectedPlanId(data[0].id);
        setBasicFee(Number(data[0].price));
        setInitialPayment(Number(data[0].price));
      }
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const price = Number(plan.price);
      setBasicFee(price);
      // Recalculate default full payment
      const calc = calculateFinancials(price, ptEnabled ? ptFee : 0, discount, price + (ptEnabled ? ptFee : 0) - discount);
      setInitialPayment(calc.totalFee);
    }
  };

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
    if (!name.trim()) {
      setErrorMsg('Member name is required');
      return;
    }
    if (!phoneRegex.test(phone.trim())) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number (e.g. 9876543210)');
      return;
    }
    if (!selectedPlanId) {
      setErrorMsg('Please select a membership plan');
      return;
    }
    if (initialPayment > financials.totalFee) {
      setErrorMsg('Initial payment cannot exceed the total fee');
      return;
    }

    setSaving(true);

    try {
      await memberService.createMemberWithMembership(activeGym.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        gender: gender ? (gender as any) : undefined,
        date_of_birth: dob || undefined,
        address: address.trim() || undefined,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        plan_id: selectedPlanId,
        start_date: startDate,
        basic_fee: basicFee,
        pt_enabled: ptEnabled,
        pt_fee: ptEnabled ? ptFee : 0,
        discount: discount,
        total_fee: financials.totalFee,
        initial_payment: initialPayment,
        payment_method: paymentMethod,
        transaction_reference: transactionRef.trim() || undefined,
      });

      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      const calculatedEndDate = selectedPlan ? addDaysToDate(startDate, selectedPlan.duration_days) : '';

      setRegisteredMember({
        name: name.trim(),
        phone: phone.trim(),
        planName: selectedPlan?.name || 'Gym Membership',
        startDate: startDate,
        endDate: calculatedEndDate,
        paidAmount: initialPayment,
        dueAmount: financials.remainingAmount,
        paymentMethod: paymentMethod,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    setRegisteredMember(null);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {registeredMember ? 'Member Registered Successfully!' : 'Add New Gym Member'}
              </h2>
              <p className="text-xs text-slate-500">
                {registeredMember ? 'Send welcome & payment details to member' : 'Quick 2-second member registration & fee collection'}
              </p>
            </div>
          </div>
          <button
            onClick={registeredMember ? handleDone : onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none p-1 rounded-xl"
          >
            &times;
          </button>
        </div>

        {registeredMember ? (
          /* Confirmation Screen with 1-Click WhatsApp Welcome & Receipt */
          <div className="p-8 text-center space-y-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {registeredMember.name} has been enrolled! ✓
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Plan: <span className="font-semibold text-slate-800">{registeredMember.planName}</span> • Phone: <span className="font-mono text-slate-700">{registeredMember.phone}</span>
              </p>
            </div>

            {/* Quick summary box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-1.5 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Initial Payment:</span>
                <span className="font-bold text-emerald-700 font-mono">{formatINR(registeredMember.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Due:</span>
                <span className={`font-mono font-bold ${registeredMember.dueAmount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                  {formatINR(registeredMember.dueAmount)}
                </span>
              </div>
            </div>

            {/* WhatsApp Actions */}
            {activeGym && (
              <div className="space-y-2.5 max-w-sm mx-auto pt-1">
                <WhatsAppButton
                  phone={registeredMember.phone}
                  message={whatsappTemplates.welcomeMember({
                    gymName: activeGym.name,
                    memberName: registeredMember.name,
                    planName: registeredMember.planName,
                    startDate: registeredMember.startDate,
                    endDate: registeredMember.endDate,
                    gymPhone: activeGym.phone,
                  })}
                  label="Send WhatsApp Welcome Alert"
                  title="Send welcome message to new member on WhatsApp"
                  size="md"
                  variant="solid"
                  className="w-full justify-center py-2.5"
                />

                {registeredMember.paidAmount > 0 && (
                  <WhatsAppButton
                    phone={registeredMember.phone}
                    message={whatsappTemplates.paymentReceipt({
                      gymName: activeGym.name,
                      memberName: registeredMember.name,
                      amount: registeredMember.paidAmount,
                      paymentMethod: registeredMember.paymentMethod,
                      paymentDate: registeredMember.startDate,
                      planName: registeredMember.planName,
                      remainingDue: registeredMember.dueAmount,
                      gymPhone: activeGym.phone,
                    })}
                    label="Send Fee Receipt on WhatsApp"
                    title="Send payment receipt on WhatsApp"
                    size="md"
                    variant="subtle"
                    className="w-full justify-center py-2"
                  />
                )}

                <button
                  type="button"
                  onClick={handleDone}
                  className="w-full py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mt-2"
                >
                  Done & Back to Members
                </button>
              </div>
            )}
          </div>
        ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Member Primary Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit number"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Section 2: Membership Plan & Duration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Membership Plan</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Plan</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200">
              <span>Duration: <strong className="font-mono">{durationDays} days</strong></span>
              <span>Expires On: <strong className="text-slate-900 font-mono">{calculatedEndDate}</strong></span>
            </div>
          </div>

          {/* Section 3: Financials & Fees Calculation */}
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
                <span>Include Personal Training (PT)</span>
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

            {/* Total Display */}
            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Total Fee:</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">{formatINR(financials.totalFee)}</span>
            </div>

            {/* Payment Now */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Amount Paid Today (₹)</label>
                <input
                  type="number"
                  min={0}
                  max={financials.totalFee}
                  value={initialPayment}
                  onChange={e => setInitialPayment(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm font-bold font-mono border border-blue-400 bg-white rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Remaining Display */}
            <div className="flex items-center justify-between text-xs px-2 pt-1 font-semibold">
              <span className="text-slate-600">Remaining Balance:</span>
              <span className={`font-mono ${financials.remainingAmount > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700'}`}>
                {formatINR(financials.remainingAmount)}
              </span>
            </div>
          </div>

          {/* Toggle Optional Fields */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>{showMoreDetails ? 'Hide Optional Details' : '+ Add Optional Details (Email, Address, DOB, Emergency Contact)'}</span>
              {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMoreDetails && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="member@gmail.com"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Address / Area</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Street, City"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      placeholder="Relative / Friend Name"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      placeholder="Emergency Phone"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Notes / Health Remarks</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any medical condition, goal, or remark..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
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
              <span>{saving ? 'Saving Member...' : 'Save & Register Member'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
