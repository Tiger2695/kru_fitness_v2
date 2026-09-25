import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  Database,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  RotateCw,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { KruLogo } from './KruLogo';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onOpenDatabaseSetup: () => void;
}

type TabType = 'signup' | 'signin';
type AuthMethod = 'otp' | 'password';
type OtpStep = 'request' | 'verify';

export const AuthModal: React.FC<Props> = ({ isOpen, onOpenDatabaseSetup }) => {
  const {
    connectionStatus,
    signInWithEmail,
    signUpWithEmail,
    signInWithOtp,
    verifyOtp,
  } = useAuth();

  // Top level tab: 'signup' (Naya Account) vs 'signin' (Pehle se account hai)
  const [activeTab, setActiveTab] = useState<TabType>('signup');

  // Auth method within the active tab: OTP (default) or Password
  const [authMethod, setAuthMethod] = useState<AuthMethod>('otp');

  // OTP flow state
  const [otpStep, setOtpStep] = useState<OtpStep>('request');
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Timer countdown for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  if (!isOpen) return null;

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setOtpStep('request');
    setOtpCode('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Handler: Request OTP (for Signup or Signin)
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeTab === 'signup' && !fullName.trim()) {
      setErrorMsg('Kripya apna Pura Naam (Full Name) enter karein.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg('Kripya ek valid email address enter karein.');
      return;
    }

    if (!connectionStatus?.connected) {
      setErrorMsg('Supabase PostgreSQL database is not connected. Please configure your database connection.');
      onOpenDatabaseSetup();
      return;
    }

    setLoading(true);

    try {
      await signInWithOtp(email, fullName.trim() || undefined);
      setOtpStep('verify');
      setResendCountdown(60);
      setSuccessMsg(`Confirmation code has been sent to ${email.trim()}! Please check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send OTP code. Please check credentials or switch to password login.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = otpCode.replace(/\D/g, '').trim();
    if (cleanCode.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      await verifyOtp(email, cleanCode, fullName.trim() || undefined);
      setSuccessMsg(
        activeTab === 'signup'
          ? 'Account successfully created and verified! Opening gym setup...'
          : 'Successfully signed in! Loading your gym workspace...'
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Password Auth
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeTab === 'signup' && !fullName.trim()) {
      setErrorMsg('Kripya apna Pura Naam enter karein.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg('Kripya ek valid email address enter karein.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (!connectionStatus?.connected) {
      setErrorMsg('Supabase PostgreSQL database is not connected.');
      onOpenDatabaseSetup();
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'signup') {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.session) {
          setSuccessMsg('Account created successfully! Loading your gym workspace...');
        } else {
          setSuccessMsg('Account registered! Verification link sent to your email.');
        }
      } else {
        await signInWithEmail(email, password);
        setSuccessMsg('Signed in successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transition-all my-6">
        {/* Brand Header: Deep Teal */}
        <div className="bg-teal-800 text-white p-6 text-center border-b border-teal-700 relative">
          <KruLogo className="w-12 h-12 rounded-full mx-auto mb-3 shadow-md" />
          <h1 className="text-xl font-bold tracking-tight text-white">Kru Fitness</h1>
          <p className="text-xs text-teal-200 mt-0.5">A KruSpace Product • Smart Gym Management</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Database Setup Warning if disconnected */}
          {!connectionStatus?.connected && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <span className="font-medium">PostgreSQL database connection required.</span>
              <button
                type="button"
                onClick={onOpenDatabaseSetup}
                className="text-teal-700 underline font-bold hover:text-teal-800 ml-2"
              >
                Configure
              </button>
            </div>
          )}

          {/* Top Primary Tabs: Create Account vs Sign In */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200">
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4 text-teal-700" />
              <span>Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'signin'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4 text-teal-700" />
              <span>Sign In</span>
            </button>
          </div>

          {/* Subtitle / Context Header */}
          <div className="mb-4">
            {activeTab === 'signup' ? (
              <div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/60 mb-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  <span>Naya Gym Owner Registration</span>
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Apna Gym Account Banayein
                </h2>
                <p className="text-xs text-slate-500">
                  Email par instant 6-digit confirmation code ke sath account register karein.
                </p>
              </div>
            ) : (
              <div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 mb-1">
                  <Building2 className="w-3 h-3 text-slate-600" />
                  <span>Existing Gym Account</span>
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Welcome Back!
                </h2>
                <p className="text-xs text-slate-500">
                  Apne registered email se sign in karein.
                </p>
              </div>
            )}
          </div>

          {/* Alert messages */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Secondary Method Switcher: OTP vs Password */}
          <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 rounded-xl mb-4 border border-slate-200/60">
            <span className="text-slate-600 font-medium">Authentication Type:</span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('otp');
                  setOtpStep('request');
                  setErrorMsg(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  authMethod === 'otp'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ 6-Digit Email OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password');
                  setErrorMsg(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  authMethod === 'password'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔑 Password
              </button>
            </div>
          </div>

          {/* FLOW A: OTP AUTH (Signup & Signin) */}
          {authMethod === 'otp' && (
            <div>
              {otpStep === 'request' ? (
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  {/* If Signup, require Full Name */}
                  {activeTab === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Gym Owner / Manager Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g. Tiger Chitransh"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="owner@yourgym.com"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 active:scale-98"
                    >
                      {loading ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      <span>
                        {loading
                          ? 'Sending OTP Code...'
                          : activeTab === 'signup'
                          ? 'Send 6-Digit OTP to Register'
                          : 'Send 6-Digit OTP to Sign In'}
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-slate-500">
                    {activeTab === 'signup'
                      ? 'No password required! OTP verify karte hi aapka account create ho jayega.'
                      : 'Login instantly without password.'}
                  </p>
                </form>
              ) : (
                /* Step 2: Verify OTP */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Email Sent To:</span>
                      <span className="text-xs font-bold text-slate-800 font-mono truncate">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('request');
                        setOtpCode('');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-teal-700 hover:text-teal-800 font-bold underline flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change</span>
                    </button>
                  </div>

                  {/* Dual Instruction Box: Magic Link or OTP */}
                  <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-3.5 text-xs text-teal-950 space-y-2">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                        1
                      </div>
                      <div>
                        <strong className="text-teal-900 font-bold">Email ke "Log In" link par click karein:</strong>
                        <p className="text-teal-800 text-[11px] mt-0.5">
                          Supabase email mein aaye <strong>"Log In"</strong> button/link par click karte hi aap direct login ho jayenge!
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-teal-200/60 pt-2 flex items-start space-x-2">
                      <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                        2
                      </div>
                      <div>
                        <strong className="text-teal-900 font-bold">Ya 6-Digit Code enter karein:</strong>
                        <p className="text-teal-800 text-[11px] mt-0.5">
                          Agar aapke email template mein 6-digit verification code hai, toh use neeche enter karein.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Enter 6-Digit OTP Code (Optional agar link click kiya hai)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-48 mx-auto px-4 py-2.5 text-2xl font-mono tracking-[0.4em] text-center border-2 border-teal-600 rounded-2xl focus:ring-4 focus:ring-teal-100 focus:outline-none bg-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-40 active:scale-98"
                  >
                    {loading ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>
                      {loading
                        ? 'Verifying...'
                        : activeTab === 'signup'
                        ? 'Verify OTP & Complete Registration'
                        : 'Verify OTP & Sign In'}
                    </span>
                  </button>

                  <div className="text-center pt-1 space-y-2">
                    {resendCountdown > 0 ? (
                      <span className="text-xs text-slate-400 font-medium block">
                        Resend in <strong className="text-slate-600">{resendCountdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRequestOtp()}
                        disabled={loading}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
                      >
                        Email nahi mila? Resend Email
                      </button>
                    )}

                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        💡 <strong>Supabase Tip:</strong> Agar aap chahte hain ki email mein 6-digit OTP code text bhi dikhe: Supabase Dashboard &rarr; <em>Authentication &rarr; Email Templates &rarr; Magic Link</em> mein <code className="bg-slate-100 text-teal-800 px-1 py-0.5 rounded font-mono font-bold">{'{{ .Token }}'}</code> add kar dein.
                      </p>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* FLOW B: PASSWORD AUTH (Signup & Signin) */}
          {authMethod === 'password' && (
            <form onSubmit={handlePasswordAuth} className="space-y-3.5">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gym Owner Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Tiger Chitransh"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="owner@yourgym.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 active:scale-98"
                >
                  {loading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : activeTab === 'signup' ? (
                    <UserPlus className="w-4 h-4" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>
                    {loading
                      ? 'Please wait...'
                      : activeTab === 'signup'
                      ? 'Create Gym Owner Account'
                      : 'Sign In to Kru Fitness'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Bottom Switcher Helper */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            {activeTab === 'signup' ? (
              <p>
                Pehle se account hai?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="font-bold text-teal-700 hover:text-teal-800 underline ml-1"
                >
                  Sign In Karein
                </button>
              </p>
            ) : (
              <p>
                Naya Gym register karna hai?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className="font-bold text-teal-700 hover:text-teal-800 underline ml-1"
                >
                  Naya Account Banayein
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer Database Helper */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-center space-x-2">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={onOpenDatabaseSetup}
            className="text-xs text-slate-600 hover:text-teal-700 font-medium"
          >
            PostgreSQL Database Setup & SQL Schema
          </button>
        </div>
      </div>
    </div>
  );
};
