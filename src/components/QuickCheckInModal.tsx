import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceService, memberService } from '../services/api';
import { Member } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickCheckInModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { activeGym } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeGym) {
      loadActiveMembers();
      setSearch('');
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, activeGym]);

  const loadActiveMembers = async () => {
    if (!activeGym) return;
    setLoadingMembers(true);
    try {
      const data = await memberService.getMembers(activeGym.id, { filter: 'active' });
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members for check-in:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  if (!isOpen || !activeGym) return null;

  const handleCheckIn = async (member: Member) => {
    setCheckingInId(member.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await attendanceService.checkIn(activeGym.id, member.id);
      setSuccessMsg(`✓ Successfully checked in ${member.name}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record check-in');
    } finally {
      setCheckingInId(null);
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
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Quick Check-in</h2>
              <p className="text-xs text-slate-500">Record attendance check-in for active members</p>
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
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200/80 text-red-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search member by name or mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
              autoFocus
            />
          </div>

          {/* Members List */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {loadingMembers ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading gym members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                {search ? 'No active member matches your search.' : 'No active members available.'}
              </div>
            ) : (
              filteredMembers.map(m => {
                const isCheckingIn = checkingInId === m.id;
                return (
                  <div
                    key={m.id}
                    className="pt-2 flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                        {m.member_code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg">
                            {m.member_code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono">{m.phone}</span> • {m.current_membership?.plan?.name || 'Active Plan'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCheckIn(m)}
                      disabled={isCheckingIn}
                      className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isCheckingIn ? 'Marking...' : 'Check-in'}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span><strong className="font-mono">{filteredMembers.length}</strong> active member(s)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
