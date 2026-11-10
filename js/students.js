/**
 * EDUTRACK STUDENT MANAGEMENT MODULE
 * Multi-Programme Single-Form Registration, Full Student Editing,
 * Desktop Table Directory & Mobile Student Cards
 */

const StudentsModule = {
  activeProgrammeRowCount: 0,
  currentProfileStudentId: null,

  init: async () => {
    await StudentsModule.loadStudents();
  },

  // Load students with enrollments, invoices, and payments
  loadStudents: async () => {
    try {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from('students')
        .select(`
          *,
          enrollments (
            *,
            programmes (*)
          ),
          invoices (*),
          payments (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      AppState.students = data || [];
      return AppState.students;
    } catch (err) {
      console.error("Error loading students:", err);
      Utils.showToast("Error", "Failed to load students", "error");
      return [];
    }
  },

  // Format enrolment description cleanly
  formatEnrolmentBadge: (e) => {
    const progName = e.programmes?.name || 'Tuition';
    const isHindi = progName.toLowerCase().includes('hindi');
    let levelText = e.class_or_grade;
    if (isHindi) {
      const code = FeesModule.normalizeHindiLevel(e.class_or_grade);
      const hl = FeesModule.HINDI_LEVELS.find(l => l.code === code);
      levelText = hl ? hl.name : e.class_or_grade;
    } else {
      levelText = FeesModule.normalizeSubjectClass(e.class_or_grade);
    }
    const variant = e.board ? ` · ${Utils.escapeHtml(e.board)}` : '';
    return `${Utils.escapeHtml(progName)} (${Utils.escapeHtml(levelText)}${variant})`;
  },

  // Calculate combined monthly fee for active enrolments
  calculateMonthlyFee: (student) => {
    if (!student || !student.enrollments) return 0;
    return student.enrollments
      .filter(e => e.status === 'active')
      .reduce((sum, e) => sum + (parseFloat(e.agreed_fee) || 0), 0);
  },

  // Calculate outstanding balance across all invoices and payments
  calculateOutstandingBalance: (student) => {
    if (!student) return 0;
    const activeInvoices = (student.invoices || []).filter(inv => inv.status !== 'cancelled');
    
    if (activeInvoices.length > 0) {
      return activeInvoices.reduce((sum, inv) => {
        if (inv.status === 'paid') return sum;
        const total = parseFloat(inv.total_amount) || 0;
        const paid = parseFloat(inv.paid_amount) || 0;
        const bal = (inv.balance_amount !== undefined && inv.balance_amount !== null)
          ? parseFloat(inv.balance_amount)
          : Math.max(0, total - paid);
        return sum + Math.max(0, Math.min(bal, total - paid));
      }, 0);
    }

    // If student has no invoices in DB yet, calculate from monthly fee minus total completed payments
    const monthlyFee = StudentsModule.calculateMonthlyFee(student);
    const totalPaid = (student.payments || [])
      .filter(p => p.status !== 'cancelled' && p.status !== 'reversed')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    return Math.max(0, monthlyFee - totalPaid);
  },

  // Determine overall payment status
  getPaymentStatus: (student) => {
    if (!student) return { status: 'unpaid', label: 'Unpaid', class: 'badge-unpaid' };
    const bal = StudentsModule.calculateOutstandingBalance(student);
    if (bal <= 0) {
      return { status: 'paid', label: 'Paid', class: 'badge-paid' };
    }
    const totalPaid = (student.payments || [])
      .filter(p => p.status !== 'cancelled' && p.status !== 'reversed')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) +
      (student.invoices || []).reduce((sum, i) => sum + (parseFloat(i.paid_amount) || 0), 0);
    if (totalPaid > 0) {
      return { status: 'partially_paid', label: 'Partial', class: 'badge-partial' };
    }
    return { status: 'unpaid', label: 'Unpaid', class: 'badge-unpaid' };
  },

  // Render Student Directory (Both Desktop Table & Mobile Cards)
  renderStudentsTable: () => {
    const tbody = document.getElementById('students-table-body');
    const mobileContainer = document.getElementById('students-mobile-cards-list');
    if (!tbody && !mobileContainer) return;

    const searchTerm = (document.getElementById('student-search-input')?.value || '').trim().toLowerCase();
    const filterProg = document.getElementById('student-filter-programme')?.value || '';
    const filterStatus = document.getElementById('student-filter-status')?.value || '';
    const filterPayment = document.getElementById('student-filter-payment')?.value || '';

    let list = AppState.students || [];

    // Search (student name, ID, parent name, phone, class, board, or programme)
    if (searchTerm) {
      list = list.filter(s => {
        const matchesPersonal = 
          (s.name && s.name.toLowerCase().includes(searchTerm)) ||
          (s.student_id && s.student_id.toLowerCase().includes(searchTerm)) ||
          (s.parent_name && s.parent_name.toLowerCase().includes(searchTerm)) ||
          (s.whatsapp_number && s.whatsapp_number.includes(searchTerm));

        if (matchesPersonal) return true;

        const matchesEnrolment = (s.enrollments || []).some(e => 
          (e.class_or_grade && e.class_or_grade.toLowerCase().includes(searchTerm)) ||
          (e.board && e.board.toLowerCase().includes(searchTerm)) ||
          (e.programmes?.name && e.programmes.name.toLowerCase().includes(searchTerm))
        );

        return matchesEnrolment;
      });
    }

    // Filters
    if (filterProg) {
      list = list.filter(s => s.enrollments?.some(e => e.status === 'active' && e.programme_id === filterProg));
    }
    if (filterStatus) {
      list = list.filter(s => s.status === filterStatus);
    }
    if (filterPayment) {
      list = list.filter(s => StudentsModule.getPaymentStatus(s).status === filterPayment);
    }

    // Counter badge
    const countBadge = document.getElementById('student-count-badge');
    if (countBadge) countBadge.textContent = `${list.length} student${list.length === 1 ? '' : 's'}`;

    // Handle Empty State
    if (list.length === 0) {
      const emptyHtml = `
        <div class="empty-state">
          <i data-lucide="users" class="empty-state-icon"></i>
          <div class="empty-state-title">No students found</div>
          <div class="empty-state-text">No records match your active search or filters.</div>
        </div>`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      Utils.renderIcons();
      return;
    }

    // 1. Desktop Table Rows
    if (tbody) {
      tbody.innerHTML = list.map(s => {
        const activeEnrollments = (s.enrollments || []).filter(e => e.status === 'active');
        const monthlyFee = StudentsModule.calculateMonthlyFee(s);
        const pendingBal = StudentsModule.calculateOutstandingBalance(s);
        const payStatus = StudentsModule.getPaymentStatus(s);

        const progBadges = activeEnrollments.length > 0
          ? activeEnrollments.map(e => `
              <span class="badge badge-programme" style="margin: 2px;">
                ${StudentsModule.formatEnrolmentBadge(e)}
              </span>
            `).join('')
          : '<span class="text-muted" style="font-size:0.78rem;">No active programmes</span>';

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(s.student_id || '—')}</strong></td>
            <td>
              <div style="font-weight: 600; font-size: 0.92rem;">
                <a href="#student-profile" onclick="StudentsModule.viewProfile('${s.id}')" style="color: var(--accent-blue); text-decoration: underline;">
                  ${Utils.escapeHtml(s.name)}
                </a>
              </div>
              ${s.parent_name ? `<div style="font-size: 0.78rem; color: var(--text-muted);">${Utils.escapeHtml(s.parent_name)} (Parent)</div>` : ''}
            </td>
            <td>
              ${s.whatsapp_number ? `
                <a href="https://wa.me/${Utils.cleanPhoneNumber(s.whatsapp_number)}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem; gap: 0.3rem;">
                  <i data-lucide="message-circle" style="width: 13px; height: 13px; color: #16a34a;"></i>
                  ${Utils.escapeHtml(s.whatsapp_number)}
                </a>
              ` : '<span class="text-muted">—</span>'}
            </td>
            <td><div style="display: flex; flex-wrap: wrap; max-width: 260px;">${progBadges}</div></td>
            <td><strong>${Utils.formatCurrency(monthlyFee)}</strong> / mo</td>
            <td>
              <strong style="color: ${pendingBal > 0 ? 'var(--status-unpaid)' : 'var(--status-paid)'}; font-size: 0.95rem;">
                ${Utils.formatCurrency(pendingBal)}
              </strong>
            </td>
            <td>
              <span class="badge ${payStatus.class}">
                <span class="badge-dot"></span>
                ${payStatus.label}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-secondary btn-sm" onclick="StudentsModule.viewProfile('${s.id}')" title="View Profile">
                <i data-lucide="user" style="width: 14px; height: 14px;"></i> View
              </button>
              <button class="btn btn-secondary btn-sm" onclick="StudentsModule.editCurrentStudent('${s.id}')" title="Edit Student">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Edit
              </button>
              ${pendingBal > 0 ? `
                <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${s.id}')" title="Record Payment">
                  <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.75; cursor: default;" title="Fee already collected for this month">
                  <i data-lucide="check-circle-2" style="width: 14px; height: 14px; color: var(--status-paid);"></i> Paid
                </button>
              `}
              <button class="btn btn-secondary btn-sm" onclick="StudentsModule.deleteStudent('${s.id}')" title="Delete Student" style="color: var(--status-unpaid); padding: 0.25rem 0.45rem;">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Mobile Cards (Compact, Readable, No Horizontal Overflow)
    if (mobileContainer) {
      mobileContainer.innerHTML = list.map(s => {
        const activeEnrollments = (s.enrollments || []).filter(e => e.status === 'active');
        const monthlyFee = StudentsModule.calculateMonthlyFee(s);
        const pendingBal = StudentsModule.calculateOutstandingBalance(s);
        const payStatus = StudentsModule.getPaymentStatus(s);

        const progBadges = activeEnrollments.length > 0
          ? activeEnrollments.map(e => `
              <span class="badge badge-programme">
                ${StudentsModule.formatEnrolmentBadge(e)}
              </span>
            `).join('')
          : '<span class="text-muted" style="font-size:0.75rem;">No active programmes</span>';

        return `
          <div class="student-mobile-card">
            <div class="student-card-top">
              <div>
                <div class="student-card-name">${Utils.escapeHtml(s.name)}</div>
                <div class="student-card-parent">${s.parent_name ? `${Utils.escapeHtml(s.parent_name)} (Parent)` : ''} • ID: ${Utils.escapeHtml(s.student_id)}</div>
              </div>
              <span class="badge ${payStatus.class}">
                <span class="badge-dot"></span>
                ${payStatus.label}
              </span>
            </div>

            <div class="student-card-progs">${progBadges}</div>

            <div class="student-card-financials">
              <div>Fee: <strong>${Utils.formatCurrency(monthlyFee)}</strong>/mo</div>
              <div>Pending: <strong style="color: ${pendingBal > 0 ? 'var(--status-unpaid)' : 'var(--status-paid)'};">${Utils.formatCurrency(pendingBal)}</strong></div>
            </div>

            <div class="student-card-actions">
              <button class="btn btn-secondary btn-sm" onclick="StudentsModule.viewProfile('${s.id}')">
                <i data-lucide="user" style="width: 14px; height: 14px;"></i> Profile
              </button>
              <button class="btn btn-secondary btn-sm" onclick="StudentsModule.editCurrentStudent('${s.id}')">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Edit
              </button>
              ${pendingBal > 0 ? `
                <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${s.id}')">
                  <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect Fee
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.75; cursor: default;" title="Fee already collected for this month">
                  <i data-lucide="check-circle-2" style="width: 14px; height: 14px; color: var(--status-paid);"></i> Paid
                </button>
              `}
              <button class="btn btn-secondary btn-sm btn-delete-student" onclick="StudentsModule.deleteStudent('${s.id}')" title="Delete Student" style="color: var(--status-unpaid);">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    Utils.renderIcons();
  },

  // Toggle mobile filter panel
  toggleMobileFilters: () => {
    const filterBar = document.getElementById('student-filter-bar');
    if (filterBar) {
      filterBar.classList.toggle('active');
    }
  },

  // Open the Single-Page Add Student Registration Form
  openAddStudentModal: () => {
    document.getElementById('student-form-id').value = '';
    document.getElementById('student-name-input').value = '';
    document.getElementById('student-parent-input').value = '';
    document.getElementById('student-phone-input').value = '';
    document.getElementById('student-alt-phone-input').value = '';
    document.getElementById('student-address-input').value = '';
    document.getElementById('student-notes-input').value = '';
    document.getElementById('student-status-select').value = 'active';

    // Set joining date default to today (editable)
    document.getElementById('student-joining-date-input').value = new Date().toISOString().slice(0, 10);

    // Auto-generate next Student ID
    const nextId = Utils.getNextStudentId(AppState.students);
    document.getElementById('student-code-preview').textContent = nextId;

    // Reset dynamic programme rows
    const container = document.getElementById('programme-rows-container');
    container.innerHTML = '';
    StudentsModule.activeProgrammeRowCount = 0;

    // Add first programme row by default
    StudentsModule.addProgrammeRow();

    // Reset fee summary
    StudentsModule.updateCombinedFeePreview();

    document.getElementById('student-modal-title').textContent = 'Register New Student';
    const statusBadge = document.getElementById('student-modal-status-badge');
    if (statusBadge) statusBadge.innerHTML = '• Initial Status: <span class="badge badge-unpaid">UNPAID</span>';
    const warningEl = document.getElementById('student-modal-warning');
    if (warningEl) {
      warningEl.style.display = 'block';
      warningEl.innerHTML = '⚠️ <strong>Registration ≠ Payment:</strong> Saving creates student with initial status <strong>UNPAID</strong>. No payment is collected until recorded in Fee Collection.';
    }
    const saveBtn = document.getElementById('btn-save-student-submit');
    if (saveBtn) saveBtn.innerHTML = '<i data-lucide="check" style="width: 15px; height: 15px;"></i> Register Student (Unpaid)';
    const modalDelBtn = document.getElementById('btn-modal-delete-student');
    if (modalDelBtn) modalDelBtn.style.display = 'none';
    Utils.openModal('modal-add-student');
    Utils.renderIcons();
  },

  // Dynamic sync of Level / Class and Board / Delivery Type dropdowns
  syncProgrammeRowFields: (card, initialGrade = null, initialBoard = null) => {
    const progSelect = card.querySelector('.prog-select');
    const classLabel = card.querySelector('.prog-class-label');
    const classSelect = card.querySelector('.prog-class-select');
    const boardLabel = card.querySelector('.prog-board-label');
    const boardSelect = card.querySelector('.prog-board-select');

    const progId = progSelect.value;
    const prog = (AppState.programmes || []).find(p => p.id === progId);
    const progName = (prog ? prog.name : '').toLowerCase();
    const isHindi = progName.includes('hindi');

    if (isHindi) {
      // Category B: Hindi Programme
      if (classLabel) classLabel.innerHTML = `Hindi Course Level <span class="required">*</span>`;
      if (boardLabel) boardLabel.innerHTML = `Delivery Type <span class="required">*</span>`;

      const targetLevel = initialGrade ? FeesModule.normalizeHindiLevel(initialGrade) : (classSelect.value || 'BASIC');
      classSelect.innerHTML = `<option value="">Select Hindi Level</option>` + 
        FeesModule.HINDI_LEVELS.map(l => `
          <option value="${l.code}" ${targetLevel === l.code ? 'selected' : ''}>
            ${l.label || l.name + (l.local ? ' (' + l.local + ')' : '')}
          </option>
        `).join('');

      let targetBoard = initialBoard || boardSelect.value || (progName.includes('online') ? 'Online' : 'Virtual');
      if (targetBoard.toLowerCase() !== 'online' && targetBoard.toLowerCase() !== 'virtual') {
        targetBoard = progName.includes('online') ? 'Online' : 'Virtual';
      }
      boardSelect.innerHTML = `
        <option value="Virtual" ${targetBoard.toLowerCase() === 'virtual' ? 'selected' : ''}>Virtual</option>
        <option value="Online" ${targetBoard.toLowerCase() === 'online' ? 'selected' : ''}>Online</option>
      `;
    } else {
      // Category A: Subject Tuition
      if (classLabel) classLabel.innerHTML = `School Class <span class="required">*</span>`;
      if (boardLabel) boardLabel.innerHTML = `School Board <span class="required">*</span>`;

      const targetClass = initialGrade ? FeesModule.normalizeSubjectClass(initialGrade) : (classSelect.value || '5th');
      classSelect.innerHTML = `<option value="">Select School Class</option>` + 
        FeesModule.SUBJECT_CLASSES.map(c => {
          const code = typeof c === 'object' ? c.code : c;
          const name = typeof c === 'object' ? c.name : c;
          return `<option value="${code}" ${targetClass === code ? 'selected' : ''}>${name}</option>`;
        }).join('');

      let targetBoard = initialBoard || boardSelect.value || 'Matric';
      if (targetBoard.toUpperCase() !== 'CBSE' && targetBoard.toUpperCase() !== 'MATRIC') {
        targetBoard = 'Matric';
      }
      boardSelect.innerHTML = `
        <option value="Matric" ${targetBoard.toUpperCase() === 'MATRIC' ? 'selected' : ''}>Matric</option>
        <option value="CBSE" ${targetBoard.toUpperCase() === 'CBSE' ? 'selected' : ''}>CBSE</option>
      `;
    }
  },

  // Add dynamic programme card in registration / edit form
  addProgrammeRow: (initialData = null) => {
    StudentsModule.activeProgrammeRowCount++;
    const rowId = `prog-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const container = document.getElementById('programme-rows-container');

    const progOptions = (AppState.programmes || []).map(p => `
      <option value="${p.id}" ${initialData && initialData.programme_id === p.id ? 'selected' : ''}>
        ${Utils.escapeHtml(p.name)}
      </option>
    `).join('');

    const card = document.createElement('div');
    card.className = 'programme-entry-card';
    card.id = rowId;
    if (initialData && initialData.id) {
      card.dataset.enrollmentId = initialData.id;
    }
    card.style.cssText = `
      background: var(--surface-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 0.85rem;
      box-shadow: var(--shadow-subtle);
    `;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
        <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent-blue);">
          Programme Enrolment #${container.children.length + 1}
        </span>
        <button type="button" class="btn btn-secondary btn-sm" onclick="StudentsModule.removeProgrammeRow('${rowId}')" title="Remove Programme" style="color: var(--status-unpaid); padding: 0.2rem 0.5rem; min-height: 28px;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Remove
        </button>
      </div>

      <div class="form-row">
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Programme <span class="required">*</span></label>
          <select class="form-control prog-select" onchange="StudentsModule.onProgrammeFieldChange('${rowId}', true)" required>
            <option value="">Select Programme</option>
            ${progOptions}
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label prog-class-label">School Class / Level <span class="required">*</span></label>
          <select class="form-control prog-class-select" onchange="StudentsModule.onProgrammeFieldChange('${rowId}', false)" required>
            <option value="">Select Class / Level</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label prog-board-label">Board / Delivery Type <span class="required">*</span></label>
          <select class="form-control prog-board-select" onchange="StudentsModule.onProgrammeFieldChange('${rowId}', false)">
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Monthly Fee (₹) <span class="required">*</span></label>
          <input type="number" class="form-control prog-fee-input" placeholder="0" min="0" oninput="StudentsModule.onFeeManualOverride('${rowId}')" required>
          <div class="form-hint fee-auto-hint" style="font-size: 0.72rem; color: var(--accent-blue);">Auto-fetched from fee structure</div>
        </div>
      </div>

      <div class="override-reason-wrap" style="display: none; margin-top: 0.35rem;">
        <input type="text" class="form-control prog-override-reason" placeholder="Reason for fee override (optional)" style="font-size: 0.8rem;">
      </div>
    `;

    container.appendChild(card);
    Utils.renderIcons();

    // Setup Dropdowns & Initial State
    const progSelect = card.querySelector('.prog-select');
    if (initialData && initialData.programme_id) {
      progSelect.value = initialData.programme_id;
      StudentsModule.syncProgrammeRowFields(card, initialData.class_or_grade, initialData.board);
      const feeInput = card.querySelector('.prog-fee-input');
      if (feeInput && initialData.agreed_fee) {
        feeInput.value = initialData.agreed_fee;
        card.dataset.standardFee = initialData.agreed_fee;
      }
    } else {
      if (AppState.programmes && AppState.programmes.length > 0) {
        progSelect.value = AppState.programmes[0].id;
        StudentsModule.syncProgrammeRowFields(card);
        StudentsModule.onProgrammeFieldChange(rowId, false);
      }
    }

    StudentsModule.updateCombinedFeePreview();
  },

  // Remove programme row
  removeProgrammeRow: (rowId) => {
    const container = document.getElementById('programme-rows-container');
    if (container.children.length <= 1) {
      Utils.showToast("Notice", "A student must have at least one programme enrolment.", "warning");
      return;
    }
    const card = document.getElementById(rowId);
    if (card) card.remove();

    Array.from(container.children).forEach((child, idx) => {
      const titleSpan = child.querySelector('span');
      if (titleSpan) titleSpan.textContent = `Programme Enrolment #${idx + 1}`;
    });

    StudentsModule.updateCombinedFeePreview();
  },

  // EXACT MATCHING fee lookup triggered on dropdown changes
  onProgrammeFieldChange: (rowId, isProgChange = false) => {
    const card = document.getElementById(rowId);
    if (!card) return;

    if (isProgChange) {
      StudentsModule.syncProgrammeRowFields(card);
    }

    const progId = card.querySelector('.prog-select').value;
    const grade = card.querySelector('.prog-class-select').value;
    const board = card.querySelector('.prog-board-select').value;
    const feeInput = card.querySelector('.prog-fee-input');
    const hint = card.querySelector('.fee-auto-hint');

    const prog = (AppState.programmes || []).find(p => p.id === progId);
    const progName = (prog ? prog.name : '').toLowerCase();
    const isHindi = progName.includes('hindi');
    const cat = isHindi ? 'HINDI' : 'SUBJECT';

    if (!progId || !grade) {
      feeInput.value = '';
      hint.textContent = isHindi ? 'Select Hindi level to fetch monthly fee' : 'Select school class to fetch monthly fee';
      hint.style.color = 'var(--text-muted)';
      StudentsModule.updateCombinedFeePreview();
      return;
    }

    // Central Fee Lookup
    const lookup = FeesModule.lookupRate(cat, board, grade);
    if (lookup.success && lookup.monthly_fee !== null) {
      feeInput.value = lookup.monthly_fee;
      hint.textContent = `✓ Standard fee: ₹${lookup.monthly_fee}/month`;
      hint.style.color = 'var(--status-paid)';
      card.dataset.standardFee = lookup.monthly_fee;
    } else {
      hint.textContent = `⚠️ Fee not configured for ${board} - ${grade}. Please enter manually.`;
      hint.style.color = 'var(--status-pending)';
      card.dataset.standardFee = '';
    }

    StudentsModule.updateCombinedFeePreview();
  },

  // Manual fee override
  onFeeManualOverride: (rowId) => {
    const card = document.getElementById(rowId);
    if (!card) return;
    const standardFee = parseFloat(card.dataset.standardFee) || 0;
    const currentFee = parseFloat(card.querySelector('.prog-fee-input').value) || 0;
    const overrideWrap = card.querySelector('.override-reason-wrap');

    if (standardFee > 0 && currentFee !== standardFee) {
      if (overrideWrap) overrideWrap.style.display = 'block';
    }
    StudentsModule.updateCombinedFeePreview();
  },

  // Running combined monthly fee calculation in registration / edit form
  updateCombinedFeePreview: () => {
    const container = document.getElementById('programme-rows-container');
    if (!container) return;

    let total = 0;
    const breakdown = [];

    Array.from(container.children).forEach(card => {
      const progSelect = card.querySelector('.prog-select');
      const classSelect = card.querySelector('.prog-class-select');
      const feeInput = card.querySelector('.prog-fee-input');

      const progName = progSelect?.options[progSelect.selectedIndex]?.text || '';
      const grade = classSelect?.value || '';
      const fee = parseFloat(feeInput?.value) || 0;

      total += fee;
      if (progName && progName !== 'Select Programme' && fee > 0) {
        breakdown.push(`${progName} (${grade}): ₹${fee}`);
      }
    });

    const totalEl = document.getElementById('combined-fee-preview-total');
    const breakdownEl = document.getElementById('combined-fee-preview-breakdown');

    if (totalEl) totalEl.textContent = Utils.formatCurrency(total);
    if (breakdownEl) breakdownEl.textContent = breakdown.length > 0 ? breakdown.join(' + ') : 'None selected';
  },

  // SAVE STUDENT & ENROLMENTS (Supports both New Registration & Full Editing)
  saveStudent: async (e) => {
    e.preventDefault();

    const studentId = document.getElementById('student-form-id').value;
    const name = document.getElementById('student-name-input').value.trim();
    const parent_name = document.getElementById('student-parent-input').value.trim();
    const whatsapp_number = document.getElementById('student-phone-input').value.trim();
    const alt_phone = document.getElementById('student-alt-phone-input').value.trim();
    const address = document.getElementById('student-address-input').value.trim();
    const notes = document.getElementById('student-notes-input').value.trim();
    const status = document.getElementById('student-status-select').value;
    const joining_date = document.getElementById('student-joining-date-input').value || new Date().toISOString().slice(0, 10);

    if (!name) {
      Utils.showToast("Required", "Student Name is required", "warning");
      return;
    }
    if (!whatsapp_number) {
      Utils.showToast("Required", "Parent WhatsApp Number is required", "warning");
      return;
    }

    // Extract dynamic programme enrolments
    const container = document.getElementById('programme-rows-container');
    const selectedProgrammes = [];
    const seenProgIds = new Set();

    for (const card of Array.from(container.children)) {
      const enrollmentId = card.dataset.enrollmentId || null;
      const progId = card.querySelector('.prog-select').value;
      const grade = card.querySelector('.prog-class-select').value;
      const board = card.querySelector('.prog-board-select').value;
      const fee = parseFloat(card.querySelector('.prog-fee-input').value) || 0;
      const overrideReason = card.querySelector('.prog-override-reason')?.value.trim() || '';

      if (!progId || !grade) {
        Utils.showToast("Required", "Please complete all programme details", "warning");
        return;
      }

      if (seenProgIds.has(progId)) {
        Utils.showToast("Duplicate Error", "A student cannot have multiple active enrolments in the same programme", "error");
        return;
      }
      seenProgIds.add(progId);

      selectedProgrammes.push({
        enrollment_id: enrollmentId,
        programme_id: progId,
        class_or_grade: grade,
        board,
        agreed_fee: fee,
        notes: overrideReason ? `Fee override: ${overrideReason}` : ''
      });
    }

    if (selectedProgrammes.length === 0) {
      Utils.showToast("Required", "Please select at least one programme enrolment", "warning");
      return;
    }

    try {
      if (!studentId) {
        // ==========================================
        // 1. NEW REGISTRATION WORKFLOW
        // ==========================================
        const studentCode = document.getElementById('student-code-preview').textContent || Utils.getNextStudentId(AppState.students);
        
        // Try atomic RPC first
        let rpcSucceeded = false;
        try {
          const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc('register_student_transaction', {
            p_student_code: studentCode,
            p_name: name,
            p_parent_name: parent_name,
            p_whatsapp_number: whatsapp_number,
            p_alt_phone: alt_phone,
            p_address: address,
            p_notes: notes,
            p_admission_date: joining_date,
            p_status: status,
            p_programmes: selectedProgrammes
          });
          if (!rpcErr && rpcRes && rpcRes.success) {
            rpcSucceeded = true;
          }
        } catch (rpcEx) {
          rpcSucceeded = false;
        }

        // Direct transactional fallback if RPC not yet created in Supabase
        if (!rpcSucceeded) {
          const studentPayload = {
            student_id: studentCode,
            name,
            parent_name,
            whatsapp_number,
            alt_phone,
            address,
            notes,
            status,
            admission_date: joining_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: newStudent, error: sErr } = await supabaseClient
            .from('students')
            .insert([studentPayload])
            .select();

          if (sErr) throw sErr;
          const newStudentId = newStudent[0].id;

          // Insert enrolments
          const enrollmentRows = selectedProgrammes.map(p => ({
            student_id: newStudentId,
            programme_id: p.programme_id,
            class_or_grade: p.class_or_grade,
            board: p.board,
            agreed_fee: p.agreed_fee,
            start_date: joining_date,
            status: 'active',
            is_verified: true,
            notes: p.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { error: eErr } = await supabaseClient.from('enrollments').insert(enrollmentRows);
          if (eErr) throw eErr;

          // Generate initial monthly invoice using joining date period (Status: UNPAID)
          const joinDateObj = new Date(joining_date);
          const billMonth = joinDateObj.getMonth() + 1;
          const billYear = joinDateObj.getFullYear();
          const totalFee = selectedProgrammes.reduce((sum, p) => sum + p.agreed_fee, 0);
          const dueDay = AppState.institution?.default_due_day || 10;
          const dueDate = `${billYear}-${String(billMonth).padStart(2, '0')}-${String(Math.min(dueDay, 28)).padStart(2, '0')}`;

          const invPayload = {
            invoice_number: Utils.getNextInvoiceNumber(studentCode, billMonth, billYear),
            student_id: newStudentId,
            billing_month: billMonth,
            billing_year: billYear,
            invoice_date: joining_date,
            due_date: dueDate,
            total_amount: totalFee,
            paid_amount: 0,
            balance_amount: totalFee,
            status: 'unpaid',
            notes: 'Initial monthly tuition invoice on registration'
          };

          const { data: createdInv } = await supabaseClient.from('invoices').insert([invPayload]).select();
          if (createdInv && createdInv[0]) {
            const items = selectedProgrammes.map(p => ({
              invoice_id: createdInv[0].id,
              programme_id: p.programme_id,
              class_or_grade: p.class_or_grade,
              description: `Tuition fee (${p.class_or_grade})`,
              amount: p.agreed_fee
            }));
            await supabaseClient.from('invoice_items').insert(items);
          }
        }

        Utils.closeModal('modal-add-student');
        const combinedMonthlyFee = selectedProgrammes.reduce((sum, p) => sum + p.agreed_fee, 0);
        Utils.showToast("Registered Successfully", `Student registered with UNPAID fee status. Monthly fee: ₹${combinedMonthlyFee}`, "success", 6000);

      } else {
        // ==========================================
        // 2. EDIT STUDENT WORKFLOW (Saves ALL fields and enrolments!)
        // ==========================================
        // A. Update student details
        const updateStudentPayload = {
          name,
          parent_name,
          whatsapp_number,
          alt_phone,
          address,
          notes,
          status,
          updated_at: new Date().toISOString()
        };

        const { error: uErr } = await supabaseClient
          .from('students')
          .update(updateStudentPayload)
          .eq('id', studentId);

        if (uErr) throw uErr;

        // B. Update / Insert Programme Enrolments
        for (const p of selectedProgrammes) {
          if (p.enrollment_id) {
            // Update existing enrolment (applies to future billing)
            await supabaseClient
              .from('enrollments')
              .update({
                programme_id: p.programme_id,
                class_or_grade: p.class_or_grade,
                board: p.board,
                agreed_fee: p.agreed_fee,
                notes: p.notes,
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', p.enrollment_id);
          } else {
            // New programme added during edit
            await supabaseClient
              .from('enrollments')
              .insert([{
                student_id: studentId,
                programme_id: p.programme_id,
                class_or_grade: p.class_or_grade,
                board: p.board,
                agreed_fee: p.agreed_fee,
                start_date: new Date().toISOString().slice(0, 10),
                status: 'active',
                is_verified: true,
                notes: p.notes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
          }
        }

        await AuthModule.logAudit('edit_student_and_programmes', 'students', studentId, { name, selectedProgrammes });
        Utils.closeModal('modal-add-student');
        Utils.showToast("Updated", "Student profile and programme enrolments saved successfully", "success");
      }

      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();
      StudentsModule.renderStudentsTable();
      if (typeof DashboardModule !== 'undefined' && DashboardModule.updateMetrics) {
        DashboardModule.updateMetrics();
        DashboardModule.renderOutstandingStudentsList();
      }

      if (studentId && (window.location.hash.includes('student-profile') || StudentsModule.currentProfileStudentId === studentId)) {
        StudentsModule.viewProfile(studentId);
      }

    } catch (err) {
      console.error("Save student error:", err);
      Utils.showToast("Error", err.message || "Failed to save student record", "error");
    }
  },

  // View Comprehensive Student Profile
  viewProfile: async (studentId) => {
    StudentsModule.currentProfileStudentId = studentId;
    window.location.hash = "#student-profile";

    const student = AppState.students.find(s => s.id === studentId);
    if (!student) return;

    // Fetch full data with invoices and payments
    const { data: fullStudent } = await supabaseClient
      .from('students')
      .select(`
        *,
        enrollments (
          *,
          programmes (*)
        ),
        invoices (
          *,
          invoice_items (*)
        ),
        payments (
          *,
          receipts (*)
        )
      `)
      .eq('id', studentId)
      .single();

    const s = fullStudent || student;

    // Personal Details
    document.getElementById('profile-student-name').textContent = s.name;
    document.getElementById('profile-student-id').textContent = s.student_id;
    document.getElementById('profile-parent-name').textContent = s.parent_name || 'Not provided';
    document.getElementById('profile-whatsapp').textContent = s.whatsapp_number || 'Not provided';
    document.getElementById('profile-phone-alt').textContent = s.alt_phone || 'None';
    document.getElementById('profile-address').textContent = s.address || 'Not provided';
    document.getElementById('profile-admission-date').textContent = Utils.formatDate(s.admission_date);

    // Status Badge
    const statusBadge = document.getElementById('profile-status-badge');
    statusBadge.className = `badge ${s.status === 'active' ? 'badge-paid' : 'badge-unpaid'}`;
    statusBadge.innerHTML = `<span class="badge-dot"></span> ${s.status === 'active' ? 'Active' : 'Inactive'}`;

    // WhatsApp Direct Action
    const waLink = document.getElementById('profile-whatsapp-action');
    if (waLink) {
      waLink.href = s.whatsapp_number ? `https://wa.me/${Utils.cleanPhoneNumber(s.whatsapp_number)}` : '#';
      waLink.style.display = s.whatsapp_number ? 'inline-flex' : 'none';
    }

    // Financial Metrics
    const monthlyFee = StudentsModule.calculateMonthlyFee(s);
    const pendingBal = StudentsModule.calculateOutstandingBalance(s);
    const totalPaid = (s.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalBilled = (s.invoices || []).reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);

    document.getElementById('profile-metric-monthly-fee').textContent = Utils.formatCurrency(monthlyFee);
    document.getElementById('profile-metric-pending').textContent = Utils.formatCurrency(pendingBal);
    document.getElementById('profile-metric-paid').textContent = Utils.formatCurrency(totalPaid);
    document.getElementById('profile-metric-billed').textContent = Utils.formatCurrency(totalBilled);

    // Enrolled Programmes
    const enrollmentsContainer = document.getElementById('profile-enrollments-list');
    if (enrollmentsContainer) {
      if (!s.enrollments || s.enrollments.length === 0) {
        enrollmentsContainer.innerHTML = `<div class="text-muted" style="padding: 1rem;">No programme enrolments recorded.</div>`;
      } else {
        enrollmentsContainer.innerHTML = s.enrollments.map(e => {
          const progName = e.programmes?.name || 'Tuition';
          const isHindi = progName.toLowerCase().includes('hindi');
          let levelDisplay = e.class_or_grade;
          if (isHindi) {
            const code = FeesModule.normalizeHindiLevel(e.class_or_grade);
            const hl = FeesModule.HINDI_LEVELS.find(l => l.code === code);
            levelDisplay = hl ? (hl.label || hl.name) : e.class_or_grade;
          } else {
            levelDisplay = FeesModule.normalizeSubjectClass(e.class_or_grade);
          }
          const variantLabel = isHindi ? 'Delivery' : 'Board';

          return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; border-bottom: 1px solid var(--border-light); flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <strong style="font-size: 0.95rem; color: var(--text-main);">${Utils.escapeHtml(progName)}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                ${isHindi ? 'Level' : 'Class'}: <strong>${Utils.escapeHtml(levelDisplay)}</strong> 
                ${e.board ? `| ${variantLabel}: <strong>${Utils.escapeHtml(e.board)}</strong>` : ''} 
                | Enrolled: ${Utils.formatDate(e.start_date)}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <strong style="color: var(--accent-blue); font-size: 1rem;">${Utils.formatCurrency(e.agreed_fee)}/mo</strong>
              <span class="badge ${e.status === 'active' ? 'badge-paid' : 'badge-unpaid'}">
                ${e.status === 'active' ? 'Active' : 'Discontinued'}
              </span>
              ${e.status === 'active' ? `
                <button class="btn btn-secondary btn-sm" onclick="StudentsModule.discontinueEnrollment('${e.id}')" style="color: var(--status-unpaid);">
                  Discontinue
                </button>
              ` : ''}
            </div>
          </div>
        `;
        }).join('');
      }
    }

    // Invoices Ledger
    const invoicesBody = document.getElementById('profile-invoices-body');
    if (invoicesBody) {
      const invs = s.invoices || [];
      if (invs.length === 0) {
        invoicesBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 1.5rem; color: var(--text-muted);">No invoices generated yet.</td></tr>`;
      } else {
        invoicesBody.innerHTML = invs.map(inv => `
          <tr>
            <td><strong>${Utils.escapeHtml(inv.invoice_number)}</strong></td>
            <td>${Utils.formatMonthYear(inv.billing_month, inv.billing_year)}</td>
            <td>${Utils.formatCurrency(inv.total_amount)}</td>
            <td>${Utils.formatCurrency(inv.paid_amount)}</td>
            <td><strong style="color: ${(inv.status === 'paid' || (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) <= 0) ? 'var(--status-paid)' : 'var(--status-unpaid)'};">${Utils.formatCurrency(inv.status === 'paid' ? 0 : Math.max(0, (parseFloat(inv.total_amount) || 0) - (parseFloat(inv.paid_amount) || 0)))}</strong></td>
            <td>
              <span class="badge ${inv.status === 'paid' ? 'badge-paid' : (inv.status === 'partially_paid' ? 'badge-partial' : 'badge-unpaid')}">
                ${inv.status}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-secondary btn-sm" onclick="MonthlyFeesModule.viewInvoice('${inv.id}')" title="View & Print">
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i> View
              </button>
              <button class="btn btn-success btn-sm" onclick="MonthlyFeesModule.shareInvoiceViaWhatsApp('${inv.id}')" title="WhatsApp">
                <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Payments & Receipts History
    const paymentsBody = document.getElementById('profile-payments-body');
    if (paymentsBody) {
      const pmts = s.payments || [];
      if (pmts.length === 0) {
        paymentsBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 1.5rem; color: var(--text-muted);">No payments recorded yet.</td></tr>`;
      } else {
        paymentsBody.innerHTML = pmts.map(p => {
          const r = p.receipts && p.receipts.length > 0 ? p.receipts[0] : null;
          return `
            <tr>
              <td><strong>${Utils.escapeHtml(p.payment_number)}</strong></td>
              <td>${Utils.formatDate(p.payment_date)}</td>
              <td><strong style="color: var(--status-paid);">${Utils.formatCurrency(p.amount)}</strong></td>
              <td><span class="badge badge-neutral">${Utils.escapeHtml(p.payment_method)}</span></td>
              <td>${r ? `<code>${Utils.escapeHtml(r.receipt_number)}</code>` : '—'}</td>
              <td class="actions-cell">
                ${r ? `
                  <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${r.id}')">
                    <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> Receipt
                  </button>
                  <button class="btn btn-success btn-sm" onclick="ReceiptsModule.shareViaWhatsApp('${r.id}')" title="Share via WhatsApp">
                    <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
                  </button>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="PaymentsModule.reversePayment('${p.id}')" title="Reverse Payment" style="color: var(--status-unpaid); margin-left: 4px;">
                  <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Reverse
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Programme Attendance Summary
    if (typeof AttendanceModule !== 'undefined' && AttendanceModule.renderStudentProfileAttendance) {
      AttendanceModule.renderStudentProfileAttendance(s.id);
    }

    Utils.renderIcons();
  },

  // Edit Student from Profile or Directory
  editCurrentStudent: async (studentId = null) => {
    const id = studentId || StudentsModule.currentProfileStudentId;
    if (!id) {
      Utils.showToast("Notice", "Please select a student to edit", "info");
      return;
    }

    let student = (AppState.students || []).find(s => s.id === id);
    if ((!student || !student.enrollments) && supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('students')
          .select(`*, enrollments (*, programmes (*))`)
          .eq('id', id)
          .single();
        if (data) student = data;
      } catch (_) {}
    }

    if (!student) {
      Utils.showToast("Error", "Student record not found", "error");
      return;
    }

    document.getElementById('student-form-id').value = student.id;
    document.getElementById('student-code-preview').textContent = student.student_id;
    document.getElementById('student-name-input').value = student.name || '';
    document.getElementById('student-parent-input').value = student.parent_name || '';
    document.getElementById('student-phone-input').value = student.whatsapp_number || '';
    document.getElementById('student-alt-phone-input').value = student.alt_phone || '';
    document.getElementById('student-address-input').value = student.address || '';
    document.getElementById('student-notes-input').value = student.notes || '';
    document.getElementById('student-status-select').value = student.status || 'active';
    document.getElementById('student-joining-date-input').value = student.admission_date || '';

    // Populate active enrolments (or first default row if none)
    const container = document.getElementById('programme-rows-container');
    container.innerHTML = '';
    StudentsModule.activeProgrammeRowCount = 0;

    const activeEnrolments = (student.enrollments || []).filter(e => e.status === 'active');
    if (activeEnrolments.length > 0) {
      activeEnrolments.forEach(e => {
        StudentsModule.addProgrammeRow(e);
      });
    } else {
      StudentsModule.addProgrammeRow();
    }

    StudentsModule.updateCombinedFeePreview();

    document.getElementById('student-modal-title').textContent = 'Edit Student Profile & Enrolments';
    const statusInfo = StudentsModule.getPaymentStatus(student);
    const statusBadge = document.getElementById('student-modal-status-badge');
    if (statusBadge) statusBadge.innerHTML = `• Status: <span class="badge ${statusInfo.class}">${statusInfo.label}</span>`;
    const warningEl = document.getElementById('student-modal-warning');
    if (warningEl) {
      warningEl.innerHTML = 'ℹ️ <strong>Note:</strong> Changes to programme fees apply to future billing. Payments must be recorded in Fee Collection.';
    }
    const saveBtn = document.getElementById('btn-save-student-submit');
    if (saveBtn) saveBtn.innerHTML = '<i data-lucide="check" style="width: 15px; height: 15px;"></i> Update Student';
    const modalDelBtn = document.getElementById('btn-modal-delete-student');
    if (modalDelBtn) modalDelBtn.style.display = 'inline-flex';
    Utils.openModal('modal-add-student');
    Utils.renderIcons();
  },

  // Delete student initiated from the Edit Student modal
  deleteFromModal: () => {
    const studentId = document.getElementById('student-form-id').value;
    if (studentId) {
      StudentsModule.deleteStudent(studentId);
    }
  },

  // Permanently delete a student and cascade all records
  deleteStudent: async (studentId) => {
    if (!studentId) return;
    const student = (AppState.students || []).find(s => s.id === studentId);
    const studentName = student ? student.name : 'this student';
    const studentCode = student?.student_id ? ` (${student.student_id})` : '';

    const confirmMsg = `Are you sure you want to permanently delete ${studentName}${studentCode}?\n\nThis will remove the student profile and ALL associated records (enrolments, invoices, payments, and receipts).\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Find all payments and invoices for this student to cleanly cascade
      const { data: studentPayments } = await supabaseClient
        .from('payments')
        .select('id')
        .eq('student_id', studentId);
      const paymentIds = (studentPayments || []).map(p => p.id);

      const { data: studentInvoices } = await supabaseClient
        .from('invoices')
        .select('id')
        .eq('student_id', studentId);
      const invoiceIds = (studentInvoices || []).map(i => i.id);

      // 2. Delete receipts & payment allocations for student's payments
      if (paymentIds.length > 0) {
        await supabaseClient
          .from('receipts')
          .delete()
          .in('payment_id', paymentIds);

        await supabaseClient
          .from('payment_allocations')
          .delete()
          .in('payment_id', paymentIds);
      }

      // 3. Delete allocations & items for student's invoices
      if (invoiceIds.length > 0) {
        await supabaseClient
          .from('payment_allocations')
          .delete()
          .in('invoice_id', invoiceIds);

        await supabaseClient
          .from('invoice_items')
          .delete()
          .in('invoice_id', invoiceIds);
      }

      // 4. Delete payments (clears payments_student_id_fkey constraint)
      await supabaseClient
        .from('payments')
        .delete()
        .eq('student_id', studentId);

      // 5. Delete invoices (clears invoices_student_id_fkey constraint)
      await supabaseClient
        .from('invoices')
        .delete()
        .eq('student_id', studentId);

      // 6. Delete class_history
      await supabaseClient
        .from('class_history')
        .delete()
        .eq('student_id', studentId);

      // 7. Delete enrollments
      await supabaseClient
        .from('enrollments')
        .delete()
        .eq('student_id', studentId);

      // 8. Finally delete student profile
      const { error: studentErr } = await supabaseClient
        .from('students')
        .delete()
        .eq('id', studentId);

      if (studentErr) throw studentErr;

      // 9. Audit log
      try {
        await AuthModule.logAudit('delete_student', 'students', studentId, { name: studentName });
      } catch (_) {}

      Utils.showToast("Student Deleted", `${studentName} was permanently deleted.`, "success");

      // 10. Close modal if open
      Utils.closeModal('modal-add-student');

      // 11. Refresh all stores
      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();
      await PaymentsModule.loadPayments();
      if (typeof ReceiptsModule !== 'undefined' && ReceiptsModule.loadReceipts) {
        await ReceiptsModule.loadReceipts();
      }
      StudentsModule.renderStudentsTable();

      // 12. If currently viewing this student's profile, navigate back to directory
      if (StudentsModule.currentProfileStudentId === studentId || window.location.hash.includes('student-profile')) {
        StudentsModule.currentProfileStudentId = null;
        window.location.hash = '#students';
      }
    } catch (err) {
      console.error("Delete student error:", err);
      Utils.showToast("Error", err.message || "Failed to delete student record", "error");
    }
  },

  // Discontinue an individual enrolment
  discontinueEnrollment: async (enrollmentId) => {
    if (confirm("Are you sure you want to discontinue this programme enrolment? Future invoices will not include this fee.")) {
      try {
        // Try 'cancelled' first (supported by PostgreSQL check constraint)
        let { error } = await supabaseClient
          .from('enrollments')
          .update({
            status: 'cancelled',
            end_date: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString()
          })
          .eq('id', enrollmentId);

        if (error) {
          // Fallback to 'discontinued'
          const fb = await supabaseClient
            .from('enrollments')
            .update({
              status: 'discontinued',
              end_date: new Date().toISOString().slice(0, 10),
              updated_at: new Date().toISOString()
            })
            .eq('id', enrollmentId);
          if (fb.error) throw fb.error;
        }

        try {
          await AuthModule.logAudit('discontinue_enrollment', 'enrollments', enrollmentId, {});
        } catch (_) {}

        Utils.showToast("Discontinued", "Programme enrolment discontinued successfully", "success");
        await StudentsModule.loadStudents();
        if (StudentsModule.currentProfileStudentId) {
          await StudentsModule.viewProfile(StudentsModule.currentProfileStudentId);
        }
      } catch (err) {
        console.error("Discontinue error:", err);
        Utils.showToast("Error", err.message || "Failed to discontinue programme", "error");
      }
    }
  }
};

window.StudentsModule = StudentsModule;
