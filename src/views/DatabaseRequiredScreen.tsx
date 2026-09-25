import React, { useState } from 'react';
import { Database, ShieldCheck, Copy, Check, RefreshCw, Key, AlertTriangle } from 'lucide-react';
import { saveSupabaseCredentials } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SUPABASE_SQL_SCHEMA } from '../constants/schemaSql';
import { KruLogo } from '../components/KruLogo';

export const DatabaseRequiredScreen: React.FC = () => {
  const { recheckConnection } = useAuth();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!url.trim() || !anonKey.trim()) {
      setErrorMessage('Both Supabase Project URL and Anon Public Key are required.');
      return;
    }

    setTesting(true);

    try {
      saveSupabaseCredentials(url.trim(), anonKey.trim());
      const res = await recheckConnection();
      if (!res.connected) {
        setErrorMessage(res.message || 'Could not connect to PostgreSQL instance. Please verify URL and Key.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const copySQL = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Deep Teal Brand Header */}
        <div className="bg-teal-800 text-white p-6 text-center border-b border-teal-700">
          <KruLogo className="w-12 h-12 rounded-full mx-auto mb-3 shadow-md" />
          <h1 className="text-xl font-bold tracking-tight">Kru Fitness</h1>
          <p className="text-xs text-teal-200 font-medium mt-0.5">A KruSpace Product — Production PostgreSQL Backend</p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-amber-950">Supabase PostgreSQL Connection Required</p>
              <p className="text-amber-800">
                Kru Fitness operates strictly against a production PostgreSQL database. Local storage and mock fallbacks are disabled to protect gym business records and enforce multi-tenant isolation.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-4 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Can also be configured via <span className="font-mono font-semibold">VITE_SUPABASE_URL</span> in .env
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Supabase Anon (Public) Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Can also be configured via <span className="font-mono font-semibold">VITE_SUPABASE_ANON_KEY</span> in .env
              </p>
            </div>

            <button
              type="submit"
              disabled={testing}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 active:scale-98"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{testing ? 'Verifying PostgreSQL Connection...' : 'Connect to Supabase PostgreSQL'}</span>
            </button>
          </form>

          {/* SQL Schema helper */}
          <div className="border-t border-slate-200 pt-5 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              PostgreSQL Schema Initializer
            </h3>
            <p className="text-xs text-slate-600">
              If your database tables are not created yet, copy the normalized schema below and run it in the Supabase SQL Editor:
            </p>
            <button
              type="button"
              onClick={copySQL}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? 'SQL Schema Copied to Clipboard!' : 'Copy Normalized PostgreSQL Schema (SQL)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
