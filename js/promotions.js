/**
 * EDUTRACK STUDENT PROMOTION MODULE
 * Strictly Manual Academic Promotion, Fee Upgrades & Academic Year Management
 */

const PromotionsModule = {
  selectedEnrollmentForPromotion: null,

  init: async () => {
    PromotionsModule.populateAcademicYears();
  },

  populateAcademicYears: () => {
    const sel = document.getElementById('promotion-academic-year-select');
    if (sel) {
      sel.innerHTML = `
        <option value="2026-2027" selected>2026 – 2027 (Active)</option>
        <option value="2027-2028">2027 – 2028</option>
        <option value="2025-2026">2025 – 2026</option>
      `;
    }
  },

  // Render Promotion Candidates Table
  renderPromotionTable: () => {
    const tbody = document.getElementById('promotion-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('promotion-search-input')?.value || '').trim().toLowerCase();
    const progFilter = document.getElementById('promotion-filter-prog')?.value || '';

    let list = [];
    (AppState.students || []).forEach(student => {
      if (student.status !== 'active') return;
      (student.enrollments || []).forEach(e => {
        if (e.status !== 'active') return;
        list.push({
          student,
          enrollment: e
        });
      });
    });

    if (searchTerm) {
      list = list.filter(item => 
        item.student.name.toLowerCase().includes(searchTerm) ||
        item.student.student_id.toLowerCase().includes(searchTerm)
      );
    }

    if (progFilter) {
      list = list.filter(item => item.enrollment.programme_id === progFilter);
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
            No active student enrolments found matching your criteria.
          </td>
        </tr>`;
      Utils.renderIcons();
      return;
    }

    tbody.innerHTML = list.map(item => {
      const s = item.student;
      const e = item.enrollment;
      const progName = e.programmes?.name || 'Programme';

      return `
        <tr>
          <td>
            <input type="checkbox" class="promotion-select-checkbox" value="${e.id}" data-student-id="${s.id}">
          </td>
          <td>
            <strong>${Utils.escapeHtml(s.student_id)}</strong>
          </td>
          <td>
            <strong>${Utils.escapeHtml(s.name)}</strong>
          </td>
          <td>
            <span class="badge badge-info">${Utils.escapeHtml(progName)}</span>
          </td>
          <td>
            <strong style="color: var(--accent);">${Utils.escapeHtml(e.class_or_grade)}</strong>
            ${e.board ? `<span style="font-size: 0.75rem; color: var(--text-muted);"> (${Utils.escapeHtml(e.board)})</span>` : ''}
          </td>
          <td>
            <strong>${Utils.formatCurrency(e.agreed_fee)}</strong> / mo
          </td>
          <td class="actions-cell">
            <button class="btn btn-primary btn-sm" onclick="PromotionsModule.openIndividualPromotionModal('${e.id}')">
              <i data-lucide="trending-up" style="width: 14px; height: 14px;"></i> Promote
            </button>
          </td>
        </tr>
      `;
    }).join('');

    Utils.renderIcons();
  },

  // Open Individual Promotion Modal
  openIndividualPromotionModal: (enrollmentId) => {
    let targetEnrollment = null;
    let targetStudent = null;

    for (const s of AppState.students) {
      const e = (s.enrollments || []).find(en => en.id === enrollmentId);
      if (e) {
        targetEnrollment = e;
        targetStudent = s;
        break;
      }
    }

    if (!targetEnrollment) return;
    PromotionsModule.selectedEnrollmentForPromotion = targetEnrollment;

    document.getElementById('promo-modal-student-name').textContent = targetStudent.name;
    document.getElementById('promo-modal-student-id').textContent = targetStudent.student_id;
    document.getElementById('promo-modal-programme').textContent = targetEnrollment.programmes?.name || 'Programme';
    document.getElementById('promo-modal-current-class').textContent = targetEnrollment.class_or_grade;
    document.getElementById('promo-modal-current-fee').textContent = Utils.formatCurrency(targetEnrollment.agreed_fee);

    document.getElementById('promo-new-class-select').value = '';
    document.getElementById('promo-new-board-select').value = targetEnrollment.board || 'Matric';
    document.getElementById('promo-new-fee-input').value = '';
    document.getElementById('promo-auto-fee-hint').textContent = 'Select new class to calculate fee';

    Utils.openModal('modal-promote-student');
  },

  // Auto-fetch fee for the target promotion class
  onPromotionClassChange: () => {
    const e = PromotionsModule.selectedEnrollmentForPromotion;
    if (!e) return;

    const newClass = document.getElementById('promo-new-class-select').value;
    const newBoard = document.getElementById('promo-new-board-select').value;
    const feeInput = document.getElementById('promo-new-fee-input');
    const hint = document.getElementById('promo-auto-fee-hint');

    if (!newClass) {
      feeInput.value = '';
      hint.textContent = 'Select new class to calculate fee';
      return;
    }

    const fetchedFee = FeesModule.lookupFee(e.programme_id, newClass, newBoard);
    if (fetchedFee !== null) {
      feeInput.value = fetchedFee;
      hint.textContent = `✓ Standard fee for ${newClass}: ₹${fetchedFee}`;
      hint.style.color = 'var(--success)';
    } else {
      hint.textContent = '⚠️ No fee rule found for this class. Enter manually.';
      hint.style.color = 'var(--warning)';
    }
  },

  // Confirm and Execute Individual Promotion
  confirmPromotion: async (e) => {
    e.preventDefault();
    const en = PromotionsModule.selectedEnrollmentForPromotion;
    if (!en) return;

    const newClass = document.getElementById('promo-new-class-select').value;
    const newBoard = document.getElementById('promo-new-board-select').value;
    const newFee = parseFloat(document.getElementById('promo-new-fee-input').value) || 0;
    const notes = document.getElementById('promo-notes-input').value.trim();

    if (!newClass || newFee <= 0) {
      Utils.showToast("Validation Error", "Please specify the new class and monthly fee", "warning");
      return;
    }

    try {
      // Update enrollment class, board & agreed_fee
      const { error } = await supabaseClient
        .from('enrollments')
        .update({
          class_or_grade: newClass,
          board: newBoard,
          agreed_fee: newFee,
          notes: notes ? `Promoted from ${en.class_or_grade} (Old Fee: ₹${en.agreed_fee}). Note: ${notes}` : `Promoted from ${en.class_or_grade}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', en.id);

      if (error) throw error;

      await AuthModule.logAudit('promote_student', 'enrollments', en.id, {
        oldClass: en.class_or_grade,
        newClass,
        oldFee: en.agreed_fee,
        newFee
      });

      Utils.closeModal('modal-promote-student');
      Utils.showToast("Promoted Successfully", `Student promoted to ${newClass}. Future invoices will apply ₹${newFee}/mo.`, "success");

      await StudentsModule.loadStudents();
      PromotionsModule.renderPromotionTable();

    } catch (err) {
      console.error("Promotion error:", err);
      Utils.showToast("Error", "Failed to confirm student promotion", "error");
    }
  }
};

window.PromotionsModule = PromotionsModule;
