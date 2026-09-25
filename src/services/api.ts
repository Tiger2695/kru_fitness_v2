import { getSupabaseClient } from '../lib/supabase';
import {
  Gym,
  GymUser,
  Member,
  MembershipPlan,
  Membership,
  Payment,
  AttendanceRecord,
  DashboardStats,
  MemberDetail,
} from '../types';
import { addDaysToDate, getDaysDifference, calculateFinancials, getTodayDateString } from '../utils';

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase PostgreSQL is not configured. Please enter your Supabase Project URL and Anon Key in Database Setup.');
  }
  return client;
}

/**
 * Sanitizes technical PostgreSQL, PostgREST, or network error messages
 * so that end users never see raw SQL errors, stack traces, table names, or UUIDs.
 */
export function sanitizeErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const message = typeof err === 'string' ? err : err.message || '';
  const code = err.code || '';

  if (code === '23505') {
    return 'A record with this phone number or unique details already exists.';
  }
  if (code === '23503') {
    return 'The referenced member, plan, or gym record was not found.';
  }
  if (code === '23514') {
    return 'The entered data does not meet required criteria (e.g. positive amounts).';
  }
  if (code === '42501') {
    return 'Access denied: You do not have permission to access or modify this record.';
  }
  if (code === '42P01' || code === 'PGRST205' || message.includes('Could not find the table') || message.includes('schema cache')) {
    return 'The required database table has not been initialized yet. Please check Database Setup.';
  }
  if (code === 'PGRST116') {
    return 'The requested record was not found.';
  }

  // Remove UUID patterns and internal SQL references
  const cleaned = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/public\.\w+/g, 'database record')
    .replace(/relation "\w+" does not exist/i, 'Database table not found')
    .replace(/column "\w+" of relation "\w+" does not exist/i, 'Database column mismatch')
    .trim();

  return cleaned || 'An unexpected error occurred. Please try again.';
}

export function normalizePaymentMethod(method?: string): 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' {
  if (!method) return 'cash';
  const m = method.toLowerCase().trim();
  if (m.includes('upi')) return 'upi';
  if (m.includes('card')) return 'card';
  if (m.includes('bank') || m.includes('transfer') || m.includes('neft') || m.includes('rtgs') || m.includes('netbanking')) return 'bank_transfer';
  if (m.includes('cheque') || m.includes('check')) return 'cheque';
  return 'cash';
}

export function normalizeGenderForDb(gender?: string | null): 'Male' | 'Female' | 'Other' | null {
  if (!gender) return null;
  const g = gender.toLowerCase().trim();
  if (g.startsWith('m')) return 'Male';
  if (g.startsWith('f')) return 'Female';
  return 'Other';
}

