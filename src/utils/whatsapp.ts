import { Member, Membership, Payment, Gym } from '../types';
import { formatDate, formatINR } from './index';

/**
 * Normalizes phone number to standard international format (defaults to Indian +91 if 10 digits).
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Opens WhatsApp Web or WhatsApp app with pre-filled message URL.
 */
export function openWhatsApp(phone: string, text: string): void {
  const cleanPhone = sanitizeWhatsAppPhone(phone);
  if (!cleanPhone) {
    alert('Invalid or missing mobile number for WhatsApp.');
    return;
  }
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Message template generators for common gym alerts (English).
 */
export const whatsappTemplates = {
  /**
   * Membership Expiry Alert (Upcoming or Already Expired)
   */
  membershipExpiry: (params: {
    gymName: string;
    memberName: string;
    planName: string;
    endDate: string;
    daysRemaining: number;
    gymPhone?: string;
  }) => {
    const { gymName, memberName, planName, endDate, daysRemaining, gymPhone } = params;
    
    let timeStatus = '';
    if (daysRemaining < 0) {
      timeStatus = `*expired ${Math.abs(daysRemaining)} days ago on ${formatDate(endDate)}.*`;
    } else if (daysRemaining === 0) {
      timeStatus = `*expires today (${formatDate(endDate)}).*`;
    } else {
      timeStatus = `*will expire in ${daysRemaining} days on ${formatDate(endDate)}.*`;
    }

    return `Hello *${memberName}*! 👋

Your *${planName}* gym membership at *${gymName}* ${timeStatus}

To continue your training streak without interruption, please renew your membership at your earliest convenience.

Stay dedicated to your fitness goals! 💪
${gymPhone ? `📞 Contact: ${gymPhone}` : ''}
— Team *${gymName}*`;
  },

  /**
   * Payment Receipt / Confirmation
   */
  paymentReceipt: (params: {
    gymName: string;
    memberName: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    receiptNo?: string;
    planName?: string;
    remainingDue?: number;
    gymPhone?: string;
  }) => {
    const { gymName, memberName, amount, paymentMethod, paymentDate, receiptNo, planName, remainingDue, gymPhone } = params;

    let receiptMsg = `Hello *${memberName}*! 👋\n\n`;
    receiptMsg += `Your payment to *${gymName}* has been successfully received.\n\n`;
    receiptMsg += `🧾 *Official Payment Receipt:*\n`;
    receiptMsg += `• Amount Paid: *${formatINR(amount)}*\n`;
    receiptMsg += `• Date: ${formatDate(paymentDate)}\n`;
    receiptMsg += `• Payment Mode: ${paymentMethod.toUpperCase()}\n`;
    if (receiptNo) receiptMsg += `• Ref / Receipt No: ${receiptNo}\n`;
    if (planName) receiptMsg += `• Membership Plan: ${planName}\n`;
    
    if (remainingDue !== undefined && remainingDue > 0) {
      receiptMsg += `\n⚠️ *Pending Balance:* ${formatINR(remainingDue)}\n`;
    } else {
      receiptMsg += `\n✅ *Status:* Fees Fully Cleared\n`;
    }

    receiptMsg += `\nThank you for working out with us! Stay strong and healthy! 🏋️‍♂️\n`;
    if (gymPhone) receiptMsg += `📞 Contact: ${gymPhone}\n`;
    receiptMsg += `— Team *${gymName}*`;

    return receiptMsg;
  },

  /**
   * Pending Balance Reminder
   */
  duePaymentReminder: (params: {
    gymName: string;
    memberName: string;
    dueAmount: number;
    planName?: string;
    gymPhone?: string;
  }) => {
    const { gymName, memberName, dueAmount, planName, gymPhone } = params;

    return `Hello *${memberName}*! 👋

This is a gentle reminder regarding your pending fee balance of *${formatINR(dueAmount)}* at *${gymName}*${planName ? ` for your ${planName} plan` : ''}.

Kindly clear the balance at the reception counter or via online UPI at your convenience.

Thank you!
${gymPhone ? `📞 Contact: ${gymPhone}` : ''}
— Team *${gymName}*`;
  },

  /**
   * Welcome New Member Message
   */
  welcomeMember: (params: {
    gymName: string;
    memberName: string;
    planName: string;
    startDate: string;
    endDate: string;
    gymPhone?: string;
  }) => {
    const { gymName, memberName, planName, startDate, endDate, gymPhone } = params;

    return `Welcome to *${gymName}*, *${memberName}*! 🎉🏋️‍♂️

Your fitness journey officially starts today!
• Plan: *${planName}*
• Start Date: ${formatDate(startDate)}
• Valid Until: ${formatDate(endDate)}

Consistency is the key to lasting progress. See you on the gym floor! 💪
${gymPhone ? `📞 Helpline: ${gymPhone}` : ''}
— Team *${gymName}*`;
  }
};
