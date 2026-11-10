/**
 * EDUTRACK MASTER APPLICATION CONTROLLER & ROUTER
 * Handles SPA Navigation, Drawer Toggles, Life Cycle & Route Dispatching
 */

const App = {
  currentRoute: 'dashboard',

  init: async () => {
    try {
      console.log("Initializing EduTrack Application...");

      // 1. Initialize Auth & Session
      await AuthModule.init();

      // 2. Load Core Application Settings from Database
      await SettingsModule.init();

      // 3. Load Programmes & Fee Structures
      await ProgrammesModule.init();
      await FeesModule.init();

      // 4. Load Students, Invoices, Payments & Receipts
      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();
      await PaymentsModule.loadPayments();
      await ReceiptsModule.loadReceipts();

      // 5. Setup Router & Mobile Drawer listeners
      App.setupEventListeners();

      // 6. Navigate to initial route
      const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
      App.navigateTo(initialRoute);

      // 7. Initial Lucide icons render
      Utils.renderIcons();

      console.log("EduTrack initialized successfully.");
    } catch (err) {
      console.error("Application initialization error:", err);
      Utils.showToast("System Notice", "Loaded in offline / cached configuration mode.", "info");
    }
  },

  // Setup DOM listeners
  setupEventListeners: () => {
    // Hash change routing
    window.addEventListener('hashchange', () => {
      const route = window.location.hash.replace('#', '') || 'dashboard';
      App.navigateTo(route);
    });

    // Mobile Hamburger button
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (mobileBtn && sidebar && backdrop) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('drawer-open');
        backdrop.classList.toggle('active');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('drawer-open');
        backdrop.classList.remove('active');
      });
    }

    // Close drawer when clicking a navigation link on mobile
    const navLinks = document.querySelectorAll('.sidebar-nav-item');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar?.classList.remove('drawer-open');
          backdrop?.classList.remove('active');
        }
      });
    });
  },

  // Route Dispatcher
  navigateTo: (route) => {
    // Extract route base (e.g. "student-profile?id=123" -> "student-profile")
    const routeBase = route.split('?')[0] || 'dashboard';
    App.currentRoute = routeBase;

    // Hide all views
    const views = document.querySelectorAll('.page-view');
    views.forEach(v => v.classList.remove('active'));

    // Highlight active nav item
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
      const itemRoute = item.getAttribute('data-route');
      if (itemRoute === routeBase) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Show target view
    const targetView = document.getElementById(`view-${routeBase}`);
    if (targetView) {
      targetView.classList.add('active');
    } else {
      // Fallback to dashboard
      document.getElementById('view-dashboard')?.classList.add('active');
      App.currentRoute = 'dashboard';
    }

    // Update Header Titles
    const routeTitles = {
      'dashboard': 'Dashboard Overview',
      'students': 'Student Directory',
      'student-profile': 'Student Financial Profile',
      'fee-collection': 'Fee Collection & Payments',
      'monthly-fees': 'Monthly Fees & Invoices',
      'fee-structure': 'Fee Structure Matrix',
      'promotions': 'Academic Student Promotions',
      'receipts': 'Payment Receipts',
      'reports': 'Reports & Analytics',
      'settings': 'System Settings',
      'excel-import': 'Excel Workbook Importer'
    };

    const titleEl = document.getElementById('header-page-title');
    if (titleEl) {
      titleEl.textContent = routeTitles[routeBase] || 'EduTrack';
    }

    // Route-specific render handlers
    switch (routeBase) {
      case 'dashboard':
        DashboardModule.init();
        break;
      case 'students':
        StudentsModule.renderStudentsTable();
        break;
      case 'fee-collection':
        PaymentsModule.renderPaymentsTable();
        break;
      case 'monthly-fees':
        MonthlyFeesModule.renderMonthlyFeesTable();
        break;
      case 'fee-structure':
        FeesModule.renderFeeStructureTable();
        break;
      case 'promotions':
        PromotionsModule.renderPromotionTable();
        break;
      case 'receipts':
        ReceiptsModule.renderReceiptsTable();
        break;
      case 'reports':
        ReportsModule.renderReports();
        break;
      case 'settings':
        ProgrammesModule.renderProgrammesTable();
        SettingsModule.populateForm();
        break;
      case 'excel-import':
        ExcelImportModule.init();
        break;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    Utils.renderIcons();
  }
};

window.App = App;

// Bootstrap on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