// ============================================================================
// GYM & WORKSPACE SERVICES (Multi-Tenant Production PostgreSQL)
// ============================================================================
export const gymService = {
  /**
   * Retrieves all gyms to which the currently authenticated user belongs via gym_users.
   * Does NOT auto-link arbitrary gyms to prevent cross-tenant leakage.
   */
  async getMyGyms(): Promise<{ gym: Gym; role: string }[]> {
    const supabase = requireClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return [];
    const userId = userData.user.id;
    const userEmail = userData.user.email?.toLowerCase().trim();

    // Check if current user is Super Admin
    const isSuper = userEmail && (
      ['tigerchitransh@gmail.com', 'chitranshm13@gmail.com', 'sonurambo78@gmail.com'].includes(userEmail) ||
      userData.user.user_metadata?.is_super_admin === true ||
      userData.user.user_metadata?.role === 'superadmin'
    );

    if (isSuper) {
      // Super Admin can access and manage all gyms on the platform
      const { data: allGyms, error: allGymsErr } = await supabase
        .from('gyms')
        .select('*')
        .order('created_at', { ascending: false });

      if (!allGymsErr && allGyms && allGyms.length > 0) {
        return allGyms.map(g => ({
          gym: g as Gym,
          role: 'owner',
        }));
      }
    }

    // 1. Try querying via gym_users link
    const { data, error } = await supabase
      .from('gym_users')
      .select(`
        role,
        gym:gyms (*)
      `)
      .eq('user_id', userId);

    if (!error && data && data.length > 0) {
      const validGyms = data
        .filter((item: any) => item.gym)
        .map((item: any) => ({
          gym: item.gym as Gym,
          role: item.role,
        }));

      if (validGyms.length > 0) {
        return validGyms;
      }
    }

    // 2. Auto-heal fallback: Check if a gym exists with matching owner email
    if (userEmail) {
      try {
        const { data: matchedGyms } = await supabase
          .from('gyms')
          .select('*')
          .ilike('email', userEmail);

        if (matchedGyms && matchedGyms.length > 0) {
          // Link this authenticated user to their gym
          for (const mg of matchedGyms) {
            await supabase
              .from('gym_users')
              .upsert({
                gym_id: mg.id,
                user_id: userId,
                role: 'owner',
              }, { onConflict: 'gym_id,user_id' });
          }

          return matchedGyms.map(g => ({
            gym: g as Gym,
            role: 'owner',
          }));
        }
      } catch (err) {
        console.warn('Auto-heal gym lookup error:', err);
      }
    }

    return [];
  },

  async createGym(gymData: {
    name: string;
    owner_name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    attendance_enabled?: boolean;
  }): Promise<Gym> {
    const supabase = requireClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error('You must be logged in to register a gym workspace.');
    }
    const userId = userData.user.id;

    let gym: any = null;

    // 1. Try atomic create_gym_workspace RPC first
    // Note: Live Postgres function might have 7 parameters (with p_attendance_enabled) or 6 parameters (without it)
    try {
      const { data: rpcRes, error: rpcError } = await supabase.rpc('create_gym_workspace', {
        p_name: gymData.name.trim(),
        p_owner_name: gymData.owner_name.trim(),
        p_phone: gymData.phone.trim(),
        p_email: gymData.email?.trim() || null,
        p_address: gymData.address?.trim() || null,
        p_city: gymData.city?.trim() || null,
        p_attendance_enabled: gymData.attendance_enabled || false,
      });

      if (!rpcError && rpcRes) {
        gym = rpcRes;
      } else if (rpcError && rpcError.code === 'PGRST202') {
        // Fallback to 6-parameter signature
        const { data: rpcRes6, error: rpcError6 } = await supabase.rpc('create_gym_workspace', {
          p_name: gymData.name.trim(),
          p_owner_name: gymData.owner_name.trim(),
          p_phone: gymData.phone.trim(),
          p_email: gymData.email?.trim() || null,
          p_address: gymData.address?.trim() || null,
          p_city: gymData.city?.trim() || null,
        });

        if (!rpcError6 && rpcRes6) {
          gym = rpcRes6;
        } else if (rpcError6 && !rpcError6.message?.includes('Could not find the function')) {
          throw new Error(sanitizeErrorMessage(rpcError6));
        }
      } else if (rpcError && !rpcError.message?.includes('Could not find the function')) {
        throw new Error(sanitizeErrorMessage(rpcError));
      }
    } catch (err: any) {
      if (!err?.message?.includes('Could not find the function') && !err?.message?.includes('schema cache')) {
        throw err;
      }
    }

    // If RPC returned a UUID string (gym_id), query the created gym row
    if (typeof gym === 'string') {
      const gymId = gym;
      const { data: fetchedGym, error: fetchErr } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single();
      if (!fetchErr && fetchedGym) {
        gym = fetchedGym;
      } else {
        gym = {
          id: gymId,
          name: gymData.name.trim(),
          owner_name: gymData.owner_name.trim(),
          phone: gymData.phone.trim(),
          city: gymData.city?.trim() || null,
          address: gymData.address?.trim() || null,
          attendance_enabled: gymData.attendance_enabled || false,
        };
      }
    }

    // 2. Fallback for unmigrated database without the RPC
    if (!gym) {
      const { data: directGym, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: gymData.name.trim(),
          owner_name: gymData.owner_name.trim(),
          phone: gymData.phone.trim(),
          email: gymData.email?.trim() || null,
          address: gymData.address?.trim() || null,
          city: gymData.city?.trim() || null,
          attendance_enabled: gymData.attendance_enabled || false,
        })
        .select()
        .single();

      if (gymError) throw new Error(sanitizeErrorMessage(gymError));
      gym = directGym;

      // Link authenticated user as gym owner
      const { error: userLinkError } = await supabase
        .from('gym_users')
        .insert({
          gym_id: gym.id,
          user_id: userId,
          role: 'owner',
        });

      if (userLinkError) {
        console.warn('gym_users link notice:', userLinkError.message);
      }
    }

    // 3. Upsert user profile
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: gymData.owner_name.trim(),
        phone: gymData.phone.trim(),
      });
    } catch {
      // Profiles optional
    }

    // 4. Seed standard starter membership plans for the new gym
    try {
      await planService.seedDefaultPlans(gym.id);
    } catch {
      // Plans seeded gracefully
    }

    return gym as Gym;
  },

  async updateGym(gymId: string, updates: Partial<Gym>): Promise<Gym> {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from('gyms')
      .update(updates)
      .eq('id', gymId)
      .select()
      .single();

    if (error) throw new Error(sanitizeErrorMessage(error));
    return data as Gym;
  },

  async toggleAttendance(gymId: string, enabled: boolean): Promise<Gym> {
    return this.updateGym(gymId, { attendance_enabled: enabled });
  },
};

