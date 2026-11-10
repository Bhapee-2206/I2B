/**
 * EDUTRACK CONFIGURATION & CLIENT INITIALIZER
 */

const EDUTRACK_CONFIG = {
  SUPABASE_URL: "https://bpowmzajdyvddnwrqupq.supabase.co",
  SUPABASE_KEY: "sb_publishable_tOJHMzK7gIQWRpulr2lnpw_6relRYHP",
  DEFAULT_CURRENCY: "₹",
  APP_NAME: "EduTrack",
  DEFAULT_DUE_DAY: 10,
  VERSION: "1.0.0"
};

// Global Application State Store
const AppState = {
  user: null,
  institution: null,
  programmes: [],
  feeStructures: [],
  academicYears: [],
  activeAcademicYear: "2026-2027",
  students: [],
  invoices: [],
  payments: [],
  receipts: []
};

// Initialize Supabase Client
let supabaseClient = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
  supabaseClient = supabase.createClient(EDUTRACK_CONFIG.SUPABASE_URL, EDUTRACK_CONFIG.SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
} else {
  console.error("Supabase SDK not loaded!");
}
