/**
 * EDUTRACK CONFIGURATION & APPLICATION STORE
 */

const EDUTRACK_CONFIG = {
  SUPABASE_URL: "https://bpowmzajdyvddnwrqupq.supabase.co",
  SUPABASE_KEY: "sb_publishable_tOJHMzK7gIQWRpulr2lnpw_6relRYHP",
  DEFAULT_CURRENCY: "₹",
  APP_NAME: "EduTrack",
  DEFAULT_DUE_DAY: 10,
  VERSION: "2.0.0"
};

// Global Application State Store
const AppState = {
  user: null,
  institution: null,
  programmes: [],
  feeStructures: [],
  academicYears: [
    { id: 'ay-1', year_name: '2025-2026', start_date: '2025-06-01', end_date: '2026-05-31', is_active: false },
    { id: 'ay-2', year_name: '2026-2027', start_date: '2026-06-01', end_date: '2027-05-31', is_active: true },
    { id: 'ay-3', year_name: '2027-2028', start_date: '2027-06-01', end_date: '2028-05-31', is_active: false }
  ],
  activeAcademicYear: "2026-2027",
  subjectClasses: [
    "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", 
    "6th", "7th", "8th", "9th", "10th", "11th", "12th"
  ],
  subjectBoards: ["Matric", "CBSE"],
  hindiDeliveryTypes: ["Virtual", "Online"],
  hindiLevels: [
    { code: "BASIC", name: "Basic", label: "Basic" },
    { code: "PARICHAYA", name: "Parichaya", label: "Parichaya (परिचय)" },
    { code: "PRATHAMIC", name: "Prathamic", label: "Prathamic (प्राथमिक)" },
    { code: "MADHYAMA", name: "Madhyama", label: "Madhyama (मध्यमा)" },
    { code: "RASHTRABHASHA", name: "Rashtrabhasha", label: "Rashtrabhasha (राष्ट्रभाषा)" },
    { code: "PRAVESHIKA", name: "Praveshika", label: "Praveshika (प्रवेशिका)" },
    { code: "VISHARAD_POORVARDH", name: "Visharad Poorvardh", label: "Visharad Poorvardh (विशारद पूर्वार्ध)" },
    { code: "VISHARAD_UTTARARDH", name: "Visharad Uttarardh", label: "Visharad Uttarardh (विशारद उत्तरार्ध)" },
    { code: "PRAVEEN_POORVARDH", name: "Praveen Poorvardh", label: "Praveen Poorvardh (प्रवीण पूर्वार्ध)" },
    { code: "PRAVEEN_UTTARARDH", name: "Praveen Uttarardh", label: "Praveen Uttarardh (प्रवीण उत्तरार्ध)" }
  ],
  masterClasses: [
    "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", 
    "6th", "7th", "8th", "9th", "10th", "11th", "12th"
  ],
  masterBoards: ["Matric", "CBSE"],
  students: [],
  invoices: [],
  payments: [],
  receipts: [],
  classHistory: []
};

// Initialize Supabase Client
let supabaseClient = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
  supabaseClient = supabase.createClient(EDUTRACK_CONFIG.SUPABASE_URL, EDUTRACK_CONFIG.SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.error("Supabase SDK not loaded!");
}
