export type GymRole = 'owner' | 'manager' | 'receptionist' | 'trainer';

export type MembershipStatus = 'active' | 'expired' | 'on_hold' | 'cancelled';

export type PaymentMethod = 'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other';

export interface Gym {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  logo_url?: string | null;
  attendance_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GymUser {
  id: string;
  gym_id: string;
  user_id: string;
  role: GymRole;
  created_at: string;
  profiles?: Profile;
}

export interface Member {
  id: string;
  gym_id: string;
  member_code?: string | null;
  name: string;
  full_name?: string;
  phone: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  date_of_birth?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  current_membership?: Membership | null;
}

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id?: string | null;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  basic_fee: number;
  pt_enabled: boolean;
  pt_fee: number;
  discount: number;
  total_fee: number;
  paid_amount: number;
  remaining_amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  plan?: MembershipPlan | null;
  member?: Member | null;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  transaction_reference?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  // Joined fields
  member?: {
    name: string;
    phone: string;
  };
}

export interface MembershipHold {
  id: string;
  gym_id: string;
  membership_id: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason?: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  gym_id: string;
  member_id: string;
  check_in: string;
  check_out?: string | null;
  marked_by?: string | null;
  created_at: string;
  member?: {
    name: string;
    phone: string;
    member_code?: string | null;
  };
}

export interface DashboardStats {
  activeMembers: number;
  todayCollection: number;
  pendingFees: number;
  expiringSoon: number;
  todayAttendance?: number;
  attentionItems: {
    pendingFeesCount: number;
    expiringWithin7DaysCount: number;
    expiredCount: number;
    onHoldCount: number;
  };
}

export interface MemberDetail extends Member {
  memberships: Membership[];
  payments: Payment[];
  attendance: AttendanceRecord[];
}
