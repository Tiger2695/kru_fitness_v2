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
 * Message template generators for common gym alerts.
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
      timeStatus = `*${Math.abs(daysRemaining)} din pehle (${formatDate(endDate)}) expire ho chuki hai.*`;
    } else if (daysRemaining === 0) {
      timeStatus = `*aaj (${formatDate(endDate)}) expire ho rahi hai.*`;
    } else {
      timeStatus = `agle *${daysRemaining} dinon mein (${formatDate(endDate)}) expire hone wali hai.*`;
    }

    return `Namaste *${memberName}* ji! 🙏

Aapki *${gymName}* mein *${planName}* gym membership ${timeStatus}

Workout streak continue rakhne ke liye kripya apni membership timely renew karwayein.

Fitness goals ko rukne na dein! 💪
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

    let receiptMsg = `Namaste *${memberName}* ji! 🙏\n\n`;
    receiptMsg += `Aapka payment *${gymName}* ko safaltapoorvak receive ho gaya hai.\n\n`;
    receiptMsg += `🧾 *Payment Receipt:*\n`;
    receiptMsg += `• Amount Paid: *${formatINR(amount)}*\n`;
    receiptMsg += `• Date: ${formatDate(paymentDate)}\n`;
    receiptMsg += `• Mode: ${paymentMethod.toUpperCase()}\n`;
    if (receiptNo) receiptMsg += `• Ref/Receipt No: ${receiptNo}\n`;
    if (planName) receiptMsg += `• Plan: ${planName}\n`;
    
    if (remainingDue !== undefined && remainingDue > 0) {
      receiptMsg += `\n⚠️ *Pending Balance:* ${formatINR(remainingDue)}\n`;
    } else {
      receiptMsg += `\n✅ *Status:* Fees Fully Cleared\n`;
    }

    receiptMsg += `\nHumare saath judne ke liye dhanyavaad! Healthy rahein, fit rahein! 🏋️‍♂️\n`;
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

    return `Namaste *${memberName}* ji! 🙏

Aapka *${gymName}* mein *${formatINR(dueAmount)}* ka fees balance pending hai${planName ? ` (${planName})` : ''}.

Kripya apni suvidhanusar counter par ya online (UPI) ke dwara payment clear kar dein.

Shukriya!
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

    return `Welcome to *${gymName}*, *${memberName}* ji! 🎉🏋️‍♂️

Aapka fitness journey shuru ho chuka hai!
• Plan: *${planName}*
• Start Date: ${formatDate(startDate)}
• Valid Till: ${formatDate(endDate)}

Consistency hi success ki chaabi hai. See you in the gym today! 💪
${gymPhone ? `📞 Helpline: ${gymPhone}` : ''}
— Team *${gymName}*`;
  }
};
