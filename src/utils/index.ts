export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '—';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateTimeStr;
  }
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDate(dateString: string, days: number): string {
  const d = new Date(dateString);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysDifference(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function getDaysRemaining(endDateStr: string): number {
  const end = new Date(endDateStr);
  const today = new Date();
  // reset today's time to start of day
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateFinancials(basicFee: number, ptFee: number, discount: number, paidAmount: number) {
  const total = Math.max(0, (basicFee || 0) + (ptFee || 0) - (discount || 0));
  const paid = Math.min(total, Math.max(0, paidAmount || 0));
  const remaining = Math.max(0, total - paid);
  return {
    totalFee: total,
    paidAmount: paid,
    remainingAmount: remaining,
  };
}

export function getMembershipStatusBadge(status: string, daysRemaining?: number): {
  label: string;
  className: string;
} {
  if (status === 'on_hold') {
    return {
      label: 'On Hold',
      className: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'Cancelled',
      className: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
    };
  }

  if (daysRemaining !== undefined) {
    if (daysRemaining < 0 || status === 'expired') {
      return {
        label: 'Expired',
        className: 'bg-red-50 text-red-600 border-red-200 font-medium',
      };
    }
    if (daysRemaining <= 7) {
      return {
        label: `Expiring in ${daysRemaining}d`,
        className: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
      };
    }
  }

  return {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
  };
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          let val = row[h];
          if (val === null || val === undefined) val = '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