// ============================================================================
// MEMBERSHIP PLANS
// ============================================================================
export const planService = {
  async getPlans(gymId: string): Promise<MembershipPlan[]> {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('is_active', true);

    if (error) throw new Error(sanitizeErrorMessage(error));

    const normalized = (data || []).map((p: any) => ({
      ...p,
      duration_days: Number(p.duration_days ?? (p.duration_months ? p.duration_months * 30 : 30)),
    })) as MembershipPlan[];

    normalized.sort((a, b) => a.duration_days - b.duration_days);
    return normalized;
  },

  async createPlan(gymId: string, plan: { name: string; duration_days: number; price: number; description?: string }): Promise<MembershipPlan> {
    const supabase = requireClient();
    const durationMonths = Math.max(1, Math.round(plan.duration_days / 30));

    const { data, error } = await supabase
      .from('membership_plans')
      .insert({
        gym_id: gymId,
        name: plan.name.trim(),
        duration_months: durationMonths,
        price: Number(plan.price),
        description: plan.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(sanitizeErrorMessage(error));

    return {
      ...data,
      duration_days: durationMonths * 30,
    } as MembershipPlan;
  },

  async seedDefaultPlans(gymId: string) {
    const supabase = requireClient();
    const defaultPlans = [
      { name: '1 Month', duration_months: 1, price: 1500, description: 'Standard Monthly Membership' },
      { name: '3 Months (Quarterly)', duration_months: 3, price: 3800, description: 'Quarterly Membership' },
      { name: '6 Months (Half Yearly)', duration_months: 6, price: 6500, description: 'Half Yearly Membership' },
      { name: '1 Year (Annual)', duration_months: 12, price: 11000, description: 'Annual Full Gym Membership' },
    ];

    try {
      await supabase.from('membership_plans').insert(
        defaultPlans.map(p => ({
          ...p,
          gym_id: gymId,
          is_active: true,
        }))
      );
    } catch {
      // Handled
    }
  },
};

// ============================================================================
// MEMBERS & MEMBERSHIPS (Production Database Contract)
// ============================================================================
export const memberService = {
  async getMembers(
    gymId: string,
    options?: {
      search?: string;
      filter?: 'all' | 'active' | 'expiring' | 'expired' | 'on_hold' | 'pending_payment';
    }
  ): Promise<Member[]> {
    const supabase = requireClient();

    // 1. Fetch gym members
    const { data: membersRaw, error: mError } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    if (mError) throw new Error(sanitizeErrorMessage(mError));
    if (!membersRaw || membersRaw.length === 0) return [];

    // Filter active members (status !== 'inactive' and !== 'archived')
    const activeMembers = membersRaw.filter((m: any) => m.status !== 'inactive' && m.status !== 'archived');

    // 2. Fetch memberships for these members
    const memberIds = activeMembers.map((m: any) => m.id);
    let memberships: any[] = [];
    if (memberIds.length > 0) {
      const { data: msData, error: msErr } = await supabase
        .from('memberships')
        .select('*')
        .eq('gym_id', gymId)
        .in('member_id', memberIds);

      if (!msErr && msData) memberships = msData;
    }

    // 3. Fetch plans to map plan names
    const planMap = new Map<string, any>();
    const { data: plans } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymId);

    (plans || []).forEach((p: any) => planMap.set(p.id, p));

    // Group memberships by member_id
    const msByMember = new Map<string, any[]>();
    memberships.forEach((ms: any) => {
      const list = msByMember.get(ms.member_id) || [];
      const total = Number(ms.total_amount ?? ms.total_fee ?? (Number(ms.paid_amount || 0) + Number(ms.remaining_amount || 0)));
      const paid = Number(ms.paid_amount ?? 0);
      const remaining = Number(ms.remaining_amount ?? Math.max(0, total - paid));
      const normalizedMs: Membership = {
        ...ms,
        basic_fee: total,
        pt_enabled: false,
        pt_fee: 0,
        discount: 0,
        total_fee: total,
        paid_amount: paid,
        remaining_amount: remaining,
        plan: ms.plan_id ? planMap.get(ms.plan_id) || null : null,
      };
      list.push(normalizedMs);
      msByMember.set(ms.member_id, list);
    });

    const todayStr = getTodayDateString();

    const membersWithCurrent: Member[] = activeMembers.map((m: any) => {
      const mList = msByMember.get(m.id) || [];
      mList.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
      const current = mList[0] || null;

      const memberName = m.full_name || m.name || 'Member';

      return {
        ...m,
        name: memberName,
        full_name: memberName,
        phone: m.phone || '',
        member_code: m.member_code || ('M-' + m.id.slice(0, 4).toUpperCase()),
        gender: m.gender ? (m.gender.toLowerCase() as any) : undefined,
        is_active: m.status === 'active',
        current_membership: current,
      };
    });

    // Apply search filter
    let result = membersWithCurrent;
    if (options?.search && options.search.trim()) {
      const s = options.search.trim().toLowerCase();
      result = result.filter(m =>
        (m.name && m.name.toLowerCase().includes(s)) ||
        (m.phone && m.phone.includes(s)) ||
        (m.member_code && m.member_code.toLowerCase().includes(s)) ||
        (m.email && m.email.toLowerCase().includes(s))
      );
    }

    if (!options?.filter || options.filter === 'all') {
      return result;
    }

    return result.filter(m => {
      const cur = m.current_membership;
      if (!cur) return options.filter === 'expired';

      if (options.filter === 'active') {
        return cur.status === 'active' && cur.end_date >= todayStr;
      }
      if (options.filter === 'expiring') {
        const in7Days = addDaysToDate(todayStr, 7);
        return cur.status === 'active' && cur.end_date >= todayStr && cur.end_date <= in7Days;
      }
      if (options.filter === 'expired') {
        return cur.status === 'expired' || cur.end_date < todayStr;
      }
      if (options.filter === 'on_hold') {
        return cur.status === 'on_hold' || (cur.status as string) === 'inactive';
      }
      if (options.filter === 'pending_payment') {
        return Number(cur.remaining_amount) > 0;
      }
      return true;
    });
  },

  async getMemberById(gymId: string, memberId: string): Promise<MemberDetail> {
    const supabase = requireClient();

    // 1. Fetch member
    const { data: memberRaw, error: mError } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', memberId)
      .single();

    if (mError || !memberRaw) throw new Error(sanitizeErrorMessage(mError || 'Member not found'));

    const memberName = memberRaw.full_name || memberRaw.name || 'Member';
    const member: Member = {
      ...memberRaw,
      name: memberName,
      full_name: memberName,
      member_code: memberRaw.member_code || ('M-' + memberRaw.id.slice(0, 4).toUpperCase()),
      gender: memberRaw.gender ? (memberRaw.gender.toLowerCase() as any) : undefined,
      is_active: memberRaw.status === 'active',
    };

    // 2. Fetch memberships
    const { data: msData } = await supabase
      .from('memberships')
      .select(`
        *,
        plan:membership_plans (id, name, price)
      `)
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('start_date', { ascending: false });

    const normalizedMemberships: Membership[] = (msData || []).map((ms: any) => {
      const total = Number(ms.total_amount ?? ms.total_fee ?? (Number(ms.paid_amount || 0) + Number(ms.remaining_amount || 0)));
      const paid = Number(ms.paid_amount ?? 0);
      const remaining = Number(ms.remaining_amount ?? Math.max(0, total - paid));
      return {
        ...ms,
        basic_fee: total,
        pt_enabled: false,
        pt_fee: 0,
        discount: 0,
        total_fee: total,
        paid_amount: paid,
        remaining_amount: remaining,
      };
    });

    // 3. Fetch payment history
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false });

    // 4. Fetch attendance if module active
    let attendance: any[] = [];
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('gym_id', gymId)
        .eq('member_id', memberId)
        .order('check_in', { ascending: false })
        .limit(30);

      if (attData) attendance = attData;
    } catch {
      // Optional
    }

    return {
      ...member,
      current_membership: normalizedMemberships[0] || null,
      memberships: normalizedMemberships,
      payments: (payments || []) as Payment[],
      attendance: attendance as AttendanceRecord[],
    };
  },

  async createMemberWithMembership(
    gymId: string,
    payload: {
      name: string;
      phone: string;
      email?: string;
      gender?: 'male' | 'female' | 'other';
      date_of_birth?: string;
      address?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
      notes?: string;
      plan_id: string;
      start_date: string;
      basic_fee: number;
      pt_enabled: boolean;
      pt_fee: number;
      discount: number;
      total_fee: number;
      initial_payment: number;
      payment_method: 'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other';
      transaction_reference?: string;
    }
  ): Promise<Member> {
    const supabase = requireClient();

    // 1. Get Plan to determine duration (scoped to gym_id!)
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', payload.plan_id)
      .single();

    if (planError || !plan) throw new Error('Selected membership plan was not found.');

    const durationDays = Number(plan.duration_months ? plan.duration_months * 30 : 30);
    const endDate = addDaysToDate(payload.start_date, durationDays);

    const { totalFee, paidAmount, remainingAmount } = calculateFinancials(
      payload.basic_fee,
      payload.pt_fee,
      payload.discount,
      payload.initial_payment
    );

    const dbGender = normalizeGenderForDb(payload.gender);

    // 2. Insert member using exact database contract
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        gym_id: gymId,
        full_name: payload.name.trim(),
        phone: payload.phone.trim(),
        email: payload.email?.trim() || null,
        gender: dbGender,
        emergency_contact: payload.emergency_contact_phone?.trim() || payload.emergency_contact_name?.trim() || null,
        blood_group: null,
        address: payload.address?.trim() || null,
        notes: payload.notes?.trim() || null,
        status: 'active',
        joined_date: payload.start_date || getTodayDateString(),
      })
      .select()
      .single();

    if (memberError) throw new Error(sanitizeErrorMessage(memberError));

    // 3. Insert membership using exact database contract
    const { data: membership, error: msError } = await supabase
      .from('memberships')
      .insert({
        gym_id: gymId,
        member_id: member.id,
        plan_id: payload.plan_id,
        start_date: payload.start_date,
        end_date: endDate,
        total_amount: totalFee,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        status: 'active',
      })
      .select()
      .single();

    if (msError) throw new Error(sanitizeErrorMessage(msError));

    // 4. Record payment if paidAmount > 0
    if (paidAmount > 0) {
      const { error: pError } = await supabase
        .from('payments')
        .insert({
          gym_id: gymId,
          member_id: member.id,
          membership_id: membership.id,
          amount: paidAmount,
          payment_method: normalizePaymentMethod(payload.payment_method),
          payment_date: payload.start_date || getTodayDateString(),
          transaction_reference: payload.transaction_reference?.trim() || null,
          notes: 'Initial registration fee',
        });

      if (pError) console.warn('Payment recording note:', pError.message);
    }

    const normalizedMembership: Membership = {
      ...membership,
      basic_fee: payload.basic_fee,
      pt_enabled: payload.pt_enabled,
      pt_fee: payload.pt_fee,
      discount: payload.discount,
      total_fee: totalFee,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      plan,
    };

    return {
      ...member,
      name: payload.name.trim(),
      full_name: payload.name.trim(),
      current_membership: normalizedMembership,
    } as Member;
  },

  async updateMember(gymId: string, memberId: string, updates: Partial<Member>): Promise<Member> {
    const supabase = requireClient();
    const payload: Record<string, any> = {};

    if (updates.name || updates.full_name) {
      payload.full_name = (updates.name || updates.full_name)?.trim();
    }
    if (updates.phone) {
      payload.phone = updates.phone.trim();
    }
    if (updates.email !== undefined) {
      payload.email = updates.email?.trim() || null;
    }
    if (updates.gender !== undefined) {
      payload.gender = normalizeGenderForDb(updates.gender);
    }
    if (updates.address !== undefined) {
      payload.address = updates.address?.trim() || null;
    }
    if (updates.emergency_contact_phone || updates.emergency_contact_name) {
      payload.emergency_contact = updates.emergency_contact_phone || updates.emergency_contact_name;
    }
    if (updates.notes !== undefined) {
      payload.notes = updates.notes?.trim() || null;
    }
    if (updates.is_active !== undefined) {
      payload.status = updates.is_active ? 'active' : 'inactive';
    }

    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('gym_id', gymId)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw new Error(sanitizeErrorMessage(error));

    return {
      ...data,
      name: data.full_name || 'Member',
      full_name: data.full_name || 'Member',
    } as Member;
  },

  async archiveMember(gymId: string, memberId: string) {
    return this.updateMember(gymId, memberId, { is_active: false } as any);
  },
};

