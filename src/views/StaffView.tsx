import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Users, Key, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { staffService } from '../services/api';
import { GymUser } from '../types';
import { formatDate } from '../utils';

export const StaffView: React.FC = () => {
  const { activeGym, activeRole, user } = useAuth();
  const [staff, setStaff] = useState<GymUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeGym) {
      loadStaff();
    }
  }, [activeGym]);

  const loadStaff = async () => {
    if (!activeGym) return;
    setLoading(true);
    try {
      const data = await staffService.getStaff(activeGym.id);
      setStaff(data);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!activeGym) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Staff & Role Permissions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-Based Access Control (RBAC) security protocols
          </p>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 font-bold border border-teal-200">
          Your Role: <span className="uppercase">{activeRole}</span>
        </div>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
          <p className="text-xs font-bold text-slate-900 uppercase">Owner</p>
          <p className="text-[11px] text-slate-500">Full control over gym settings, staff, finances, and plans.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
          <p className="text-xs font-bold text-slate-900 uppercase">Manager</p>
          <p className="text-[11px] text-slate-500">Operational control, reports, members, fee collection, and holds.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
          <p className="text-xs font-bold text-slate-900 uppercase">Receptionist</p>
          <p className="text-[11px] text-slate-500">Add members, collect payments, renew memberships, and mark attendance.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
          <p className="text-xs font-bold text-slate-900 uppercase">Trainer</p>
          <p className="text-[11px] text-slate-500">Member view and PT details with attendance tracking.</p>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Assigned Gym Users (<span className="font-mono">{staff.length}</span>)
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading staff members...</div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No staff records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Assigned On</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map(s => {
                  const isCurrent = s.user_id === user?.id;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-sm">
                          {s.profiles?.full_name || (isCurrent ? activeGym.owner_name : 'Staff Member')}
                          {isCurrent && <span className="ml-2 text-[10px] text-teal-700 font-bold">(You)</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {s.profiles?.phone || (isCurrent ? activeGym.phone : 'Authorized Gym Staff')}
                        </p>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-900 font-bold rounded-lg uppercase text-[10px]">
                          {s.role}
                        </span>
                      </td>

                      <td className="p-4 text-slate-600 font-semibold font-mono">{formatDate(s.created_at)}</td>

                      <td className="p-4 text-right">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full font-bold text-[10px]">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
