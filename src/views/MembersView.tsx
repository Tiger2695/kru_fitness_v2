import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Eye,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { memberService } from '../services/api';
import { Member } from '../types';
import { formatINR, formatDate, getMembershipStatusBadge, getDaysRemaining } from '../utils';
import { ExcelImportModal } from '../components/ExcelImportModal';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

interface Props {
  initialFilter?: string;
  onOpenAddMember: () => void;
  onViewMember: (memberId: string) => void;
  onCollectPayment: (member: Member) => void;
  onRenew: (member: Member) => void;
}

export const MembersView: React.FC<Props> = ({
  initialFilter = 'all',
  onOpenAddMember,
  onViewMember,
  onCollectPayment,
  onRenew,
}) => {
  const { activeGym } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'on_hold' | 'pending_payment'>(
    (initialFilter as any) || 'all'
  );

  useEffect(() => {
    if (activeGym) {
      loadMembers();
    }
  }, [activeGym, filter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeGym) loadMembers();
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  const loadMembers = async () => {
    if (!activeGym) return;
    setLoading(true);
    try {
      const data = await memberService.getMembers(activeGym.id, {
        search: search.trim() || undefined,
        filter: filter,
      });
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!activeGym) return null;

  return (
    <div className="space-y-6">
      {/* Header and Add Member Button (Constitution Section 8) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Members</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-mono font-semibold text-slate-700">{members.length}</span> members in {activeGym.name}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-600" />
            <span>Import Excel / CSV</span>
          </button>
          <button
            onClick={onOpenAddMember}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs transition-colors text-sm active:scale-98"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>+ Add Member</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar (Constitution Section 8) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search member by name or mobile number"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
          />
        </div>

        {/* Useful Filters (Constitution Section 8) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center space-x-1">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </span>

          {[
            { id: 'all', label: 'All Members' },
            { id: 'active', label: 'Active' },
            { id: 'expiring', label: 'Expiring Soon' },
            { id: 'expired', label: 'Expired' },
            { id: 'on_hold', label: 'On Hold' },
            { id: 'pending_payment', label: 'Pending Payment' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                filter === f.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-slate-800">
              {search ? 'No members found' : 'No members yet'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? `No members match "${search}". Try searching another name or mobile number.`
                : 'Start by adding your first gym member to manage attendance, fees, and renewals.'}
            </p>
            <button
              onClick={onOpenAddMember}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add First Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Name & Mobile</th>
                  <th className="p-4">Membership</th>
                  <th className="p-4">Expiry</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(member => {
                  const cur = member.current_membership;
                  const daysLeft = cur ? getDaysRemaining(cur.end_date) : undefined;
                  const badge = cur
                    ? getMembershipStatusBadge(cur.status, daysLeft)
                    : { label: 'No Plan', className: 'bg-slate-100 text-slate-600 border-slate-200' };

                  const remaining = Number(cur?.remaining_amount || 0);

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Mobile */}
                      <td className="p-4">
                        <div
                          onClick={() => onViewMember(member.id)}
                          className="cursor-pointer hover:underline"
                        >
                          <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                          <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                            {member.phone} {member.member_code ? `• ${member.member_code}` : ''}
                          </p>
                        </div>
                      </td>

                      {/* Membership */}
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{cur?.plan?.name || 'Standard'}</p>
                        <p className="text-slate-400 text-[11px]">Since <span className="font-mono">{formatDate(cur?.start_date)}</span></p>
                      </td>

                      {/* Expiry */}
                      <td className="p-4">
                        <p className="font-semibold text-slate-900 font-mono">{formatDate(cur?.end_date)}</p>
                        {daysLeft !== undefined && (
                          <p
                            className={`text-[11px] font-semibold ${
                              daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-slate-500'
                            }`}
                          >
                            {daysLeft < 0
                              ? `Expired ${Math.abs(daysLeft)}d ago`
                              : daysLeft === 0
                              ? 'Expires today'
                              : `${daysLeft} days left`}
                          </p>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="p-4">
                        {remaining > 0 ? (
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 font-bold text-[11px] font-mono">
                              Due: {formatINR(remaining)}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold text-[11px]">
                            Cleared (Paid)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] border font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {remaining > 0 ? (
                          <WhatsAppButton
                            phone={member.phone}
                            message={whatsappTemplates.duePaymentReminder({
                              gymName: activeGym.name,
                              memberName: member.name,
                              dueAmount: remaining,
                              planName: cur?.plan?.name,
                              gymPhone: activeGym.phone,
                            })}
                            title="Send fee balance reminder on WhatsApp"
                            variant="subtle"
                          />
                        ) : daysLeft !== undefined && daysLeft <= 7 ? (
                          <WhatsAppButton
                            phone={member.phone}
                            message={whatsappTemplates.membershipExpiry({
                              gymName: activeGym.name,
                              memberName: member.name,
                              planName: cur?.plan?.name || 'Gym',
                              endDate: cur?.end_date || '',
                              daysRemaining: daysLeft,
                              gymPhone: activeGym.phone,
                            })}
                            title="Send renewal reminder on WhatsApp"
                            variant="subtle"
                          />
                        ) : null}

                        {remaining > 0 && (
                          <button
                            onClick={() => onCollectPayment(member)}
                            title="Collect Pending Fee"
                            className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-xs shadow-xs"
                          >
                            Pay
                          </button>
                        )}

                        <button
                          onClick={() => onRenew(member)}
                          title="Renew Membership"
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs"
                        >
                          Renew
                        </button>

                        <button
                          onClick={() => onViewMember(member.id)}
                          title="View Profile"
                          className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={loadMembers}
      />
    </div>
  );
};
