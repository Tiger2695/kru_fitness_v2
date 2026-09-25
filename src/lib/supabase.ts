import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'gymos_supabase_url';
const STORAGE_KEY_ANON = 'gymos_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const defaultUrl = 'https://gbxdkbdiarcvoxkqxyep.supabase.co';
  const defaultKey = 'sb_publishable_B2czy_9iZgcRJ9sFsE36ug_Zjn6_G0E';

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) || '' : '';

  return {
    url: envUrl || storedUrl || defaultUrl,
    anonKey: envKey || storedKey || defaultKey,
  };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  }
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

let supabaseInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  if (!supabaseInstance || currentClientUrl !== url || currentClientKey !== anonKey) {
    currentClientUrl = url;
    currentClientKey = anonKey;
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    });
  }

  return supabaseInstance;
}

export interface ConnectionCheckResult {
  connected: boolean;
  message: string;
  hasSchema?: boolean;
}

export async function checkDatabaseConnection(): Promise<ConnectionCheckResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      message: 'Cloud Storage credentials are not configured. Please provide Cloud Endpoint URL and Client Key.',
    };
  }

  try {
    // Attempt a light query on the gyms table
    const { error } = await client.from('gyms').select('id').limit(1);

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('schema cache')
      ) {
        return {
          connected: true,
          hasSchema: false,
          message: 'Connected to Cloud Storage, but the database schema has not been initialized yet. Please initialize the SQL schema.',
        };
      }
      return {
        connected: false,
        message: `Database connection error: ${error.message} (${error.code || 'unknown'})`,
      };
    }

    return {
      connected: true,
      hasSchema: true,
      message: 'Successfully connected to Cloud Storage with valid schema.',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Failed to ping Cloud Storage.',
    };
  }
}