// ============================================================================
// MEMBERSHIP RENEWALS & HOLDS
// ============================================================================
export const membershipService = {
  async renewMembership(
    gymId: string,
    memberId: string,
    payload: {
      plan_id: string;
      start_date: string;
      basic_fee: number;
      pt_enabled: boolean;
      pt_fee: number;
      discount: number;
      total_fee: number;
      initial_payment: number;
      payment_method: 'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other';
      transaction_reference?: string;
      notes?: string;
    }
  ): Promise<Membership> {
    const supabase = requireClient();

    // 1. Get plan duration (scoped to gym_id!)
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', payload.plan_id)
      .single();

    if (planError || !plan) throw new Error('Selected membership plan was not found.');

    const durationDays = Number(plan.duration_months ? plan.duration_months * 30 : 30);
    const endDate = addDaysToDate(payload.start_date, durationDays);

    const { totalFee, paidAmount, remainingAmount } = calculateFinancials(
      payload.basic_fee,
      payload.pt_fee,
      payload.discount,
      payload.initial_payment
    );

    // 2. Mark previous active memberships as expired (scoped to gym_id and member_id)
    await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .eq('status', 'active');

    // 3. Create new membership
    const { data: newMembership, error: msError } = await supabase
      .from('memberships')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        plan_id: payload.plan_id,
        start_date: payload.start_date,
        end_date: endDate,
        total_amount: totalFee,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        status: 'active',
      })
      .select()
      .single();

    if (msError) throw new Error(sanitizeErrorMessage(msError));

    // 4. Record payment if any
    if (paidAmount > 0) {
      await supabase
        .from('payments')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          membership_id: newMembership.id,
          amount: paidAmount,
          payment_method: normalizePaymentMethod(payload.payment_method),
          payment_date: payload.start_date || getTodayDateString(),
          transaction_reference: payload.transaction_reference?.trim() || null,
          notes: payload.notes?.trim() || 'Renewal payment',
        });
    }

    return {
      ...newMembership,
      basic_fee: payload.basic_fee,
      pt_enabled: payload.pt_enabled,
      pt_fee: payload.pt_fee,
      discount: payload.discount,
      total_fee: totalFee,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      plan,
    } as Membership;
  },

  async holdMembership(
    gymId: string,
    membershipId: string,
    payload: {
      start_date: string;
      end_date: string;
      reason?: string;
    }
  ): Promise<void> {
    const supabase = requireClient();

    // 1. Get current membership (scoped to gym_id!)
    const { data: membership, error: mError } = await supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', membershipId)
      .single();

    if (mError || !membership) throw new Error('Membership record was not found.');

    const holdDays = getDaysDifference(payload.start_date, payload.end_date);
    if (holdDays <= 0) throw new Error('Hold duration must be at least 1 day.');

    const newEndDate = addDaysToDate(membership.end_date, holdDays);

    // 2. Insert into membership_holds if table exists
    try {
      await supabase.from('membership_holds').insert({
        gym_id: gymId,
        membership_id: membershipId,
        start_date: payload.start_date,
        end_date: payload.end_date,
        number_of_days: holdDays,
        reason: payload.reason?.trim() || null,
      });
    } catch {
      // Handled
    }

    // 3. Update membership status and extended expiry (scoped to gym_id and membershipId)
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        status: 'on_hold',
        end_date: newEndDate,
      })
      .eq('gym_id', gymId)
      .eq('id', membershipId);

    if (updateError) throw new Error(sanitizeErrorMessage(updateError));
  },

  async resumeMembership(gymId: string, membershipId: string): Promise<void> {
    const supabase = requireClient();
    const { error } = await supabase
      .from('memberships')
      .update({ status: 'active' })
      .eq('gym_id', gymId)
      .eq('id', membershipId);

    if (error) throw new Error(sanitizeErrorMessage(error));
  },
};

