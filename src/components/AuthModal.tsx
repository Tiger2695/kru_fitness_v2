import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  RotateCw,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
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

  // Default to 'signin' for existing users, switchable to 'signup'
  const [activeTab, setActiveTab] = useState<TabType>('signin');

  // Form inputs
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

  // Handler: Password Authentication
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    if (password.length < 6) {
      setErrorMsg('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (!connectionStatus?.connected) {
      setErrorMsg('Database connected nahi hai. Kripya database settings check karein.');
      onOpenDatabaseSetup();
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'signup') {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.session) {
          setSuccessMsg('Account safaltapoorvak ban gaya! Loading dashboard...');
        } else {
          setSuccessMsg('Account create ho gaya! Agar Supabase me email confirm on hai toh email check karein, ya sign in karein.');
          // Auto switch to sign in
          setTimeout(() => setActiveTab('signin'), 1500);
        }
      } else {
        await signInWithEmail(email, password);
        setSuccessMsg('Login safal raha! Dashboard khul raha hai...');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Email ya Password galat hai. Kripya dobara check karke enter karein.');
      } else if (msg.includes('Email not confirmed')) {
        setErrorMsg('Email verify nahi hua hai. Supabase Dashboard > Authentication > Providers > Email me "Confirm email" toggle band karein ya email inbox me verify karein.');
      } else if (msg.includes('User already registered')) {
        setErrorMsg('Is email se pehle se account bana hua hai! Kripya "Sign In" tab par click karke login karein.');
        setActiveTab('signin');
      } else {
        setErrorMsg(msg || 'Authentication failed. Kripya credentials check karein.');
      }
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

          {/* Top Primary Tabs: Sign In vs Create Account */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200">
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
          </div>

          {/* Subtitle / Context Header */}
          <div className="mb-4">
            {activeTab === 'signin' ? (
              <div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 mb-1">
                  <Building2 className="w-3 h-3 text-teal-600" />
                  <span>Gym Owner / Staff Login</span>
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Welcome Back!
                </h2>
                <p className="text-xs text-slate-500">
                  Apne registered email aur password se sign in karein.
                </p>
              </div>
            ) : (
              <div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Naya Gym Registration</span>
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Apna Gym Account Banayein
                </h2>
                <p className="text-xs text-slate-500">
                  Apni details aur ek password set karke instant start karein.
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gym Owner / Manager Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Tiger Chitransh"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="owner@yourgym.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                {activeTab === 'signup' && (
                  <span className="text-[11px] text-slate-400">Min 6 characters</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 active:scale-98 cursor-pointer"
              >
                {loading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : activeTab === 'signin' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {loading
                    ? 'Processing...'
                    : activeTab === 'signin'
                    ? 'Sign In to Kru Fitness'
                    : 'Create Account & Open Gym'}
                </span>
              </button>
            </div>
          </form>

          {/* Bottom Switcher Helper */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            {activeTab === 'signup' ? (
              <p>
                Pehle se account hai?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="font-bold text-teal-700 hover:text-teal-800 underline ml-1 cursor-pointer"
                >
                  Sign In Karein
                </button>
              </p>
            ) : (
              <p>
                Naya account banana hai?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className="font-bold text-teal-700 hover:text-teal-800 underline ml-1 cursor-pointer"
                >
                  Create Account Karein
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
