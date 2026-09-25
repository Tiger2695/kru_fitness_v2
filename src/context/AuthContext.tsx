import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, checkDatabaseConnection, ConnectionCheckResult } from '../lib/supabase';
import { Gym, GymRole } from '../types';
import { gymService } from '../services/api';

export const SUPER_ADMIN_EMAILS = [
  'tigerchitransh@gmail.com',
  'chitranshm13@gmail.com',
  'sonurambo78@gmail.com',
];

export function checkIsSuperAdmin(user?: User | null): boolean {
  if (!user) return false;
  const email = user.email?.toLowerCase().trim();
  if (email && SUPER_ADMIN_EMAILS.includes(email)) return true;
  if (user.user_metadata?.is_super_admin === true || user.user_metadata?.role === 'superadmin') return true;
  return false;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeGym: Gym | null;
  activeRole: GymRole | null;
  gyms: { gym: Gym; role: string }[];
  isSuperAdmin: boolean;
  connectionStatus: ConnectionCheckResult | null;
  checkingConnection: boolean;
  refreshGyms: () => Promise<void>;
  setActiveGym: (gym: Gym, role: GymRole) => void;
  recheckConnection: () => Promise<ConnectionCheckResult>;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ session: any; user: any }>;
  signInWithOtp: (email: string, fullName?: string) => Promise<any>;
  verifyOtp: (email: string, token: string, fullName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [gyms, setGyms] = useState<{ gym: Gym; role: string }[]>([]);
  const [activeGym, setActiveGymState] = useState<Gym | null>(null);
  const [activeRole, setActiveRole] = useState<GymRole | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionCheckResult | null>(null);
  const [checkingConnection, setCheckingConnection] = useState<boolean>(true);

  const recheckConnection = async (): Promise<ConnectionCheckResult> => {
    setCheckingConnection(true);
    try {
      const res = await checkDatabaseConnection();
      setConnectionStatus(res);
      return res;
    } finally {
      setCheckingConnection(false);
    }
  };

  const loadGymsForUser = async () => {
    try {
      const myGyms = await gymService.getMyGyms();
      setGyms(myGyms);

      if (myGyms.length > 0) {
        // Restore last selected gym or pick first
        const savedGymId = localStorage.getItem('krufitness_active_gym_id');
        const found = myGyms.find(g => g.gym.id === savedGymId);
        if (found) {
          setActiveGymState(found.gym);
          setActiveRole(found.role as GymRole);
        } else {
          setActiveGymState(myGyms[0].gym);
          setActiveRole(myGyms[0].role as GymRole);
          localStorage.setItem('krufitness_active_gym_id', myGyms[0].gym.id);
        }
      } else {
        setActiveGymState(null);
        setActiveRole(null);
      }
    } catch (err) {
      console.error('Failed to load user gyms:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const conn = await recheckConnection();
      if (!conn.connected) {
        if (mounted) setLoading(false);
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        if (mounted) setLoading(false);
        return;
      }

      // 1. Check for URL Hash errors or parameters (Implicit flow or error redirect)
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
          const errorDesc = hashParams.get('error_description') || hashParams.get('error');
          if (errorDesc) {
            console.error('Supabase Auth Redirect Error:', errorDesc);
          }

          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            try {
              const { data: setSessionData, error: setSessionErr } = await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!setSessionErr && setSessionData?.session) {
                if (mounted) setUser(setSessionData.session.user);
                await loadGymsForUser();
                // Clean hash from browser address bar
                window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                if (mounted) setLoading(false);
                return;
              }
            } catch (err) {
              console.error('Failed to set session from URL hash:', err);
            }
          }
        }

        // 2. Check for PKCE Authorization Code in query string (?code=...)
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          try {
            const { data: exchangeData, error: exchangeErr } = await client.auth.exchangeCodeForSession(code);
            if (!exchangeErr && exchangeData?.session) {
              if (mounted) setUser(exchangeData.session.user);
              await loadGymsForUser();
              // Clean query parameters from address bar
              window.history.replaceState({}, document.title, window.location.pathname);
              if (mounted) setLoading(false);
              return;
            } else if (exchangeErr) {
              console.error('Failed to exchange code for session:', exchangeErr.message);
            }
          } catch (err) {
            console.error('Exception during exchangeCodeForSession:', err);
          }
        }
      }

      // 3. Fallback: check current session in storage
      const { data } = await client.auth.getSession();
      if (mounted) {
        setUser(data.session?.user ?? null);
      }

      if (data.session?.user) {
        await loadGymsForUser();
      }

      if (mounted) setLoading(false);

      // Listen for auth state changes
      const { data: authListener } = client.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await loadGymsForUser();
        } else {
          setGyms([]);
          setActiveGymState(null);
          setActiveRole(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const setActiveGym = (gym: Gym, role: GymRole) => {
    setActiveGymState(gym);
    setActiveRole(role);
    localStorage.setItem('krufitness_active_gym_id', gym.id);
  };

  const refreshGyms = async () => {
    await loadGymsForUser();
  };

  const signInWithEmail = async (email: string, password: string) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not connected.');

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    setUser(data.user);
    await loadGymsForUser();
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not connected.');

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: fullName.trim(),
          full_name: fullName.trim(),
          display_name: fullName.trim(),
        },
      },
    });

    if (error) throw error;
    if (data.session) {
      setUser(data.user);
      await loadGymsForUser();
      return { session: data.session, user: data.user };
    }

    // Attempt direct sign in right away
    try {
      const loginRes = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginRes.data?.session) {
        setUser(loginRes.data.user);
        await loadGymsForUser();
        return { session: loginRes.data.session, user: loginRes.data.user };
      }
    } catch {}

    return { session: data.session, user: data.user };
  };

  const signInWithOtp = async (email: string, fullName?: string) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not connected.');

    const { data, error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
        data: fullName?.trim() ? { full_name: fullName.trim() } : undefined,
      },
    });

    if (error) throw error;
    return data;
  };

  const verifyOtp = async (email: string, token: string, fullName?: string) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not connected.');

    const cleanToken = token.trim().replace(/\D/g, '');
    if (cleanToken.length !== 6) {
      throw new Error('Please enter all 6 digits of the OTP code sent to your email.');
    }

    let authedUser: User | null = null;

    // 1. Try with type: 'email' (Standard Supabase numeric email OTP)
    const { data, error } = await client.auth.verifyOtp({
      email: email.trim(),
      token: cleanToken,
      type: 'email',
    });

    if (error) {
      // 2. Try with type: 'signup' (if user is registering for the first time)
      const retryResult = await client.auth.verifyOtp({
        email: email.trim(),
        token: cleanToken,
        type: 'signup' as any,
      });

      if (retryResult.error) {
        // 3. Try with type: 'magiclink'
        const retryMagic = await client.auth.verifyOtp({
          email: email.trim(),
          token: cleanToken,
          type: 'magiclink' as any,
        });

        if (retryMagic.error) {
          throw new Error('Invalid or expired 6-digit OTP code. Please check your email or click resend.');
        }
        authedUser = retryMagic.data.user;
      } else {
        authedUser = retryResult.data.user;
      }
    } else {
      authedUser = data.user;
    }

    if (authedUser && fullName?.trim()) {
      try {
        const { data: updated } = await client.auth.updateUser({
          data: { full_name: fullName.trim() },
        });
        if (updated?.user) {
          authedUser = updated.user;
        }
      } catch {}
    }

    setUser(authedUser);
    await loadGymsForUser();
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch {}
    }
    setUser(null);
    setGyms([]);
    setActiveGymState(null);
    setActiveRole(null);
    localStorage.removeItem('krufitness_active_gym_id');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeGym,
        activeRole,
        gyms,
        isSuperAdmin: checkIsSuperAdmin(user),
        connectionStatus,
        checkingConnection,
        refreshGyms,
        setActiveGym,
        recheckConnection,
        signOut,
        signInWithEmail,
        signUpWithEmail,
        signInWithOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