// ============================================================================
// PAYMENTS (Financial Integrity)
// ============================================================================
export const paymentService = {
  async collectPayment(
    gymId: string,
    payload: {
      member_id: string;
      membership_id: string;
      amount: number;
      payment_method: 'cash' | 'UPI' | 'card' | 'bank_transfer' | 'other';
      payment_date: string;
      transaction_reference?: string;
      notes?: string;
    }
  ): Promise<Payment> {
    const supabase = requireClient();

    if (!payload.amount || payload.amount <= 0) {
      throw new Error('Payment amount must be greater than ₹0.');
    }

    const normMethod = normalizePaymentMethod(payload.payment_method);
    const payDate = payload.payment_date || getTodayDateString();

    // 1. Try atomic PostgreSQL RPC execution first (atomic database transaction)
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('record_payment_atomic', {
        p_gym_id: gymId,
        p_member_id: payload.member_id,
        p_membership_id: payload.membership_id,
        p_amount: payload.amount,
        p_payment_method: normMethod,
        p_payment_date: payDate,
        p_transaction_reference: payload.transaction_reference?.trim() || null,
        p_notes: payload.notes?.trim() || null,
      });

      if (!rpcError && rpcResult) {
        return {
          id: rpcResult.payment_id,
          gym_id: gymId,
          member_id: payload.member_id,
          membership_id: payload.membership_id,
          amount: payload.amount,
          payment_method: normMethod,
          payment_date: payDate,
          transaction_reference: payload.transaction_reference?.trim() || null,
          notes: payload.notes?.trim() || null,
          created_at: new Date().toISOString(),
        } as Payment;
      }

      // If error is not a "function not found" error, raise it (e.g. overpayment, validation)
      if (rpcError && !rpcError.message?.includes('Could not find the function')) {
        throw new Error(sanitizeErrorMessage(rpcError));
      }
    } catch (err: any) {
      if (!err?.message?.includes('Could not find the function')) {
        throw err;
      }
    }

    // 2. Client-side fallback if RPC is not installed in database yet
    // Fetch current membership balance (scoped to gym_id and member_id!)
    const { data: membership, error: mError } = await supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', payload.membership_id)
      .eq('member_id', payload.member_id)
      .single();

    if (mError || !membership) throw new Error('Membership was not found or does not belong to this member.');

    const currentRemaining = Number(membership.remaining_amount ?? (Number(membership.total_amount || 0) - Number(membership.paid_amount || 0)));
    if (payload.amount > currentRemaining) {
      throw new Error(`Payment amount (₹${payload.amount}) cannot exceed remaining balance (₹${currentRemaining}).`);
    }

    // Insert payment record
    const { data: payment, error: pError } = await supabase
      .from('payments')
      .insert({
        gym_id: gymId,
        member_id: payload.member_id,
        membership_id: payload.membership_id,
        amount: payload.amount,
        payment_method: normMethod,
        payment_date: payDate,
        transaction_reference: payload.transaction_reference?.trim() || null,
        notes: payload.notes?.trim() || null,
      })
      .select()
      .single();

    if (pError) throw new Error(sanitizeErrorMessage(pError));

    // Update membership financial totals (scoped to gym_id and membership_id!)
    const newPaid = Number(membership.paid_amount || 0) + payload.amount;
    const newRemaining = Math.max(0, currentRemaining - payload.amount);

    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
      })
      .eq('gym_id', gymId)
      .eq('id', payload.membership_id);

    if (updateError) {
      // Rollback payment insertion if update fails to preserve financial integrity
      await supabase.from('payments').delete().eq('id', payment.id).eq('gym_id', gymId);
      throw new Error(sanitizeErrorMessage(updateError));
    }

    return payment as Payment;
  },

  async getPayments(gymId: string, options?: { limit?: number; date?: string }): Promise<Payment[]> {
    const supabase = requireClient();
    let query = supabase
      .from('payments')
      .select('*')
      .eq('gym_id', gymId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (options?.date) {
      query = query.eq('payment_date', options.date);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: paymentsRaw, error } = await query;
    if (error) throw new Error(sanitizeErrorMessage(error));
    if (!paymentsRaw || paymentsRaw.length === 0) return [];

    // Fetch members for these payments (scoped to gym_id!)
    const memberIds = Array.from(new Set(paymentsRaw.map((p: any) => p.member_id).filter(Boolean)));
    const memberMap = new Map<string, any>();
    if (memberIds.length > 0) {
      const { data: members } = await supabase
        .from('members')
        .select('id, full_name, phone')
        .eq('gym_id', gymId)
        .in('id', memberIds);

      (members || []).forEach((m: any) => {
        memberMap.set(m.id, { name: m.full_name || 'Member', phone: m.phone });
      });
    }

    return paymentsRaw.map((p: any) => ({
      ...p,
      member: memberMap.get(p.member_id) || null,
    })) as Payment[];
  },
};

