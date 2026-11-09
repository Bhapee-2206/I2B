// ==============================================================================
// I2B - Supabase Client Configuration
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bpowmzajdyvddnwrqupq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tOJHMzK7gIQWRpulr2lnpw_6relRYHP';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface ConnectionStatus {
  isConnected: boolean;
  hasSchema: boolean;
  error?: string | null;
  tableCounts?: {
    programmes?: number;
    students?: number;
    enrollments?: number;
    invoices?: number;
    payments?: number;
    migrationRecords?: number;
  };
}

/**
 * Checks if Supabase is reachable and if tables have been migrated.
 */
export async function checkSupabaseConnection(): Promise<ConnectionStatus> {
  try {
    // 1. Try querying programmes table
    const { data: programmes, error: progError } = await supabase
      .from('programmes')
      .select('id', { count: 'exact' });

    if (progError) {
      // Table doesn't exist yet in PostgreSQL schema cache (PGRST205)
      return {
        isConnected: true,
        hasSchema: false,
        error: progError.message,
      };
    }

    // 2. Fetch counts for verification
    const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const { count: enrCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true });
    const { count: invCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    const { count: payCount } = await supabase.from('payments').select('*', { count: 'exact', head: true });
    const { count: migCount } = await supabase.from('migration_records').select('*', { count: 'exact', head: true });

    return {
      isConnected: true,
      hasSchema: true,
      error: null,
      tableCounts: {
        programmes: programmes?.length || 0,
        students: studentCount || 0,
        enrollments: enrCount || 0,
        invoices: invCount || 0,
        payments: payCount || 0,
        migrationRecords: migCount || 0,
      },
    };
  } catch (err: any) {
    return {
      isConnected: false,
      hasSchema: false,
      error: err?.message || 'Failed to connect to Supabase',
    };
  }
}
