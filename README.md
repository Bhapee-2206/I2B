# I2B – Student & Monthly Fee Management System

A production-ready, mobile-first institutional web application designed for managing student records, multi-programme enrolments, standard and custom fee structures, consolidated monthly invoices, payments, PDF receipts, WhatsApp sharing, overdue tracking, and financial analytics.

Built for **I2B Educational Institution** to replace legacy Excel-based workflows with a secure, responsive, modern SaaS platform.

---

## Key Features & Highlights

### 1. Mobile-First Responsive Design (Zero Horizontal Scroll)
- Built from the ground up for smartphones, tablets, laptops, and desktops.
- Strict viewport compliance across all screen widths: **320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1366px, 1920px**.
- **Touch-First UI**: All primary buttons and action controls feature comfortable 44×44px touch targets.
- **Responsive Tables to Cards**: Desktop multi-column data tables gracefully convert into high-density, readable student/payment cards on mobile viewports.
- **Bottom Navigation Bar**: Smooth 1-thumb bottom navigation on smartphones and a sleek navy SaaS sidebar on desktop.
- **Bottom Sheets**: Modal dialogs transform into bottom sheets on mobile devices.

### 2. Complete Excel Migration (All 75 Records from `I2B.xlsx` Sheet1)
- **100% faithful data migration**:
  - **Subject**: 27 enrolment records (Listed monthly fee: ₹21,400)
  - **Regular Hindi**: 24 enrolment records (Listed monthly fee: ₹14,300)
  - **Weekend Hindi**: 20 enrolment records (Listed monthly fee: ₹12,000)
  - **Online Hindi**: 4 enrolment records (Listed monthly fee: ₹3,150)
  - **Total**: **75 enrolment records**, total listed fee: **₹50,850**.
- **Financial Integrity**: In accordance with institutional policy, the ₹50,850 is preserved as agreed/proposed monthly enrolment fees. No phantom historical payments or receipts are generated.
- **Duplicate & Spelling Review Workspace**: Built-in review dashboard flags duplicate names and spelling variations (e.g. *Monish* [appears 4 times], *Maha sri / Maha sree*, *Bhairavi / Bairavi*, *Nikitha*, *Nishitha*, *Harishankar*) allowing administrator verification.

### 3. Student & Multi-Programme Management
- Central student record supporting multiple concurrent programme enrolments.
- Auto-generated student codes (e.g., `I2B-STU-001`).
- Parent/guardian contact details, primary WhatsApp phone, admission date, and account status.
- Individual student profile containing active courses, billing history, payment ledger, and real-time outstanding balance.

### 4. Standard Fee Structures (Matric, CBSE, Virtual & Online)
- **Regular Tuition Matrix**: LKG through 12th standard with Matric and CBSE pricing.
- **Hindi Matrix**: Basic through 9th standard with Virtual and Online pricing.
- **Preservation Policy**: Updating standard fee structures never alters existing students' agreed fees.

### 5. Consolidated Monthly Invoice Generator
- **Manual Administrator Generation**: Invoices are generated under administrative preview, avoiding accidental automated charges.
- **Consolidated Billing**: Combines multiple course fees for the same student into a single monthly invoice with itemized programme charges.
- **Duplicate Prevention**: Database constraints and application logic strictly prevent duplicate invoicing for the same student and billing period.

### 6. Payments & Financial Transactions
- Supports Cash, UPI (GPay/PhonePe/Paytm), Bank Transfer (NEFT/IMPS), and Cheque.
- **Multi-Invoice Allocation**: Split single payments across multiple outstanding invoices.
- **Audit Reversals**: Full transaction audit trail with reversible payments that adjust balances without data deletion.

### 7. Vector PDF Receipt Generator (jsPDF)
- Generates official institutional receipts with:
  - Official I2B logo and branding
  - Sequential unique receipt number (`REC-YYYYMM-001`)
  - Student and parent details
  - Enrolment programme and billing period
  - Amount in figures and **Indian Rupee words** (e.g. *Rupees Six Hundred Fifty Only*)
  - Remaining outstanding balance
  - Authorized signatory seal
- 1-click Download, Print, and WhatsApp sharing.

### 8. WhatsApp Sharing (Modes A & B)
- **Mode A (Active Release)**: Instant manual WhatsApp delivery via `wa.me` links prefilled with parent phone, payment acknowledgment, and remaining balance. Tracks delivery status (*Not Shared*, *Initiated*, *Confirmed Sent*).
- **Mode B (Prepared Architecture)**: Meta WhatsApp Cloud API configuration interface and Supabase Edge Function skeleton.
- **Overdue Reminders**: 1-click polite reminder dispatching for overdue fees.

### 9. Operational & Financial Reports
- Monthly collection statements, outstanding balances report, enrolment roster, and payment method breakdowns.
- **Export**: 1-click export to Excel (`.xlsx`) and `.csv`.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Lucide Icons, Recharts, Sonner.
- **PDF & Export**: jsPDF, SheetJS (xlsx).
- **Backend & Database**: Supabase PostgreSQL, Supabase Authentication, Row Level Security (RLS).
- **Hosting & Deployment**: Cloudflare Pages connected to GitHub.

---

## Getting Started

### Prerequisites
- Node.js (v18+ or v22+)
- npm

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd I2B
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
VITE_SUPABASE_URL=https://bpowmzajdyvddnwrqupq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_tOJHMzK7gIQWRpulr2lnpw_6relRYHP
VITE_APP_NAME="I2B"
VITE_APP_SUBTITLE="Student & Fee Management"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser or smartphone.

### 4. Administrator Credentials
- **Email**: `admin@i2b-edu.com`
- **Password**: `Admin@123`

---

## Database Migration Setup (Supabase PostgreSQL)

All SQL schemas, tables, indexes, RLS policies, standard fee matrices, and the 75 Excel migration records are consolidated into a single SQL script:

**File**: `supabase/schema_and_seed_all_in_one.sql`

### How to apply to your Supabase project:
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/bpowmzajdyvddnwrqupq/sql/new).
2. Copy the entire contents of `supabase/schema_and_seed_all_in_one.sql` (or click **"Copy SQL Migration Script"** inside the I2B app header/settings).
3. Paste into the SQL Editor and click **Run**.
4. The tables will immediately sync with the live application!

*(Note: If tables are not yet migrated, the application operates seamlessly in local persistence mode without crashing, and switches to live PostgreSQL once the schema is applied.)*

---

## Production Build & Cloudflare Pages Deployment

### Build for Production
```bash
npm run build
```
Build outputs are placed in the `dist/` directory with `_redirects` for client-side routing.

### Cloudflare Pages Deployment Steps:
1. Push repository to GitHub.
2. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. Set build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     - `VITE_SUPABASE_URL`: `https://bpowmzajdyvddnwrqupq.supabase.co`
     - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_tOJHMzK7gIQWRpulr2lnpw_6relRYHP`
5. Click **Save and Deploy**. Cloudflare Pages will provide a free platform URL (e.g., `https://i2b-fee-management.pages.dev`).

---

## License & Confidentiality
Private administrative software built exclusively for I2B Educational Institution.