// ============================================================================
// ATTENDANCE (OPTIONAL MODULE)
// ============================================================================
export const attendanceService = {
  async getTodayAttendance(gymId: string): Promise<AttendanceRecord[]> {
    const supabase = requireClient();
    const today = getTodayDateString();

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        member:members (full_name, phone)
      `)
      .eq('gym_id', gymId)
      .gte('check_in', `${today}T00:00:00`)
      .lte('check_in', `${today}T23:59:59`)
      .order('check_in', { ascending: false });

    if (error) {
      if (error.code === '42P01') return [];
      throw new Error(sanitizeErrorMessage(error));
    }

    return (data || []).map((a: any) => ({
      ...a,
      member: a.member ? { ...a.member, name: a.member.full_name } : undefined,
    })) as AttendanceRecord[];
  },

  async checkIn(gymId: string, memberId: string): Promise<AttendanceRecord> {
    const supabase = requireClient();
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        check_in: new Date().toISOString(),
        marked_by: userData?.user?.id || null,
      })
      .select(`
        *,
        member:members (full_name, phone)
      `)
      .single();

    if (error) throw new Error(sanitizeErrorMessage(error));
    return {
      ...data,
      member: data.member ? { ...data.member, name: data.member.full_name } : undefined,
    } as AttendanceRecord;
  },

  async checkOut(attendanceIdOrGymId: string, maybeAttendanceId?: string): Promise<void> {
    const supabase = requireClient();
    const attendanceId = maybeAttendanceId || attendanceIdOrGymId;
    const gymId = maybeAttendanceId ? attendanceIdOrGymId : null;

    let query = supabase
      .from('attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', attendanceId);

    if (gymId) {
      query = query.eq('gym_id', gymId);
    }

    const { error } = await query;
    if (error) throw new Error(sanitizeErrorMessage(error));
  },
};

// ============================================================================
// DASHBOARD STATS & REAL ANALYTICS
// ============================================================================
export const dashboardService = {
  async getDashboardData(gymId: string, attendanceEnabled: boolean): Promise<DashboardStats> {
    const supabase = requireClient();
    const todayStr = getTodayDateString();
    const next7DaysStr = addDaysToDate(todayStr, 7);

    // 1. Active members count
    const { count: activeCount } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .gte('end_date', todayStr);

    // 2. Today's collection
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .eq('payment_date', todayStr);

    const todayCollection = (todayPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 3. Pending fees
    const { data: pendingMemberships } = await supabase
      .from('memberships')
      .select('remaining_amount')
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .gt('remaining_amount', 0);

    const pendingFees = (pendingMemberships || []).reduce((sum, m) => sum + Number(m.remaining_amount || 0), 0);
    const pendingFeesCount = (pendingMemberships || []).length;

    // 4. Expiring soon (within 7 days)
    const { count: expiringSoonCount } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .gte('end_date', todayStr)
      .lte('end_date', next7DaysStr);

    // 5. Expired count
    const { count: expiredCount } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .or(`status.eq.expired,end_date.lt.${todayStr}`);

    // 6. On hold count
    const { count: onHoldCount } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .in('status', ['on_hold', 'inactive']);

    // 7. Today's attendance (only if enabled)
    let todayAttendance = 0;
    if (attendanceEnabled) {
      try {
        const { count: attCount } = await supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .gte('check_in', `${todayStr}T00:00:00`)
          .lte('check_in', `${todayStr}T23:59:59`);

        todayAttendance = attCount || 0;
      } catch {
        todayAttendance = 0;
      }
    }

    return {
      activeMembers: activeCount || 0,
      todayCollection,
      pendingFees,
      expiringSoon: expiringSoonCount || 0,
      todayAttendance: attendanceEnabled ? todayAttendance : undefined,
      attentionItems: {
        pendingFeesCount,
        expiringWithin7DaysCount: expiringSoonCount || 0,
        expiredCount: expiredCount || 0,
        onHoldCount: onHoldCount || 0,
      },
    };
  },

  async getStats(gymId: string, attendanceEnabled: boolean = true): Promise<DashboardStats> {
    return this.getDashboardData(gymId, attendanceEnabled);
  },
};

// ============================================================================
// STAFF MANAGEMENT
// ============================================================================
export const staffService = {
  async getStaff(gymId: string): Promise<GymUser[]> {
    const supabase = requireClient();

    const { data: gymUsers, error } = await supabase
      .from('gym_users')
      .select('id, gym_id, user_id, role, created_at')
      .eq('gym_id', gymId);

    if (error || !gymUsers || gymUsers.length === 0) {
      return [];
    }

    try {
      const userIds = gymUsers.map((u: any) => u.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        return gymUsers.map((u: any) => ({
          ...u,
          profiles: profileMap.get(u.user_id) || null,
        })) as GymUser[];
      }
    } catch {
      // profiles optional
    }

    return gymUsers as GymUser[];
  },
};
