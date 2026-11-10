# EduTrack – Student, Tuition and Monthly Fee Management System

EduTrack is a modern, responsive, private administration system built to replace manual Excel workflows (`I2B.xlsx`) for managing tuition centre students, multiple concurrent programme enrolments, monthly billing, fee collections, payment receipts, manual student promotions, and WhatsApp parent communications.

## 🌟 Key Architectural Principles

1. **Simplicity & Zero Build Process**:
   - Pure HTML5, CSS3, and Vanilla JavaScript (ES6+).
   - Runs directly in any modern browser without npm build, bundlers, or frameworks.
   - Deployed directly via **GitHub Pages**.

2. **Core Business Rule: Registration ≠ Payment**:
   - Adding a student registers them with an initial payment status of **UNPAID**.
   - No payment is collected and no receipt is issued during registration.
   - Payments are recorded separately via **Fee Collection** when the parent pays (Full, Partial, or Multi-Month).
   - Official computer-generated receipts are issued **only** for confirmed payments.

3. **Multi-Programme Support per Student**:
   - A student can attend multiple programmes simultaneously (e.g., Subject Tuition + Hindi + Weekend Hindi).
   - One student profile holds multiple active enrolments.
   - Combined monthly fee is automatically calculated.

4. **100% Dynamic & Editable Data**:
   - No hardcoded programmes, fee rates, organisation names, or academic years.
   - Managed directly from the dashboard and persisted in **Supabase PostgreSQL**.

5. **Mobile-First Experience**:
   - Full desktop dashboard collapses cleanly into an adaptive mobile drawer on phones and tablets.
   - Touch targets (≥44px), scrollable responsive tables, and full-screen mobile dialogs.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Custom Properties & Flex/Grid)
- **Database & Backend**: Supabase PostgreSQL & Supabase REST API
- **Icons**: Lucide Icons
- **Charts**: Chart.js
- **Excel Export & Import**: SheetJS (xlsx)
- **PDF Receipts**: jsPDF
- **Hosting**: GitHub Pages

---

## 🚀 Navigation & Functional Modules

1. **Dashboard**: 8 real-time metric cards, analytical charts (collection trends, programme distribution, paid vs pending, revenue breakdown), and recent activity feeds.
2. **Students**: Single-page dynamic registration form with multi-programme rows, auto-fetched fees from database, search, filtering, and comprehensive financial student profiles.
3. **Fee Collection**: Record payments, allocate money across outstanding invoices, partial payments, and instant receipt generation.
4. **Monthly Fees**: View monthly billing ledgers, status tracking (`unpaid`, `partially_paid`, `paid`), and batch monthly invoice generator with duplicate prevention.
5. **Fee Structure**: Single source of truth for tuition fees per programme, class/grade, and board.
6. **Promotions**: Strictly manual academic promotions with automatic fee recalculation for future billing cycles while preserving past ledger history.
7. **Receipts**: Official receipts directory with instant PDF download, browser print, and parent WhatsApp click-to-chat.
8. **Reports**: Tuition collection and pending fee reports with Excel (`.xlsx`) and CSV export.
9. **Excel Import**: Built-in parser for `I2B.xlsx` to preview and import students and programmes.
10. **Settings**: Organisation branding, currency symbol (`₹`), receipt/invoice prefixes, default due day, and programme management.

---

## 📲 WhatsApp Receipt Sharing Workflow

When clicking **Send via WhatsApp**:
1. The system prompts to download the official PDF receipt.
2. WhatsApp opens via Click-to-Chat addressed to the parent's registered WhatsApp number.
3. Pre-populates a polite payment confirmation with student name, receipt number, amount received, and remaining balance.
4. Administrator attaches the downloaded PDF and presses send.

---

## 🌐 GitHub Pages Deployment Instructions

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Complete EduTrack Tuition & Fee Management System"
   git push origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions** (or select **Deploy from a branch** > branch: `main` / folder: `/ (root)`).
3. The included `.github/workflows/deploy.yml` workflow will automatically deploy the site.
4. Access your live dashboard at `https://<your-username>.github.io/<repo-name>/`.
