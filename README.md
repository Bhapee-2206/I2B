# EduTrack — Student, Tuition & Fee Management System

A production-ready, fast, secure, and mobile-first administrative web application designed to replace spreadsheet-based student and tuition management workflows.

Built with **React, Vite, TypeScript, Tailwind CSS, and Supabase PostgreSQL**, EduTrack provides single-screen student registration across multiple programmes, automatic fee calculation, monthly billing, payment collection, vector PDF receipt generation, WhatsApp click-to-chat sharing, manual student class promotions, and comprehensive financial reports.

---

## 1. Key Capabilities

### Single-Screen Multi-Programme Registration
- Register a student and enroll them in one or multiple programmes (Subject, Hindi, Weekend Hindi, Online Hindi) on a single screen.
- Auto-fetches the monthly fee from the active fee structure based on programme, class/grade, and board.
- Instant combined monthly fee calculation across all programmes.
- Optional fee override with mandatory audit reason.
- Auto-generates sequential student codes (e.g., `STU-0001`, `STU-0002`).

### Manual Student Class Promotions
- **Strictly manual workflow**: EduTrack never automatically increments student classes on calendar dates.
- Advance students to their next school grade individually or in batch.
- Auto-fetches new applicable fees for the next grade while preserving all historical invoices and payments.
- Records old and new class, old and new fee, board, academic year, and effective date with complete audit tracking.

### Monthly Billing & Invoices
- Generate consolidated monthly invoices for active enrolments.
- Idempotent generation prevents duplicate invoices for the same student and billing period.
- Supports unpaid, partially paid, paid, overdue, and void statuses.

### Payment Collection & Allocations
- Collect payments via Cash, UPI (GPay/PhonePe/Paytm), Bank Transfer (NEFT/IMPS), or Cheque.
- Split payments across multiple invoices with strict balance validation preventing over-allocation.
- Reversal and correction workflow with audit logging.

### Professional Vector PDF Receipts & WhatsApp Sharing
- Instant vector PDF receipts generated via `jsPDF` with organization branding, sequential receipt numbers (`REC-YYYYMM-001`), and Indian Rupee amounts in words.
- WhatsApp click-to-chat sharing opens the parent's chat with a pre-filled acknowledgment message and directs the administrator to attach the downloaded PDF receipt.

### Excel Migration & Reports
- Pre-loaded and tested against `I2B.xlsx` (all 75 student enrolment records and ₹50,850 total monthly fee verified).
- Export reports to Excel (`.xlsx`), CSV, and printable format.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router v7 (HashRouter for zero-config GitHub Pages hosting), Lucide React, Recharts, Sonner toasts.
- **Backend & Database**: Supabase (PostgreSQL), Supabase Authentication, Row Level Security (RLS).
- **Document Generation**: jsPDF, SheetJS (`xlsx`).
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).

---

## 3. Quick Start & Setup

### Prerequisites
- Node.js (v18+ or v22+)
- npm

### 1. Clone & Install
```bash
git clone <repository-url>
cd I2B
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://bpowmzajdyvddnwrqupq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_tOJHMzK7gIQWRpulr2lnpw_6relRYHP
VITE_APP_NAME="EduTrack"
VITE_APP_SUBTITLE="Student & Fee Management"
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Admin Login
- **Email**: `admin@i2b-edu.com`
- **Password**: `Admin@123`

---

## 4. Database Setup & Supabase Migrations

The database tables, RLS policies, standard fee matrices, and initial migration records are available in:
- `supabase/migrations/20261109000000_init_i2b_schema.sql` (schema, tables, constraints, RLS)
- `supabase/migrations/20261109000001_seed_i2b_data.sql` (seed data, programmes, fee structures)
- `supabase/schema_and_seed_all_in_one.sql` (consolidated migration script)

### To apply to Supabase:
1. Open the Supabase Dashboard: [https://supabase.com/dashboard/project/bpowmzajdyvddnwrqupq/sql/new](https://supabase.com/dashboard/project/bpowmzajdyvddnwrqupq/sql/new)
2. Paste the contents of `supabase/schema_and_seed_all_in_one.sql`.
3. Click **Run**. All tables will sync immediately.

---

## 5. Automated Verification & Test Suite

Run the automated financial integrity test suite:
```bash
node tests/financial_calculations.test.mjs
```
**Test Results**:
- `TEST 1 PASSED`: 75 Migration Records and ₹50,850 Total Verified from `I2B.xlsx`
- `TEST 2 PASSED`: Currency Words Conversion Verified Across All Edge Cases
- `TEST 3 PASSED`: Multi-Invoice Payment Allocation and Balance Recalculation Verified
- `TEST 4 PASSED`: Duplicate Invoice Prevention Logic Verified
- `TEST 5 PASSED`: Days Overdue Calculations Verified

---

## 6. GitHub Pages Deployment

The repository includes an automated GitHub Actions deployment workflow at `.github/workflows/deploy.yml`.

### Deployment Steps:
1. Push the code to the `main` branch on GitHub:
   ```bash
   git add .
   git commit -m "Deploy EduTrack application"
   git push origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. The workflow will automatically trigger, build the application, and publish it to GitHub Pages.
4. With SPA 404 fallback and `HashRouter` enabled, refreshing any route works without 404 errors.

---

## 7. License & Usage
Private administrative software designed for institutional student, tuition, and fee management.
