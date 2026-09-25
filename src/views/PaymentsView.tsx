import React, { useState, useEffect } from 'react';
import { IndianRupee, Calendar, Search, Download, RefreshCw, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/api';
import { Payment } from '../types';
import { formatINR, formatDate, downloadCSV, getTodayDateString } from '../utils';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { whatsappTemplates } from '../utils/whatsapp';

export const PaymentsView: React.FC = () => {
  const { activeGym } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeGym) {
      loadPayments();
    }
  }, [activeGym, dateFilter]);

  const loadPayments = async () => {
    if (!activeGym) return;
    setLoading(true);
    try {
      const data = await paymentService.getPayments(activeGym.id, {
        date: dateFilter || undefined,
      });
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const todayStr = getTodayDateString();
  const todayTotal = payments
    .filter(p => p.payment_date === todayStr)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const filtered = payments.filter(p => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = p.member?.name?.toLowerCase() || '';
    const phone = p.member?.phone || '';
    const ref = p.transaction_reference?.toLowerCase() || '';
    return name.includes(s) || phone.includes(s) || ref.includes(s);
  });

  const handleExport = () => {
    if (payments.length === 0) return;
    const rows = payments.map(p => ({
      'Payment ID': p.id,
      'Payment Date': p.payment_date,
      'Member Name': p.member?.name || '',
      'Phone': p.member?.phone || '',
      'Amount (INR)': p.amount,
      'Method': p.payment_method,
      'Reference': p.transaction_reference || '',
      'Notes': p.notes || '',
    }));
    downloadCSV(`GymOS_Payments_${activeGym?.name || 'gym'}_${todayStr}.csv`, rows);
  };

  if (!activeGym) return null;

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Payment Collection History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction ledger for {activeGym.name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            disabled={payments.length === 0}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Collection</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{formatINR(todayTotal)}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Payments received on {formatDate(todayStr)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {dateFilter ? `Collection for ${formatDate(dateFilter)}` : 'Total Collection Listed'}
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{formatINR(totalCollected)}</div>
          <p className="text-[11px] text-slate-500 mt-0.5"><span className="font-mono">{payments.length}</span> total receipts recorded</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search payments by member name, mobile, or reference..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Date:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-red-600 hover:underline font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading payments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No payments found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Payment Date</th>
                  <th className="p-4">Member</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Reference / Remark</th>
                  <th className="p-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-semibold text-slate-700 font-mono">{formatDate(p.payment_date)}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{p.member?.name || 'Member'}</p>
                      <p className="text-slate-500 text-[11px] font-mono">{p.member?.phone}</p>
                    </td>
                    <td className="p-4 font-black text-emerald-600 font-mono text-sm">{formatINR(p.amount)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-full uppercase text-[10px] border border-slate-200">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {p.transaction_reference ? (
                        <span className="font-mono text-slate-800 font-semibold">{p.transaction_reference}</span>
                      ) : null}
                      {p.notes ? <p className="text-[11px] text-slate-500">{p.notes}</p> : null}
                      {!p.transaction_reference && !p.notes && '—'}
                    </td>
                    <td className="p-4 text-right">
                      {p.member?.phone && activeGym ? (
                        <WhatsAppButton
                          phone={p.member.phone}
                          message={whatsappTemplates.paymentReceipt({
                            gymName: activeGym.name,
                            memberName: p.member.name,
                            amount: Number(p.amount),
                            paymentMethod: p.payment_method,
                            paymentDate: p.payment_date,
                            receiptNo: p.transaction_reference || undefined,
                            gymPhone: activeGym.phone,
                          })}
                          label="Receipt"
                          title="Send payment receipt on WhatsApp"
                          variant="subtle"
                        />
                      ) : (
                        <span className="text-slate-400">—</span>
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
