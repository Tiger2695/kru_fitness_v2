import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  RotateCw,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Dumbbell,
  Check,
  Database,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { KruLogo } from './KruLogo';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onOpenDatabaseSetup: () => void;
  onOpenManual?: () => void;
}

type TabType = 'signin' | 'signup';

export const AuthModal: React.FC<Props> = ({ isOpen, onOpenDatabaseSetup }) => {
  const {
    connectionStatus,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeTab === 'signup' && !fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!connectionStatus?.connected) {
      setErrorMsg('Database is not connected. Please check database configuration.');
      onOpenDatabaseSetup();
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'signup') {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.session) {
          setSuccessMsg('Account created successfully! Loading your gym dashboard...');
        } else {
          setSuccessMsg('Account created successfully! Logging you in...');
          setTimeout(() => setActiveTab('signin'), 1200);
        }
      } else {
        await signInWithEmail(email, password);
        setSuccessMsg('Signed in successfully! Loading dashboard...');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Invalid email or password. Please check your credentials and try again.');
      } else if (msg.includes('Email not confirmed')) {
        setErrorMsg('Email address not yet confirmed. In Supabase Dashboard > Authentication > Providers > Email, disable "Confirm email" or check your inbox.');
      } else if (msg.includes('User already registered')) {
        setErrorMsg('An account with this email already exists. Please switch to the Sign In tab.');
        setActiveTab('signin');
      } else {
        setErrorMsg(msg || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* DESKTOP LEFT HERO SHOWCASE (Hidden on small mobile, visible on lg) */}
      {/* ===================================================================== */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-slate-800/80">
        {/* Subtle Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center space-x-3.5">
          <KruLogo className="w-11 h-11 rounded-full shadow-lg border border-teal-500/30" />
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white block">
              Kru Fitness
            </span>
            <span className="text-xs text-teal-300 font-medium tracking-wide">
              A KruSpace Product · Gym & Studio Operating System
            </span>
          </div>
        </div>

        {/* Center Presentation Statement */}
        <div className="relative z-10 max-w-xl my-auto py-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-900/60 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-6 shadow-xs">
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Built for Modern Indian Gyms & Fitness Centers</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight mb-5">
            Manage members, fees & renewals with zero headache.
          </h1>

          <p className="text-base xl:text-lg text-slate-300 leading-relaxed mb-8">
            The high-speed workspace built for owners and reception staff. Everything from member check-in to automated WhatsApp reminders and daily cash ledger in one tap.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-2.5">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Instant Admissions & Plans</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Monthly, quarterly, annual packages with custom fees and automated expiry dates.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-2.5">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">UPI & Cash Reconciliation</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Track payments in real time. Total peace of mind over daily revenue.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-2.5">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">WhatsApp Fee Reminders</h3>
              <p className="text-xs text-slate-400 leading-normal">
                1-tap personalized payment reminders sent straight to members' phones.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-2.5">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Multi-Device Cloud Sync</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Reception laptop, owner's phone or tablet — synced live across all screens.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>High-Availability Cloud Engine Active</span>
          </div>
          <span className="text-slate-500">KruSpace OS · v2.4</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AUTHENTICATION PORTAL (Responsive: Edge-to-edge mobile & sleek desktop) */}
      {/* ===================================================================== */}
      <div className="w-full lg:w-5/12 xl:w-2/5 min-h-[100dvh] lg:min-h-screen bg-slate-950 lg:bg-white text-slate-900 flex flex-col justify-between p-4 sm:p-8 lg:p-12 xl:p-14 overflow-y-auto">
        {/* Mobile Header (Only visible on small/medium screens) */}
        <div className="lg:hidden flex items-center justify-between pb-5 border-b border-slate-800/60 mb-5">
          <div className="flex items-center space-x-2.5">
            <KruLogo className="w-9 h-9 rounded-full shadow-md" />
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white leading-tight">
                Kru Fitness
              </h2>
              <p className="text-[11px] text-teal-400 font-medium">Smart Gym Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Cloud Live</span>
          </div>
        </div>

        {/* Central Auth Container */}
        <div className="w-full max-w-md mx-auto my-auto py-2 sm:py-6">
          {/* Card Wrapper on Mobile: Sleek Dark / Desktop: Pristine White */}
          <div className="bg-slate-900/90 lg:bg-transparent p-5 sm:p-7 lg:p-0 rounded-3xl lg:rounded-none border border-slate-800 lg:border-0 shadow-2xl lg:shadow-none">
            {/* Header Text */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white lg:text-slate-900">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Gym Account'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 lg:text-slate-500 mt-1">
                {activeTab === 'signin'
                  ? 'Sign in with your registered email and password.'
                  : 'Register your gym workspace and start managing members instantly.'}
              </p>
            </div>

            {/* Segmented Control Tabs (iOS / macOS Tactile Style) */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 lg:bg-slate-100 rounded-2xl mb-6 border border-slate-800 lg:border-slate-200">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`flex items-center justify-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-teal-700 lg:bg-white text-white lg:text-teal-900 shadow-md'
                    : 'text-slate-400 lg:text-slate-600 hover:text-white lg:hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`flex items-center justify-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-teal-700 lg:bg-white text-white lg:text-teal-900 shadow-md'
                    : 'text-slate-400 lg:text-slate-600 hover:text-white lg:hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </div>

            {/* Database Warning if not connected */}
            {!connectionStatus?.connected && (
              <div className="mb-5 p-3.5 bg-amber-950/40 lg:bg-amber-50 border border-amber-500/30 lg:border-amber-200 rounded-2xl text-xs text-amber-200 lg:text-amber-900 flex items-center justify-between">
                <span>Database configuration required.</span>
                <button
                  type="button"
                  onClick={onOpenDatabaseSetup}
                  className="font-bold underline text-amber-300 lg:text-teal-800 ml-2"
                >
                  Configure
                </button>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-950/60 lg:bg-red-50 border border-red-500/40 lg:border-red-200 rounded-2xl text-xs sm:text-sm text-red-200 lg:text-red-700 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-950/60 lg:bg-emerald-50 border border-emerald-500/40 lg:border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-200 lg:text-emerald-800 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400 lg:text-emerald-600" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 lg:text-slate-700 mb-1.5 uppercase tracking-wider">
                    Full Name / Owner Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-500 lg:text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Tiger Chitransh"
                      className="w-full h-12 pl-11 pr-4 text-base bg-slate-950 lg:bg-white text-white lg:text-slate-900 border border-slate-700 lg:border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 lg:text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-500 lg:text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@yourgym.com"
                    className="w-full h-12 pl-11 pr-4 text-base bg-slate-950 lg:bg-white text-white lg:text-slate-900 border border-slate-700 lg:border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 lg:text-slate-700 uppercase tracking-wider">
                    Password <span className="text-red-400">*</span>
                  </label>
                  {activeTab === 'signup' && (
                    <span className="text-[11px] text-slate-400">Min 6 characters</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-500 lg:text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-11 text-base bg-slate-950 lg:bg-white text-white lg:text-slate-900 border border-slate-700 lg:border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 lg:hover:text-slate-600 p-0.5"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 sm:h-13 flex items-center justify-center space-x-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-900/40 lg:shadow-teal-700/20 transition-all disabled:opacity-50 active:scale-98 cursor-pointer text-sm sm:text-base"
                >
                  {loading ? (
                    <RotateCw className="w-5 h-5 animate-spin" />
                  ) : activeTab === 'signin' ? (
                    <LogIn className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                  <span>
                    {loading
                      ? 'Please wait...'
                      : activeTab === 'signin'
                      ? 'Sign In to Kru Fitness'
                      : 'Create Account & Open Gym'}
                  </span>
                </button>
              </div>
            </form>

            {/* Switch Helper */}
            <div className="mt-6 pt-5 border-t border-slate-800 lg:border-slate-100 text-center text-xs sm:text-sm text-slate-400 lg:text-slate-600">
              {activeTab === 'signup' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('signin')}
                    className="font-bold text-teal-400 lg:text-teal-700 hover:underline ml-1 cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p>
                  Need a new gym account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    className="font-bold text-teal-400 lg:text-teal-700 hover:underline ml-1 cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="pt-4 border-t border-slate-900 lg:border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-500" />
            <span>KruSpace Fitness Edition</span>
          </div>
          <button
            type="button"
            onClick={onOpenDatabaseSetup}
            className="flex items-center space-x-1 text-slate-400 lg:text-slate-500 hover:text-teal-400 lg:hover:text-teal-700 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Setup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
