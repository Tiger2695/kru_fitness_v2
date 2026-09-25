import { z } from 'zod';

export const phoneRegex = /^[6-9]\d{9}$/;

export const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const gymSetupSchema = z.object({
  name: z.string().min(2, 'Gym name is required (min 2 characters)'),
  owner_name: z.string().min(2, 'Owner name is required'),
  phone: z.string().regex(phoneRegex, 'Please enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  attendance_enabled: z.boolean().default(false),
});

export const memberCreateSchema = z.object({
  name: z.string().min(2, 'Member name is required'),
  phone: z.string().regex(phoneRegex, 'Please enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),

  // Initial membership fields
  plan_id: z.string().min(1, 'Please select a membership plan'),
  start_date: z.string().min(1, 'Start date is required'),
  basic_fee: z.coerce.number().min(0, 'Basic fee must be non-negative'),
  pt_enabled: z.boolean().default(false),
  pt_fee: z.coerce.number().min(0, 'PT fee must be non-negative').default(0),
  discount: z.coerce.number().min(0, 'Discount must be non-negative').default(0),
  total_fee: z.coerce.number().min(0, 'Total fee must be non-negative'),
  initial_payment: z.coerce.number().min(0, 'Initial payment cannot be negative').default(0),
  payment_method: z.enum(['cash', 'UPI', 'card', 'bank_transfer', 'other']).default('cash'),
  transaction_reference: z.string().optional().nullable(),
}).refine(data => data.initial_payment <= data.total_fee, {
  message: 'Initial payment cannot exceed the total fee',
  path: ['initial_payment'],
});

export const paymentCreateSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  payment_method: z.enum(['cash', 'UPI', 'card', 'bank_transfer', 'other']),
  payment_date: z.string().min(1, 'Payment date is required'),
  transaction_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const renewalSchema = z.object({
  plan_id: z.string().min(1, 'Please select a plan'),
  start_date: z.string().min(1, 'Start date is required'),
  basic_fee: z.coerce.number().min(0, 'Basic fee must be non-negative'),
  pt_enabled: z.boolean().default(false),
  pt_fee: z.coerce.number().min(0, 'PT fee must be non-negative').default(0),
  discount: z.coerce.number().min(0, 'Discount must be non-negative').default(0),
  total_fee: z.coerce.number().min(0, 'Total fee must be non-negative'),
  initial_payment: z.coerce.number().min(0, 'Payment cannot be negative').default(0),
  payment_method: z.enum(['cash', 'UPI', 'card', 'bank_transfer', 'other']).default('cash'),
  transaction_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(data => data.initial_payment <= data.total_fee, {
  message: 'Initial payment cannot exceed total fee',
  path: ['initial_payment'],
});

export const membershipHoldSchema = z.object({
  start_date: z.string().min(1, 'Hold start date is required'),
  end_date: z.string().min(1, 'Hold end date is required'),
  reason: z.string().optional().nullable(),
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return end >= start;
}, {
  message: 'Hold end date must be on or after start date',
  path: ['end_date'],
});

export const membershipPlanSchema = z.object({
  name: z.string().min(2, 'Plan name is required (e.g. Monthly, Quarterly, Yearly)'),
  duration_days: z.coerce.number().int().positive('Duration must be at least 1 day'),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  description: z.string().optional().nullable(),
});
