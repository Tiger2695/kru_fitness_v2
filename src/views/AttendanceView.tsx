import React, { useState, useEffect } from 'react';
import { Clock, Search, CheckCircle, LogOut, RefreshCw, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceService, memberService } from '../services/api';
import { AttendanceRecord, Member } from '../types';
import { formatDateTime, formatDate, getTodayDateString } from '../utils';

export const AttendanceView: React.FC = () => {
  const { activeGym } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchMember, setSearchMember] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeGym?.attendance_enabled) {
      loadAttendance();
      loadAllMembers();
    }
  }, [activeGym]);

  const loadAttendance = async () => {
    if (!activeGym) return;
    setLoading(true);
    try {
      const data = await attendanceService.getTodayAttendance(activeGym.id);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    if (!activeGym) return;
    try {
      const data = await memberService.getMembers(activeGym.id, { filter: 'active' });
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleCheckIn = async (member: Member) => {
    if (!activeGym) return;
    setCheckingIn(true);
    setStatusMsg(null);
    try {
      await attendanceService.checkIn(activeGym.id, member.id);
      setStatusMsg(`Checked in ${member.name} successfully.`);
      setSearchMember('');
      await loadAttendance();
    } catch (err: any) {
      setStatusMsg(err?.message || 'Failed to record check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      await attendanceService.checkOut(attendanceId);
      await loadAttendance();
    } catch (err: any) {
      alert(err?.message || 'Failed to check out');
    }
  };

  if (!activeGym || !activeGym.attendance_enabled) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
        <h2 className="text-base font-bold text-slate-800">Attendance Module is Disabled</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Attendance tracking is optional. You can enable it anytime in Gym Settings.
        </p>
      </div>
    );
  }

  const searchResults = searchMember.trim()
    ? members.filter(
        m =>
          m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
          m.phone.includes(searchMember) ||
          m.member_code?.toLowerCase().includes(searchMember.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Today's Gym Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-mono">{records.length}</span> members checked in on <span className="font-mono">{formatDate(getTodayDateString())}</span>
          </p>
        </div>

        <button
          onClick={loadAttendance}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
          {statusMsg}
        </div>
      )}

      {/* Fast Check-In Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Quick Member Check-In
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchMember}
            onChange={e => setSearchMember(e.target.value)}
            placeholder="Type member name, phone, or member code to check in..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
          />
        </div>

        {/* Search Results Dropdown/List */}
        {searchMember.trim() && (
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto mt-2">
            {searchResults.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">No active members found.</p>
            ) : (
              searchResults.map(m => (
                <div
                  key={m.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{m.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {m.phone} {m.member_code ? `• ${m.member_code}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckIn(m)}
                    disabled={checkingIn}
                    className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs"
                  >
                    Check In
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Today's Check-Ins Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Check-In Log (<span className="font-mono">{records.length}</span>)
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading today's attendance log...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No check-ins recorded yet today.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Member</th>
                  <th className="p-4">Check-In Time</th>
                  <th className="p-4">Check-Out Time</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{r.member?.name || 'Member'}</p>
                      <p className="text-slate-500 text-[11px] font-mono">{r.member?.phone}</p>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 font-mono">{formatDateTime(r.check_in)}</td>
                    <td className="p-4">
                      {r.check_out ? (
                        <span className="text-slate-600 font-semibold font-mono">{formatDateTime(r.check_out)}</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-[10px]">
                          In Gym Now
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {!r.check_out && (
                        <button
                          onClick={() => handleCheckOut(r.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
                        >
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
