import React, { useState } from 'react';
import { Building2, CheckCircle2, Clock, Dumbbell, LogOut, Shield } from 'lucide-react';
import { gymService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { phoneRegex } from '../schemas';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
}

export const GymSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { refreshGyms, user, signOut } = useAuth();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Gym Name is required');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Owner Name is required');
      return;
    }
    if (!phoneRegex.test(phone.trim())) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      return;
    }

    setLoading(true);

    try {
      await gymService.createGym({
        name: name.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        email: user?.email || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        attendance_enabled: attendanceEnabled,
      });

      // Also sync user metadata to Supabase Auth so it displays nicely in Supabase dashboard
      try {
        const client = (await import('../lib/supabase')).getSupabaseClient();
        if (client) {
          await client.auth.updateUser({
            data: {
              name: ownerName.trim(),
              full_name: ownerName.trim(),
              display_name: ownerName.trim(),
              phone_number: phone.trim(),
            },
          });
        }
      } catch {}

      await refreshGyms();
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create gym workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Register Your Gym</h2>
              <p className="text-xs text-slate-400 mt-0.5">Quick setup for your fitness center</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out / Switch account"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Gym Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Iron Fitness Gym"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Owner / Manager Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
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
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Indore, Pune, Delhi"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Full Address (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Shop No., Street / Area"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Attendance Choice */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <label className="text-sm font-bold text-slate-900">Do you want to enable attendance?</label>
              </div>
              <p className="text-xs text-slate-500">
                Attendance is completely optional. If skipped, you can manage members, fees, and renewals with zero
                attendance clutter. You can always turn it on later in Settings.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setAttendanceEnabled(false)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                    !attendanceEnabled
                      ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${!attendanceEnabled ? 'text-blue-600' : 'opacity-0'}`} />
                  <span>Skip for now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceEnabled(true)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                    attendanceEnabled
                      ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${attendanceEnabled ? 'text-blue-600' : 'opacity-0'}`} />
                  <span>Enable Attendance</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors text-sm disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Dumbbell className="w-4 h-4" />
              <span>{loading ? 'Creating Gym Workspace...' : 'Launch Gym Dashboard'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
