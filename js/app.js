/**
 * EDUTRACK MASTER APPLICATION CONTROLLER & ROUTER
 * Handles Desktop Sidebar, Mobile Bottom Navigation, More Bottom Sheet & Route Dispatching
 */

const App = {
  currentRoute: 'dashboard',

  init: async () => {
    try {
      console.log("Initializing EduTrack Application...");

      // 1. Strict Authentication Check
      const isAuthenticated = await AuthModule.init();
      if (!isAuthenticated) return;

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

      // 5. Setup DOM Listeners (Desktop & Mobile Bottom Nav)
      App.setupEventListeners();

      // 6. Navigate to initial route
      const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
      App.navigateTo(initialRoute);

      // 7. Initial Lucide icons render
      Utils.renderIcons();

      console.log("EduTrack initialized successfully.");
    } catch (err) {
      console.error("Application initialization error:", err);
      Utils.showToast("Notice", "Error initializing data. Please verify your connection.", "warning");
    }
  },

  // Setup DOM Event Listeners
  setupEventListeners: () => {
    // Hash change listener
    window.addEventListener('hashchange', () => {
      const route = window.location.hash.replace('#', '') || 'dashboard';
      App.navigateTo(route);
    });

    // Mobile "More" button toggle
    const moreBtn = document.getElementById('mobile-nav-more-btn');
    const bottomSheet = document.getElementById('mobile-more-sheet');
    const sheetBackdrop = document.getElementById('bottom-sheet-backdrop');

    if (moreBtn && bottomSheet && sheetBackdrop) {
      moreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        App.toggleMoreSheet();
      });

      sheetBackdrop.addEventListener('click', () => {
        App.closeMoreSheet();
      });
    }

    // Attach click listeners to More sheet navigation items to close after click
    const sheetItems = document.querySelectorAll('.bottom-sheet-item');
    sheetItems.forEach(item => {
      item.addEventListener('click', () => {
        App.closeMoreSheet();
      });
    });
  },

  // Toggle Mobile More Sheet
  toggleMoreSheet: () => {
    const bottomSheet = document.getElementById('mobile-more-sheet');
    const sheetBackdrop = document.getElementById('bottom-sheet-backdrop');
    if (bottomSheet && sheetBackdrop) {
      const isOpen = bottomSheet.classList.contains('active');
      if (isOpen) {
        App.closeMoreSheet();
      } else {
        bottomSheet.classList.add('active');
        sheetBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
        Utils.renderIcons();
      }
    }
  },

  closeMoreSheet: () => {
    const bottomSheet = document.getElementById('mobile-more-sheet');
    const sheetBackdrop = document.getElementById('bottom-sheet-backdrop');
    if (bottomSheet && sheetBackdrop) {
      bottomSheet.classList.remove('active');
      sheetBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Route Dispatcher
  navigateTo: (route) => {
    const routeBase = route.split('?')[0] || 'dashboard';
    App.currentRoute = routeBase;

    // Close More sheet if open
    App.closeMoreSheet();

    // Hide all views
    const views = document.querySelectorAll('.page-view');
    views.forEach(v => v.classList.remove('active'));

    // Highlight active Desktop Sidebar nav item
    const desktopNavItems = document.querySelectorAll('.sidebar-nav-item');
    desktopNavItems.forEach(item => {
      const itemRoute = item.getAttribute('data-route');
      if (itemRoute === routeBase) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Highlight active Mobile Bottom Bar item
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
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
      document.getElementById('view-dashboard')?.classList.add('active');
      App.currentRoute = 'dashboard';
    }

    // Update Header Titles
    const routeTitles = {
      'dashboard': 'Dashboard',
      'students': 'Student Directory',
      'student-profile': 'Student Profile',
      'fee-collection': 'Fee Collection',
      'monthly-fees': 'Monthly Fees',
      'fee-structure': 'Fee Structure',
      'promotions': 'Student Promotions',
      'receipts': 'Payment Receipts',
      'reports': 'Reports & Analytics',
      'settings': 'Settings',
      'excel-import': 'Excel Importer'
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
        FeesModule.initParentCalculator();
        FeesModule.renderProgrammeTabs();
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
        SettingsModule.renderAcademicYearsTable();
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

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
