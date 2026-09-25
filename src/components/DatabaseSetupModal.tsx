import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, RefreshCw, Key, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SUPABASE_SQL_SCHEMA } from '../constants/schemaSql';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { connectionStatus, recheckConnection } = useAuth();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMsg({ type: 'error', text: 'Please provide both Supabase Project URL and Public Anon Key.' });
      return;
    }

    setTesting(true);
    setStatusMsg({ type: 'info', text: 'Saving credentials and verifying PostgreSQL connection...' });

    try {
      saveSupabaseCredentials(url, anonKey);
      const res = await recheckConnection();
      if (res.connected) {
        setStatusMsg({
          type: 'success',
          text: res.hasSchema
            ? 'Connected successfully to Supabase PostgreSQL with valid schema and RLS policies!'
            : 'Connected to Supabase PostgreSQL, but schema tables are missing. Please copy and execute the SQL schema below in your Supabase SQL Editor.',
        });
      } else {
        setStatusMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    await recheckConnection();
    setStatusMsg({ type: 'info', text: 'Custom credentials cleared. Now checking system environment variables.' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header: Deep Teal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-700 bg-teal-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-700/60 text-teal-100 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Supabase PostgreSQL Configuration</h2>
              <p className="text-xs text-teal-200">Production multi-tenant database & Row-Level Security source of truth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-teal-200 hover:text-white p-1 rounded-xl text-xl font-bold leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Banner */}
          {connectionStatus?.connected ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">PostgreSQL Database Connected & Operational</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {connectionStatus.hasSchema
                    ? 'All Kru Fitness tables, foreign keys, indexes, and Row-Level Security policies are active.'
                    : 'PostgreSQL instance connected. Kru Fitness tables need initialization using the SQL script below.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Supabase PostgreSQL Connection Required</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Kru Fitness requires a live Supabase PostgreSQL database as the production source of truth. Enter your Project URL and Anon Client Key below.
                </p>
              </div>
            </div>
          )}

          {statusMsg && (
            <div
              className={`p-3 text-sm rounded-xl border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : statusMsg.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveAndTest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Found in your Supabase project dashboard under Project Settings &gt; API</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supabase Anon (Public) Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                The public anon client key with automated PostgreSQL Row-Level Security protection.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={testing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 active:scale-98"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{testing ? 'Verifying PostgreSQL Connection...' : 'Save & Verify Connection'}</span>
              </button>

              {url && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-xl"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Quick Setup Instructions & SQL Copy */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">PostgreSQL Schema & Security Rules</h3>
            </div>
            <p className="text-xs text-slate-600">
              Paste and execute this SQL script in the Supabase SQL Editor to initialize all 10 normalized tables, multi-tenant functions, triggers, and Row-Level Security policies.
            </p>

            <button
              onClick={copySQL}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'SQL Schema Copied to Clipboard!' : 'Copy Normalized PostgreSQL Schema (SQL)'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
