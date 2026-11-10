/**
 * EDUTRACK UTILITIES & HELPERS
 */

const Utils = {
  // Render Lucide icons safely
  renderIcons: () => {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  // Format currency with symbol (default ₹)
  formatCurrency: (amount) => {
    const num = parseFloat(amount) || 0;
    const sym = AppState.institution?.currency_symbol || EDUTRACK_CONFIG.DEFAULT_CURRENCY;
    return `${sym}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  },

  // Format standard date
  formatDate: (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },

  // Format Month Year (e.g., Nov 2026)
  formatMonthYear: (month, year) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${monthNames[mIdx] || month} ${year}`;
  },

  // Toast Notifications
  showToast: (title, message = '', type = 'info', duration = 4000) => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: 'check-circle',
      error: 'alert-triangle',
      warning: 'alert-circle',
      info: 'info'
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i data-lucide="${iconMap[type] || 'info'}" style="width: 20px; height: 20px;"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
      </button>
    `;

    container.appendChild(toast);
    Utils.renderIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  // Modal open & close
  openModal: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      Utils.renderIcons();
    }
  },

  closeModal: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Format WhatsApp clean phone number (e.g. 919876543210)
  cleanPhoneNumber: (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  },

  // Build WhatsApp Click to Chat URL with URL encoding
  buildWhatsAppUrl: (phone, message) => {
    const cleanPhone = Utils.cleanPhoneNumber(phone);
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  },

  // Safe unique ID generator
  generateUUID: () => {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Generate next Student ID (e.g. STU-0077)
  getNextStudentId: (existingStudents) => {
    const prefix = AppState.institution?.student_prefix || 'STU';
    let maxNum = 0;
    if (existingStudents && existingStudents.length > 0) {
      existingStudents.forEach(s => {
        const idStr = s.student_id || '';
        const match = idStr.match(/\d+$/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (n > maxNum) maxNum = n;
        }
      });
    }
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  },

  // Generate Next Receipt Number (e.g. REC-202611-004)
  getNextReceiptNumber: () => {
    const prefix = AppState.institution?.receipt_prefix || 'REC';
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${ym}-${rand}`;
  },

  // Generate Next Invoice Number (e.g. INV-202611-001)
  getNextInvoiceNumber: (studentCode, month, year) => {
    const prefix = AppState.institution?.invoice_prefix || 'INV';
    const ym = `${year}${String(month).padStart(2, '0')}`;
    const code = studentCode ? studentCode.replace(/[^a-zA-Z0-9]/g, '').slice(-4) : Math.floor(100 + Math.random() * 900);
    return `${prefix}-${ym}-${code}`;
  },

  // Escape HTML string
  escapeHtml: (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.Utils = Utils;

