import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { memberService, membershipService, planService, normalizePaymentMethod, normalizeGenderForDb } from '../services/api';
import { formatINR, formatDate, getTodayDateString, addDaysToDate } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  name: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque';
  planName: string;
  ptEnabled: boolean;
  startDate: string;
  endDate: string;
  basicFee: number;
  ptFee: number;
  discount: number;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string;
  isOnHold: boolean;
  isValid: boolean;
  errors: string[];
  rawStartDateDisplay?: string;
  rawAmountDisplay?: string;
  rawPaidDisplay?: string;
}

export const ExcelImportModal: React.FC<Props> = ({ isOpen, onClose, onImportComplete }) => {
  const { activeGym } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number }>({ imported: 0, failed: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !activeGym) return null;

  // Strict date parsing supporting YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
  const parseStrictDate = (val?: string): { date: string; isValid: boolean; isEmpty: boolean } => {
    if (!val || !val.trim()) {
      return { date: '', isValid: true, isEmpty: true };
    }
    const s = val.trim();

    // Match YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(Date.UTC(year, month - 1, day));
        if (
          d.getUTCFullYear() === year &&
          d.getUTCMonth() === month - 1 &&
          d.getUTCDate() === day
        ) {
          return {
            date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            isValid: true,
            isEmpty: false,
          };
        }
      }
      return { date: '', isValid: false, isEmpty: false };
    }

    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(Date.UTC(year, month - 1, day));
        if (
          d.getUTCFullYear() === year &&
          d.getUTCMonth() === month - 1 &&
          d.getUTCDate() === day
        ) {
          return {
            date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            isValid: true,
            isEmpty: false,
          };
        }
      }
      return { date: '', isValid: false, isEmpty: false };
    }

    return { date: '', isValid: false, isEmpty: false };
  };

  // Strict numeric parser for currency/amount columns
  const parseStrictAmount = (val?: string): { value?: number; isValid: boolean; isEmpty: boolean } => {
    if (val === undefined || val === null || val.trim() === '') {
      return { value: undefined, isValid: true, isEmpty: true };
    }
    const raw = val.trim();
    const cleaned = raw.replace(/,/g, '').replace(/^₹\s*/, '').trim();
    if (!/^(\d+(\.\d+)?)$/.test(cleaned)) {
      return { value: undefined, isValid: false, isEmpty: false };
    }
    const num = Number(cleaned);
    if (isNaN(num) || num < 0) {
      return { value: undefined, isValid: false, isEmpty: false };
    }
    return { value: num, isValid: true, isEmpty: false };
  };

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const handleProcessCSV = (rawText: string) => {
    setErrorMessage(null);
    if (!rawText.trim()) {
      setErrorMessage('The file or pasted content is empty. Please provide valid spreadsheet data.');
      return;
    }

    const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      setErrorMessage('At least a header row and one data row are required.');
      return;
    }

    const headerRow = parseCSVLine(lines[0]);
    const normalizedHeaders = headerRow.map(h => normalizeKey(h));

    // Identify column indexes
    const findIndex = (aliases: string[]): number => {
      return normalizedHeaders.findIndex(h => aliases.some(alias => h.includes(alias)));
    };

    const nameIdx = findIndex(['name', 'membername', 'fullname', 'member']);
    const phoneIdx = findIndex(['contact', 'phone', 'mobile', 'cell', 'mobilenumber']);
    const genderIdx = findIndex(['gender', 'sex']);
    const planIdx = findIndex(['membership', 'plan', 'package', 'duration']);
    const ptIdx = findIndex(['pt', 'personaltraining']);
    const fromIdx = findIndex(['from', 'startdate', 'admission', 'joiningdate', 'joindate']);
    const toIdx = findIndex(['to', 'enddate', 'expiry', 'expirydate']);
    const basicFeeIdx = findIndex(['basicfee', 'basicfees', 'planfee']);
    const ptFeeIdx = findIndex(['ptfee', 'ptfees']);
    const discountIdx = findIndex(['discount']);
    const totalFeeIdx = findIndex(['totalfees', 'totalfee', 'totalamount', 'amount', 'fee', 'price', 'total']);
    const paidIdx = findIndex(['feepaid', 'paidamount', 'paid', 'payment']);
    const payMethodIdx = findIndex(['paymentmethod', 'method', 'mode', 'paymentmode', 'paymode']);
    const remainingIdx = findIndex(['remainingfee', 'remainingfees', 'remaining', 'balance', 'due', 'pending']);
    const remarkIdx = findIndex(['remark', 'remarks', 'notes', 'comment']);
    const holdIdx = findIndex(['membershiphold', 'hold', 'onhold']);

    if (nameIdx === -1 && phoneIdx === -1) {
      setErrorMessage(
        'Could not detect "Name" or "Contact no." columns. Please check your CSV column headers.'
      );
      return;
    }

    const rows: ParsedRow[] = [];
    const seenPhonesInCsv = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = parseCSVLine(line);
      if (cols.every(c => !c)) continue; // skip blank line

      const rawObj: Record<string, string> = {};
      headerRow.forEach((h, idx) => {
        rawObj[h] = cols[idx] || '';
      });

      const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].trim() : '';
      const rawPhone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].trim() : '';
      const phoneDigits = rawPhone.replace(/\D/g, '').slice(-10);

      const rawGender = genderIdx !== -1 && cols[genderIdx] ? cols[genderIdx].trim().toLowerCase() : '';
      const gender: 'male' | 'female' | 'other' | undefined = rawGender.startsWith('m')
        ? 'male'
        : rawGender.startsWith('f')
        ? 'female'
        : rawGender
        ? 'other'
        : undefined;

      const rawPayMethod = payMethodIdx !== -1 && cols[payMethodIdx] ? cols[payMethodIdx].trim() : 'cash';
      const paymentMethod = normalizePaymentMethod(rawPayMethod);

      const planName = planIdx !== -1 && cols[planIdx] ? cols[planIdx].trim() : '1 Month';
      const ptRaw = ptIdx !== -1 && cols[ptIdx] ? cols[ptIdx].trim().toLowerCase() : '';
      const ptEnabled = ptRaw === 'yes' || ptRaw === 'true' || ptRaw === 'y' || ptRaw === '1' || Number(ptRaw) > 0;

      // Strict date parsing
      const rawStartVal = fromIdx !== -1 ? cols[fromIdx] : undefined;
      const startParsed = parseStrictDate(rawStartVal);
      const startDate = startParsed.isValid
        ? (startParsed.isEmpty ? getTodayDateString() : startParsed.date)
        : '';

      const rawEndVal = toIdx !== -1 ? cols[toIdx] : undefined;
      const endParsed = parseStrictDate(rawEndVal);
      let endDate = '';
      if (endParsed.isValid) {
        endDate = !endParsed.isEmpty
          ? endParsed.date
          : (startDate ? addDaysToDate(startDate, 30) : '');
      }

      // Strict amount parsing
      const rawTotalVal = totalFeeIdx !== -1 ? cols[totalFeeIdx] : undefined;
      const totalParsed = parseStrictAmount(rawTotalVal);

      const rawBasicVal = basicFeeIdx !== -1 ? cols[basicFeeIdx] : undefined;
      const basicParsed = parseStrictAmount(rawBasicVal);

      const rawPtVal = ptFeeIdx !== -1 ? cols[ptFeeIdx] : undefined;
      const ptParsed = parseStrictAmount(rawPtVal);

      const rawDiscountVal = discountIdx !== -1 ? cols[discountIdx] : undefined;
      const discountParsed = parseStrictAmount(rawDiscountVal);

      const rawPaidVal = paidIdx !== -1 ? cols[paidIdx] : undefined;
      const paidParsed = parseStrictAmount(rawPaidVal);

      const rawRemainingVal = remainingIdx !== -1 ? cols[remainingIdx] : undefined;
      const remainingParsed = parseStrictAmount(rawRemainingVal);

      // Validation
      const errors: string[] = [];
      if (!name) errors.push('Missing member name');
      if (!phoneDigits || phoneDigits.length < 10) {
        errors.push('Invalid phone (must be 10 digits)');
      } else if (seenPhonesInCsv.has(phoneDigits)) {
        errors.push(`Duplicate phone number (${phoneDigits}) in CSV`);
      } else {
        seenPhonesInCsv.add(phoneDigits);
      }

      // Validate dates
      if (!startParsed.isValid) {
        errors.push(`Invalid start date: "${rawStartVal?.trim() || ''}"`);
      }
      if (rawEndVal && rawEndVal.trim() && !endParsed.isValid) {
        errors.push(`Invalid end date: "${rawEndVal.trim()}"`);
      }

      // Validate amounts
      if (!totalParsed.isValid) {
        errors.push(`Invalid Amount: "${rawTotalVal?.trim() || ''}" (must be a valid number)`);
      }
      if (rawBasicVal !== undefined && rawBasicVal.trim() !== '' && !basicParsed.isValid) {
        errors.push(`Invalid basic fee: "${rawBasicVal.trim()}"`);
      }
      if (rawPtVal !== undefined && rawPtVal.trim() !== '' && !ptParsed.isValid) {
        errors.push(`Invalid PT fee: "${rawPtVal.trim()}"`);
      }
      if (rawDiscountVal !== undefined && rawDiscountVal.trim() !== '' && !discountParsed.isValid) {
        errors.push(`Invalid discount: "${rawDiscountVal.trim()}"`);
      }
      if (rawPaidVal !== undefined && rawPaidVal.trim() !== '' && !paidParsed.isValid) {
        errors.push(`Invalid Paid amount: "${rawPaidVal.trim()}" (must be a valid number)`);
      }
      if (rawRemainingVal !== undefined && rawRemainingVal.trim() !== '' && !remainingParsed.isValid) {
        errors.push(`Invalid remaining balance: "${rawRemainingVal.trim()}"`);
      }

      // Calculate fee figures
      let totalFee = 0;
      let basicFee = 0;
      let ptFee = ptParsed.isValid && ptParsed.value !== undefined ? ptParsed.value : (ptEnabled ? 2000 : 0);
      let discount = discountParsed.isValid && discountParsed.value !== undefined ? discountParsed.value : 0;

      if (totalParsed.isValid && totalParsed.value !== undefined) {
        totalFee = totalParsed.value;
        basicFee = basicParsed.isValid && basicParsed.value !== undefined
          ? basicParsed.value
          : Math.max(0, totalFee - ptFee + discount);
      } else if (basicParsed.isValid && basicParsed.value !== undefined) {
        basicFee = basicParsed.value;
        totalFee = Math.max(0, basicFee + ptFee - discount);
      } else {
        if (totalFeeIdx !== -1 && rawTotalVal !== undefined && rawTotalVal.trim() !== '') {
          totalFee = 0;
          basicFee = 0;
        } else {
          basicFee = 1500;
          totalFee = Math.max(0, basicFee + ptFee - discount);
        }
      }

      // Paid amount calculation
      let paidAmount = 0;
      if (paidParsed.isValid && paidParsed.value !== undefined) {
        paidAmount = paidParsed.value;
      } else {
        paidAmount = totalFee;
      }

      // Paid vs Total validation
      if (totalParsed.isValid && paidParsed.isValid && paidAmount > totalFee) {
        errors.push(`Paid amount (₹${paidAmount}) exceeds total fee (₹${totalFee})`);
      }

      // Remaining balance calculation
      const remainingAmount = Math.max(0, totalFee - paidAmount);

      const notes = remarkIdx !== -1 && cols[remarkIdx] ? cols[remarkIdx].trim() : '';
      const holdRaw = holdIdx !== -1 && cols[holdIdx] ? cols[holdIdx].trim().toLowerCase() : '';
      const isOnHold = holdRaw === 'yes' || holdRaw === 'true' || holdRaw === 'y';

      rows.push({
        index: i,
        raw: rawObj,
        name,
        phone: phoneDigits || rawPhone,
        gender,
        paymentMethod,
        planName,
        ptEnabled,
        startDate,
        endDate,
        basicFee,
        ptFee,
        discount,
        totalFee,
        paidAmount,
        remainingAmount,
        notes,
        isOnHold,
        isValid: errors.length === 0,
        errors,
        rawStartDateDisplay: !startParsed.isValid ? rawStartVal?.trim() : undefined,
        rawAmountDisplay: !totalParsed.isValid ? rawTotalVal?.trim() : undefined,
        rawPaidDisplay: !paidParsed.isValid ? rawPaidVal?.trim() : undefined,
      });
    }

    setParsedRows(rows);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setCsvText(text);
      handleProcessCSV(text);
    };
    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const sampleHeaders = [
      'S.no.',
      'Name',
      'Contact no.',
      'Membership',
      'P.T.',
      'From',
      'To',
      'Basic fees',
      'P.T. fees',
      'Discount',
      'Total fees',
      'FEE Paid',
      'Remaining Fees',
      'Remark',
      'Membership Hold',
    ].join(',');

    const today = getTodayDateString();
    const sampleRows = [
      `1,Rahul Sharma,9876543210,3 Months,No,${today},${addDaysToDate(today, 90)},3800,0,0,3800,3800,0,Morning batch,No`,
      `2,Pooja Patel,9823456789,1 Month,Yes,${today},${addDaysToDate(today, 30)},1500,2000,200,3300,2000,1300,PT with Coach Amit,No`,
      `3,Amit Verma,9812345678,6 Months,No,${today},${addDaysToDate(today, 180)},6500,0,500,6000,6000,0,Annual renewal,No`,
      `4,Sunil Gupta,9898765432,1 Month,No,${today},${addDaysToDate(today, 30)},1500,0,0,1500,1000,500,Balance pending,Yes`,
    ].join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRows}`)}`;
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'kru_fitness_register_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCommitImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setStep('importing');
    setProgress(0);

    let importedCount = 0;
    let failedCount = 0;

    try {
      // 1. Fetch or cache existing plans for gym
      const existingPlans = await planService.getPlans(activeGym.id);
      const planCache = new Map<string, string>();
      existingPlans.forEach(p => planCache.set(p.name.toLowerCase().trim(), p.id));

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        try {
          // Check if plan exists; if not, create on the fly in membership_plans
          let planId = planCache.get(row.planName.toLowerCase().trim());
          if (!planId) {
            const days = row.planName.toLowerCase().includes('3')
              ? 90
              : row.planName.toLowerCase().includes('6')
              ? 180
              : row.planName.toLowerCase().includes('year') || row.planName.toLowerCase().includes('12')
              ? 365
              : 30;

            const newPlan = await planService.createPlan(activeGym.id, {
              name: row.planName,
              duration_days: days,
              price: row.basicFee,
              description: `Imported plan: ${row.planName}`,
            });
            planId = newPlan.id;
            planCache.set(row.planName.toLowerCase().trim(), planId);
          }

          // Create member and membership in PostgreSQL
          const createdMember = await memberService.createMemberWithMembership(activeGym.id, {
            name: row.name,
            phone: row.phone,
            gender: row.gender,
            notes: row.notes || undefined,
            plan_id: planId,
            start_date: row.startDate,
            basic_fee: row.basicFee,
            pt_enabled: row.ptEnabled,
            pt_fee: row.ptFee,
            discount: row.discount,
            total_fee: row.totalFee,
            initial_payment: row.paidAmount,
            payment_method: row.paymentMethod,
          });

          // If marked on-hold in register, apply hold status
          if (row.isOnHold && createdMember.current_membership?.id) {
            try {
              await membershipService.holdMembership(activeGym.id, createdMember.current_membership.id, {
                start_date: row.startDate,
                end_date: row.endDate,
                reason: 'Imported from register as On Hold',
              });
            } catch (holdErr) {
              console.warn('Could not apply on-hold to imported member:', holdErr);
            }
          }

          importedCount++;
        } catch (rowErr) {
          console.error(`Failed to import row ${row.index} (${row.name}):`, rowErr);
          failedCount++;
        }

        setProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      setImportResult({ imported: importedCount, failed: failedCount });
      setStep('completed');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Import process encountered an error.');
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredRows = parsedRows.filter(r => {
    if (filter === 'valid') return r.isValid;
    if (filter === 'invalid') return !r.isValid;
    return true;
  });

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-teal-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-700/60 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Gym Register (Excel / CSV)</h2>
              <p className="text-xs text-teal-200">
                Import member records, plans, and fees directly into {activeGym.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 text-teal-200 hover:text-white rounded-lg hover:bg-teal-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">Supported Spreadsheet Columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'S.no.',
                    'Name',
                    'Contact no.',
                    'Membership',
                    'P.T.',
                    'From',
                    'To',
                    'Basic fees',
                    'P.T. fees',
                    'Discount',
                    'Total fees',
                    'FEE Paid',
                    'Remaining Fees',
                    'Remark',
                    'Membership Hold',
                  ].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono text-[11px] text-slate-700">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Kru Fitness automatically converts and normalizes these fields into your PostgreSQL database model.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-300 hover:border-teal-600 bg-teal-50/40 hover:bg-teal-50 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <div className="w-12 h-12 bg-teal-100 text-teal-800 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drop your CSV spreadsheet here
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Exports from Excel (.csv format) supported
                  </p>
                </div>
              </div>

              {/* Paste Direct Text Option */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Or paste CSV text directly:</span>
                  </label>
                  <button
                    type="button"
                    onClick={downloadSampleCSV}
                    className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Sample Template</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder="S.no.,Name,Contact no.,Membership,From,To,Total fees,FEE Paid,Remaining Fees..."
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
                {csvText.trim().length > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleProcessCSV(csvText)}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
                    >
                      <span>Analyze Spreadsheet Data</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500">Total Rows</span>
                  <p className="text-lg font-bold text-slate-800 font-mono">{parsedRows.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs text-emerald-700 font-semibold">Valid & Ready</span>
                  <p className="text-lg font-bold text-emerald-800 font-mono">{validCount}</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-xs text-amber-700 font-semibold">Issues Detected</span>
                  <p className="text-lg font-bold text-amber-800 font-mono">{invalidCount}</p>
                </div>
              </div>

              {/* Filter controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setFilter('valid')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      filter === 'valid' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Valid ({validCount})
                  </button>
                  {invalidCount > 0 && (
                    <button
                      onClick={() => setFilter('invalid')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        filter === 'invalid' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Issues ({invalidCount})
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setParsedRows([]);
                    setStep('upload');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Choose Different File
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[340px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Member Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRows.map(row => (
                      <tr key={row.index} className={row.isValid ? 'hover:bg-slate-50' : 'bg-amber-50/40'}>
                        <td className="py-2.5 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ready</span>
                            </span>
                          ) : (
                            <span
                              title={row.errors.join(', ')}
                              className="inline-flex items-center space-x-1 text-red-600 text-[11px] font-semibold"
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{row.errors[0]}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{row.name || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{row.phone || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {row.planName}
                          {row.ptEnabled && <span className="ml-1 text-[10px] text-teal-700 font-bold">(PT)</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {row.rawStartDateDisplay ? (
                            <span className="text-red-500 font-mono italic" title="Invalid date">{row.rawStartDateDisplay}</span>
                          ) : (
                            `${formatDate(row.startDate)} → ${formatDate(row.endDate)}`
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {row.rawAmountDisplay !== undefined ? (
                            <span className="text-red-500 font-bold" title="Invalid amount">{row.rawAmountDisplay}</span>
                          ) : (
                            formatINR(row.totalFee)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                          {row.rawPaidDisplay !== undefined ? (
                            <span className="text-red-500 font-bold" title="Invalid paid amount">{row.rawPaidDisplay}</span>
                          ) : (
                            formatINR(row.paidAmount)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {row.remainingAmount > 0 ? (
                            <span className="text-amber-700 font-bold">{formatINR(row.remainingAmount)}</span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-teal-700 animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Importing Member Records...</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Writing normalized member, plan, and fee records to PostgreSQL
                </p>
              </div>
              <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-700 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-mono font-semibold text-slate-600">{progress}% complete</p>
            </div>
          )}

          {step === 'completed' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Completed Successfully!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-emerald-700 font-mono">{importResult.imported}</span> member
                  {importResult.imported !== 1 ? 's' : ''} imported into {activeGym.name}.
                  {importResult.failed > 0 && (
                    <span className="text-amber-700 ml-1">({importResult.failed} failed due to errors)</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            {step === 'completed' ? 'Close' : 'Cancel'}
          </button>

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={validCount === 0 || isImporting}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 active:scale-98"
            >
              <span>Commit Import ({validCount} Valid Records)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 'completed' && (
            <button
              type="button"
              onClick={() => {
                onImportComplete();
                onClose();
              }}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Done & Refresh Members
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
