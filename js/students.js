/**
 * EDUTRACK STUDENT MANAGEMENT MODULE
 * Multi-Programme Single-Form Registration, Student Directory & Comprehensive Profile
 */

const StudentsModule = {
  activeProgrammeRowCount: 0,
  currentProfileStudentId: null,

  init: async () => {
    await StudentsModule.loadStudents();
  },

  // Load students with enrollments and payments
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

  // Calculate combined monthly fee for a student
  calculateMonthlyFee: (student) => {
    if (!student || !student.enrollments) return 0;
    return student.enrollments
      .filter(e => e.status === 'active')
      .reduce((sum, e) => sum + (parseFloat(e.agreed_fee) || 0), 0);
  },

  // Calculate outstanding balance across all invoices
  calculateOutstandingBalance: (student) => {
    if (!student || !student.invoices || student.invoices.length === 0) {
      // If no invoices generated yet, the pending balance is their current combined monthly fee
      return StudentsModule.calculateMonthlyFee(student);
    }
    return student.invoices
      .filter(inv => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + (parseFloat(inv.balance_amount) || 0), 0);
  },

  // Determine overall payment status for student
  getPaymentStatus: (student) => {
    const monthlyFee = StudentsModule.calculateMonthlyFee(student);
    if (!student.invoices || student.invoices.length === 0) {
      return { status: 'unpaid', label: 'Unpaid', class: 'badge-unpaid' };
    }

    // Check latest invoice
    const activeInvoices = student.invoices
      .filter(inv => inv.status !== 'cancelled')
      .sort((a, b) => (b.billing_year * 100 + b.billing_month) - (a.billing_year * 100 + a.billing_month));

    if (activeInvoices.length === 0) {
      return { status: 'unpaid', label: 'Unpaid', class: 'badge-unpaid' };
    }

    const latest = activeInvoices[0];
    if (latest.status === 'paid' || latest.balance_amount <= 0) {
      return { status: 'paid', label: 'Paid', class: 'badge-paid' };
    } else if (latest.paid_amount > 0) {
      return { status: 'partially_paid', label: 'Partial', class: 'badge-partial' };
    } else {
      return { status: 'unpaid', label: 'Unpaid', class: 'badge-unpaid' };
    }
  },

  // Render Student Directory Table
  renderStudentsTable: () => {
    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('student-search-input')?.value || '').trim().toLowerCase();
    const filterProg = document.getElementById('student-filter-programme')?.value || '';
    const filterStatus = document.getElementById('student-filter-status')?.value || '';
    const filterPayment = document.getElementById('student-filter-payment')?.value || '';

    let list = AppState.students || [];

    // Apply Search
    if (searchTerm) {
      list = list.filter(s => 
        (s.name && s.name.toLowerCase().includes(searchTerm)) ||
        (s.student_id && s.student_id.toLowerCase().includes(searchTerm)) ||
        (s.parent_name && s.parent_name.toLowerCase().includes(searchTerm)) ||
        (s.whatsapp_number && s.whatsapp_number.includes(searchTerm))
      );
    }

    // Apply Filters
    if (filterProg) {
      list = list.filter(s => s.enrollments?.some(e => e.status === 'active' && e.programme_id === filterProg));
    }
    if (filterStatus) {
      list = list.filter(s => s.status === filterStatus);
    }
    if (filterPayment) {
      list = list.filter(s => StudentsModule.getPaymentStatus(s).status === filterPayment);
    }

    // Update Counter
    const countBadge = document.getElementById('student-count-badge');
    if (countBadge) countBadge.textContent = `${list.length} student${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding: 3rem 1rem;">
            <div class="empty-state">
              <i data-lucide="users" class="empty-state-icon"></i>
              <div class="empty-state-title">No students found</div>
              <div class="empty-state-text">Try adjusting your search filters or click 'Add Student' to register.</div>
            </div>
          </td>
        </tr>`;
      Utils.renderIcons();
      return;
    }

    tbody.innerHTML = list.map(s => {
      const activeEnrollments = (s.enrollments || []).filter(e => e.status === 'active');
      const monthlyFee = StudentsModule.calculateMonthlyFee(s);
      const pendingBal = StudentsModule.calculateOutstandingBalance(s);
      const payStatus = StudentsModule.getPaymentStatus(s);

      // Program tags preview
      const progBadges = activeEnrollments.length > 0
        ? activeEnrollments.map(e => `
            <span class="badge badge-programme" style="margin: 2px 2px 2px 0;">
              ${Utils.escapeHtml(e.programmes?.name || 'Prog')} (${Utils.escapeHtml(e.class_or_grade)})
            </span>
          `).join('')
        : '<span class="text-muted" style="font-size:0.8rem;">No active programmes</span>';

      return `
        <tr>
          <td>
            <strong>${Utils.escapeHtml(s.student_id || '—')}</strong>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.92rem;">
              <a href="#student-profile" onclick="StudentsModule.viewProfile('${s.id}')" style="color: var(--accent); text-decoration: underline;">
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
            ` : '—'}
          </td>
          <td>
            <div style="display: flex; flex-wrap: wrap; max-width: 240px;">
              ${progBadges}
            </div>
          </td>
          <td>
            <strong style="font-size: 0.95rem;">${Utils.formatCurrency(monthlyFee)}</strong> / mo
          </td>
          <td>
            <span style="font-weight: 700; color: ${pendingBal > 0 ? 'var(--danger)' : 'var(--success)'};">
              ${Utils.formatCurrency(pendingBal)}
            </span>
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
            <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${s.id}')" title="Record Payment">
              <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect
            </button>
          </td>
        </tr>
      `;
    }).join('');

    Utils.renderIcons();
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
    Utils.openModal('modal-add-student');
  },

  // Add dynamic programme row in registration form
  addProgrammeRow: (initialData = null) => {
    StudentsModule.activeProgrammeRowCount++;
    const rowId = `prog-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const container = document.getElementById('programme-rows-container');

    const progOptions = (AppState.programmes || []).map(p => `
      <option value="${p.id}" ${initialData && initialData.programme_id === p.id ? 'selected' : ''}>
        ${Utils.escapeHtml(p.name)}
      </option>
    `).join('');

    const row = document.createElement('div');
    row.className = 'programme-entry-row';
    row.id = rowId;
    row.style.cssText = `
      background: var(--surface-alt);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 0.85rem;
      position: relative;
    `;

    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
        <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent);">
          Programme #${container.children.length + 1}
        </span>
        <button type="button" class="btn btn-secondary btn-sm" onclick="StudentsModule.removeProgrammeRow('${rowId}')" title="Remove Programme" style="color: var(--danger); padding: 0.2rem 0.5rem;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Remove
        </button>
      </div>

      <div class="form-row">
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Programme <span class="required">*</span></label>
          <select class="form-control prog-select" onchange="StudentsModule.onProgrammeFieldChange('${rowId}')" required>
            <option value="">Select Programme</option>
            ${progOptions}
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Class / Grade <span class="required">*</span></label>
          <select class="form-control prog-class-select" onchange="StudentsModule.onProgrammeFieldChange('${rowId}')" required>
            <option value="">Select Class</option>
            <option value="LKG">LKG</option>
            <option value="UKG">UKG</option>
            <option value="1st">1st Standard</option>
            <option value="2nd">2nd Standard</option>
            <option value="3rd">3rd Standard</option>
            <option value="4th">4th Standard</option>
            <option value="5th">5th Standard</option>
            <option value="6th">6th Standard</option>
            <option value="7th">7th Standard</option>
            <option value="8th">8th Standard</option>
            <option value="9th">9th Standard</option>
            <option value="10th">10th Standard</option>
            <option value="11th">11th Standard</option>
            <option value="12th">12th Standard</option>
            <option value="Basic">Basic (Hindi)</option>
            <option value="school">School (Hindi)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Board / Mode</label>
          <select class="form-control prog-board-select" onchange="StudentsModule.onProgrammeFieldChange('${rowId}')">
            <option value="Matric">Matric</option>
            <option value="CBSE">CBSE</option>
            <option value="Virtual">Virtual / Classroom</option>
            <option value="Online">Online</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Monthly Fee (₹) <span class="required">*</span></label>
          <div style="display: flex; gap: 0.35rem;">
            <input type="number" class="form-control prog-fee-input" placeholder="0" min="0" oninput="StudentsModule.onFeeManualOverride('${rowId}')" required>
          </div>
          <div class="form-hint fee-auto-hint" style="font-size: 0.72rem; color: var(--accent);">Auto-fetched from fee structure</div>
        </div>
      </div>

      <div class="form-row override-reason-wrap" style="display: none; margin-top: 0.35rem;">
        <div class="form-group" style="grid-column: 1 / -1; margin-bottom: 0;">
          <input type="text" class="form-control prog-override-reason" placeholder="Reason for fee override (optional)">
        </div>
      </div>
    `;

    container.appendChild(row);
    Utils.renderIcons();

    if (initialData) {
      const select = row.querySelector('.prog-select');
      const classSelect = row.querySelector('.prog-class-select');
      const boardSelect = row.querySelector('.prog-board-select');
      const feeInput = row.querySelector('.prog-fee-input');

      if (select) select.value = initialData.programme_id;
      if (classSelect) classSelect.value = initialData.class_or_grade;
      if (boardSelect) boardSelect.value = initialData.board || 'Matric';
      if (feeInput) feeInput.value = initialData.agreed_fee;
    }

    StudentsModule.updateCombinedFeePreview();
  },

  // Remove a programme row
  removeProgrammeRow: (rowId) => {
    const container = document.getElementById('programme-rows-container');
    if (container.children.length <= 1) {
      Utils.showToast("Note", "A student must have at least one programme enrolment.", "warning");
      return;
    }
    const row = document.getElementById(rowId);
    if (row) row.remove();

    // Renumber remaining rows
    Array.from(container.children).forEach((child, idx) => {
      const titleSpan = child.querySelector('span');
      if (titleSpan) titleSpan.textContent = `Programme #${idx + 1}`;
    });

    StudentsModule.updateCombinedFeePreview();
  },

  // Triggered when Programme, Class, or Board changes in a row
  onProgrammeFieldChange: (rowId) => {
    const row = document.getElementById(rowId);
    if (!row) return;

    const progId = row.querySelector('.prog-select').value;
    const grade = row.querySelector('.prog-class-select').value;
    const board = row.querySelector('.prog-board-select').value;
    const feeInput = row.querySelector('.prog-fee-input');
    const hint = row.querySelector('.fee-auto-hint');

    if (!progId || !grade) {
      feeInput.value = '';
      hint.textContent = 'Select programme & class to fetch fee';
      hint.style.color = 'var(--text-muted)';
      StudentsModule.updateCombinedFeePreview();
      return;
    }

    const fetchedFee = FeesModule.lookupFee(progId, grade, board);
    if (fetchedFee !== null && fetchedFee !== undefined) {
      feeInput.value = fetchedFee;
      hint.textContent = `✓ Standard fee: ₹${fetchedFee}`;
      hint.style.color = 'var(--success)';
      row.dataset.standardFee = fetchedFee;
    } else {
      hint.textContent = '⚠️ No matching fee structure found. Please set manually.';
      hint.style.color = 'var(--warning)';
    }

    StudentsModule.updateCombinedFeePreview();
  },

  // When admin overrides the auto-fetched fee
  onFeeManualOverride: (rowId) => {
    const row = document.getElementById(rowId);
    if (!row) return;
    const standardFee = parseFloat(row.dataset.standardFee) || 0;
    const currentFee = parseFloat(row.querySelector('.prog-fee-input').value) || 0;
    const overrideWrap = row.querySelector('.override-reason-wrap');

    if (standardFee > 0 && currentFee !== standardFee) {
      if (overrideWrap) overrideWrap.style.display = 'block';
    }
    StudentsModule.updateCombinedFeePreview();
  },

  // Recalculate combined monthly fee in registration form
  updateCombinedFeePreview: () => {
    const container = document.getElementById('programme-rows-container');
    if (!container) return;

    let total = 0;
    const breakdown = [];

    Array.from(container.children).forEach(row => {
      const progSelect = row.querySelector('.prog-select');
      const classSelect = row.querySelector('.prog-class-select');
      const feeInput = row.querySelector('.prog-fee-input');

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

  // Save Student and Enrolments (PART 3: STATUS UNPAID, NO IMMEDIATE PAYMENT)
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

    if (!name) {
      Utils.showToast("Validation Error", "Student Name is required", "warning");
      return;
    }
    if (!whatsapp_number) {
      Utils.showToast("Validation Error", "Parent WhatsApp Number is required", "warning");
      return;
    }

    // Extract dynamic programme rows
    const container = document.getElementById('programme-rows-container');
    const selectedProgrammes = [];
    const seenProgIds = new Set();

    for (const row of Array.from(container.children)) {
      const progId = row.querySelector('.prog-select').value;
      const grade = row.querySelector('.prog-class-select').value;
      const board = row.querySelector('.prog-board-select').value;
      const fee = parseFloat(row.querySelector('.prog-fee-input').value) || 0;
      const overrideReason = row.querySelector('.prog-override-reason')?.value.trim() || '';

      if (!progId || !grade) {
        Utils.showToast("Validation Error", "Please complete all programme details", "warning");
        return;
      }

      if (seenProgIds.has(progId)) {
        Utils.showToast("Duplicate Error", "A student cannot have multiple active enrolments in the same programme", "error");
        return;
      }
      seenProgIds.add(progId);

      selectedProgrammes.push({
        programme_id: progId,
        class_or_grade: grade,
        board,
        agreed_fee: fee,
        notes: overrideReason ? `Fee override reason: ${overrideReason}` : ''
      });
    }

    if (selectedProgrammes.length === 0) {
      Utils.showToast("Validation Error", "Please select at least one programme enrolment", "warning");
      return;
    }

    try {
      let savedStudentId = studentId;

      if (!studentId) {
        // Create new student
        const studentCode = document.getElementById('student-code-preview').textContent || Utils.getNextStudentId(AppState.students);
        const studentPayload = {
          student_id: studentCode,
          name,
          parent_name,
          whatsapp_number,
          alt_phone,
          address,
          notes,
          status,
          admission_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newStudent, error: sErr } = await supabaseClient
          .from('students')
          .insert([studentPayload])
          .select();

        if (sErr) throw sErr;
        savedStudentId = newStudent[0].id;
        await AuthModule.logAudit('register_student', 'students', savedStudentId, studentPayload);

        // Insert programme enrolments
        const enrollmentRows = selectedProgrammes.map(p => ({
          student_id: savedStudentId,
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
        }));

        const { error: eErr } = await supabaseClient
          .from('enrollments')
          .insert(enrollmentRows);

        if (eErr) throw eErr;

        // Auto-generate initial invoice for current month (Status: UNPAID)
        const now = new Date();
        const curMonth = now.getMonth() + 1;
        const curYear = now.getFullYear();
        const totalFee = selectedProgrammes.reduce((sum, p) => sum + p.agreed_fee, 0);

        const invPayload = {
          invoice_number: Utils.getNextInvoiceNumber(studentCode, curMonth, curYear),
          student_id: savedStudentId,
          billing_month: curMonth,
          billing_year: curYear,
          invoice_date: now.toISOString().slice(0, 10),
          due_date: `${curYear}-${String(curMonth).padStart(2, '0')}-${String(AppState.institution?.default_due_day || 10).padStart(2, '0')}`,
          total_amount: totalFee,
          paid_amount: 0,
          balance_amount: totalFee,
          status: 'unpaid',
          notes: 'Initial monthly fee on student registration'
        };

        const { data: createdInv } = await supabaseClient
          .from('invoices')
          .insert([invPayload])
          .select();

        if (createdInv && createdInv[0]) {
          // Insert invoice items
          const items = selectedProgrammes.map(p => ({
            invoice_id: createdInv[0].id,
            programme_id: p.programme_id,
            class_or_grade: p.class_or_grade,
            description: `${AppState.programmes.find(prog => prog.id === p.programme_id)?.name || 'Tuition'} (${p.class_or_grade})`,
            amount: p.agreed_fee
          }));
          await supabaseClient.from('invoice_items').insert(items);
        }

        Utils.closeModal('modal-add-student');
        Utils.showToast("Registered Successfully", `Student registered with UNPAID status. Monthly fee: ₹${totalFee}`, "success", 6000);

      } else {
        // Update existing student details
        const updatePayload = {
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
          .update(updatePayload)
          .eq('id', studentId);

        if (uErr) throw uErr;
        await AuthModule.logAudit('update_student', 'students', studentId, updatePayload);

        Utils.closeModal('modal-add-student');
        Utils.showToast("Updated", "Student profile updated successfully", "success");
      }

      await StudentsModule.loadStudents();
      StudentsModule.renderStudentsTable();

      if (savedStudentId) {
        StudentsModule.viewProfile(savedStudentId);
      }

    } catch (err) {
      console.error("Save student error:", err);
      Utils.showToast("Error", err.message || "Failed to register student", "error");
    }
  },

  // Open Full Student Profile View
  viewProfile: async (studentId) => {
    StudentsModule.currentProfileStudentId = studentId;
    window.location.hash = "#student-profile";

    const student = AppState.students.find(s => s.id === studentId);
    if (!student) return;

    // Fetch full student details with payments, invoices & receipts
    const { data: fullStudent, error } = await supabaseClient
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

    // Populate Personal Details
    document.getElementById('profile-student-name').textContent = s.name;
    document.getElementById('profile-student-id').textContent = s.student_id;
    document.getElementById('profile-parent-name').textContent = s.parent_name || 'Not provided';
    document.getElementById('profile-whatsapp').textContent = s.whatsapp_number || 'Not provided';
    document.getElementById('profile-phone-alt').textContent = s.alt_phone || 'None';
    document.getElementById('profile-address').textContent = s.address || 'Not provided';
    document.getElementById('profile-admission-date').textContent = Utils.formatDate(s.admission_date);

    // Status Badge
    const statusBadge = document.getElementById('profile-status-badge');
    statusBadge.className = `badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}`;
    statusBadge.innerHTML = `<span class="badge-dot"></span> ${s.status === 'active' ? 'Active' : 'Inactive'}`;

    // WhatsApp Action Link
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

    // Render Enrolments
    const enrollmentsContainer = document.getElementById('profile-enrollments-list');
    if (enrollmentsContainer) {
      if (!s.enrollments || s.enrollments.length === 0) {
        enrollmentsContainer.innerHTML = `<div class="text-muted" style="padding: 1rem;">No programme enrolments recorded.</div>`;
      } else {
        enrollmentsContainer.innerHTML = s.enrollments.map(e => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <strong style="font-size: 0.95rem; color: var(--text-main);">${Utils.escapeHtml(e.programmes?.name || 'Programme')}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                Class: <strong>${Utils.escapeHtml(e.class_or_grade)}</strong> 
                ${e.board ? `| Board: ${Utils.escapeHtml(e.board)}` : ''} 
                | Enrolled: ${Utils.formatDate(e.start_date)}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <strong style="color: var(--accent); font-size: 1rem;">${Utils.formatCurrency(e.agreed_fee)}/mo</strong>
              <span class="badge ${e.status === 'active' ? 'badge-active' : 'badge-inactive'}">${e.status}</span>
              ${e.status === 'active' ? `
                <button class="btn btn-secondary btn-sm" onclick="StudentsModule.discontinueEnrollment('${e.id}')" style="color: var(--danger);">
                  Discontinue
                </button>
              ` : ''}
            </div>
          </div>
        `).join('');
      }
    }

    // Render Invoices Table
    const invoicesBody = document.getElementById('profile-invoices-body');
    if (invoicesBody) {
      const invs = s.invoices || [];
      if (invs.length === 0) {
        invoicesBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 1.5rem; color: var(--text-muted);">No invoices generated yet.</td></tr>`;
      } else {
        invoicesBody.innerHTML = invs.map(inv => `
          <tr>
            <td><strong>${Utils.escapeHtml(inv.invoice_number)}</strong></td>
            <td>${Utils.formatMonthYear(inv.billing_month, inv.billing_year)}</td>
            <td>${Utils.formatCurrency(inv.total_amount)}</td>
            <td>${Utils.formatCurrency(inv.paid_amount)}</td>
            <td><strong style="color: ${inv.balance_amount > 0 ? 'var(--danger)' : 'var(--success)'};">${Utils.formatCurrency(inv.balance_amount)}</strong></td>
            <td>
              <span class="badge ${inv.status === 'paid' ? 'badge-paid' : (inv.status === 'partially_paid' ? 'badge-partial' : 'badge-unpaid')}">
                ${inv.status}
              </span>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Payments & Receipts History
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
              <td><strong style="color: var(--success);">${Utils.formatCurrency(p.amount)}</strong></td>
              <td><span class="badge badge-neutral">${Utils.escapeHtml(p.payment_method)}</span></td>
              <td>${r ? `<code>${Utils.escapeHtml(r.receipt_number)}</code>` : '—'}</td>
              <td class="actions-cell">
                ${r ? `
                  <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${r.id}')">
                    <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> Receipt
                  </button>
                ` : ''}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    Utils.renderIcons();
  },

  // Edit Student from Profile
  editCurrentStudent: () => {
    const student = AppState.students.find(s => s.id === StudentsModule.currentProfileStudentId);
    if (!student) return;

    document.getElementById('student-form-id').value = student.id;
    document.getElementById('student-code-preview').textContent = student.student_id;
    document.getElementById('student-name-input').value = student.name;
    document.getElementById('student-parent-input').value = student.parent_name || '';
    document.getElementById('student-phone-input').value = student.whatsapp_number || '';
    document.getElementById('student-alt-phone-input').value = student.alt_phone || '';
    document.getElementById('student-address-input').value = student.address || '';
    document.getElementById('student-notes-input').value = student.notes || '';
    document.getElementById('student-status-select').value = student.status;

    // Populate existing programmes
    const container = document.getElementById('programme-rows-container');
    container.innerHTML = '';
    (student.enrollments || []).forEach(e => {
      StudentsModule.addProgrammeRow(e);
    });

    document.getElementById('student-modal-title').textContent = 'Edit Student Profile';
    Utils.openModal('modal-add-student');
  },

  // Discontinue an individual programme enrolment
  discontinueEnrollment: async (enrollmentId) => {
    if (confirm("Are you sure you want to discontinue this programme enrolment? Future invoices will not include this fee.")) {
      try {
        const { error } = await supabaseClient
          .from('enrollments')
          .update({
            status: 'discontinued',
            end_date: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString()
          })
          .eq('id', enrollmentId);

        if (error) throw error;
        await AuthModule.logAudit('discontinue_enrollment', 'enrollments', enrollmentId, {});
        Utils.showToast("Discontinued", "Programme enrolment discontinued", "info");
        await StudentsModule.loadStudents();
        StudentsModule.viewProfile(StudentsModule.currentProfileStudentId);
      } catch (err) {
        Utils.showToast("Error", "Failed to discontinue programme", "error");
      }
    }
  }
};

window.StudentsModule = StudentsModule;
