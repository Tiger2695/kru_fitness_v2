import React, { useState, useEffect } from 'react';
import { RotateCw, Clock, AlertCircle, IndianRupee, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { memberService } from '../services/api';
import { Member } from '../types';
import { formatINR, formatDate, getDaysRemaining } from '../utils';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

interface Props {
  onRenew: (member: Member) => void;
  onViewMember: (memberId: string) => void;
}

export const RenewalsView: React.FC<Props> = ({ onRenew, onViewMember }) => {
  const { activeGym } = useAuth();
  const [tab, setTab] = useState<'expiring' | 'expired'>('expiring');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeGym) {
      loadRenewals();
    }
  }, [activeGym, tab]);

  const loadRenewals = async () => {
    if (!activeGym) return;
    setLoading(true);
    try {
      const data = await memberService.getMembers(activeGym.id, {
        filter: tab,
      });
      setMembers(data);
    } catch (err) {
      console.error('Failed to load renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = members.filter(m => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return m.name.toLowerCase().includes(s) || m.phone.includes(s);
  });

  if (!activeGym) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Renewal Workspace</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track expiring memberships and renew with 1 click
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 mt-6">
          <button
            onClick={() => setTab('expiring')}
            className={`pb-3 text-xs font-bold border-b-2 mr-6 transition-colors ${
              tab === 'expiring'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Expiring Within 7 Days
          </button>
          <button
            onClick={() => setTab('expired')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              tab === 'expired'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Already Expired
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search members due for renewal by name or mobile..."
          className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading renewal candidates...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">
            {tab === 'expiring' ? 'No memberships expiring within 7 days 🎉' : 'No expired memberships found 👍'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Member</th>
                  <th className="p-4">Current Plan</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Time Remaining</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(m => {
                  const cur = m.current_membership;
                  const daysLeft = cur ? getDaysRemaining(cur.end_date) : 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div
                          onClick={() => onViewMember(m.id)}
                          className="cursor-pointer hover:underline"
                        >
                          <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                          <p className="text-slate-500 text-[11px] font-mono">{m.phone}</p>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{cur?.plan?.name || 'Standard'}</p>
                        <p className="text-slate-500 text-[11px] font-mono">{formatINR(cur?.total_fee)}</p>
                      </td>

                      <td className="p-4 font-bold text-slate-900 font-mono">{formatDate(cur?.end_date)}</td>

                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                            daysLeft < 0
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : daysLeft <= 3
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {daysLeft < 0
                            ? `Expired ${Math.abs(daysLeft)} days ago`
                            : daysLeft === 0
                            ? 'Expires today'
                            : `${daysLeft} days remaining`}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <WhatsAppButton
                          phone={m.phone}
                          message={whatsappTemplates.membershipExpiry({
                            gymName: activeGym.name,
                            memberName: m.name,
                            planName: cur?.plan?.name || 'Gym',
                            endDate: cur?.end_date || '',
                            daysRemaining: daysLeft,
                            gymPhone: activeGym.phone,
                          })}
                          label="WhatsApp"
                          title="Send renewal reminder on WhatsApp"
                          variant="solid"
                        />
                        <button
                          onClick={() => onRenew(m)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                        >
                          Renew Now
                        </button>
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
