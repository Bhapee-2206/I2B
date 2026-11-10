/**
 * EDUTRACK STUDENT PROMOTION MODULE
 * Strictly Manual Academic Promotion, Persistent Class History & Fee Upgrades
 */

const PromotionsModule = {
  selectedEnrollmentForPromotion: null,

  init: async () => {
    PromotionsModule.populateAcademicYears();
  },

  // Populate dynamic academic years from AppState
  populateAcademicYears: () => {
    const sel = document.getElementById('promotion-academic-year-select');
    if (!sel) return;

    const years = AppState.academicYears || [];
    if (years.length === 0) {
      sel.innerHTML = `<option value="2026-2027" selected>2026 – 2027</option>`;
      return;
    }

    sel.innerHTML = years.map(ay => `
      <option value="${ay.year_name}" ${ay.is_active ? 'selected' : ''}>
        ${Utils.escapeHtml(ay.year_name)} ${ay.is_active ? '(Active)' : ''}
      </option>
    `).join('');
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
          <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
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
          <td><strong>${Utils.escapeHtml(s.student_id)}</strong></td>
          <td><strong>${Utils.escapeHtml(s.name)}</strong></td>
          <td><span class="badge badge-info">${Utils.escapeHtml(progName)}</span></td>
          <td>
            <strong style="color: var(--accent-blue);">${Utils.escapeHtml(e.class_or_grade)}</strong>
            ${e.board ? `<span style="font-size: 0.75rem; color: var(--text-muted);"> (${Utils.escapeHtml(e.board)})</span>` : ''}
          </td>
          <td><strong>${Utils.formatCurrency(e.agreed_fee)}</strong> / mo</td>
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
    PromotionsModule.selectedEnrollmentStudent = targetStudent;

    const progName = targetEnrollment.programmes?.name || 'Programme';
    const isHindi = progName.toLowerCase().includes('hindi');

    document.getElementById('promo-modal-student-name').textContent = targetStudent.name;
    document.getElementById('promo-modal-student-id').textContent = targetStudent.student_id;
    document.getElementById('promo-modal-programme').textContent = progName;

    // Format current level
    let currentDisplay = targetEnrollment.class_or_grade;
    if (isHindi) {
      const code = FeesModule.normalizeHindiLevel(targetEnrollment.class_or_grade);
      const hl = FeesModule.HINDI_LEVELS.find(l => l.code === code);
      currentDisplay = hl ? hl.label : targetEnrollment.class_or_grade;
    } else {
      currentDisplay = FeesModule.normalizeSubjectClass(targetEnrollment.class_or_grade);
    }
    document.getElementById('promo-modal-current-class').textContent = currentDisplay;
    document.getElementById('promo-modal-current-fee').textContent = Utils.formatCurrency(targetEnrollment.agreed_fee);

    // Populate class / level options dynamically
    const classSel = document.getElementById('promo-new-class-select');
    const boardSel = document.getElementById('promo-new-board-select');

    if (isHindi) {
      classSel.innerHTML = '<option value="">Select New Hindi Level</option>' + 
        FeesModule.HINDI_LEVELS.map(l => `
          <option value="${l.code}">${l.label}</option>
        `).join('');

      const targetBoard = (targetEnrollment.board || 'Virtual').toLowerCase() === 'online' ? 'Online' : 'Virtual';
      boardSel.innerHTML = `
        <option value="Virtual" ${targetBoard === 'Virtual' ? 'selected' : ''}>Virtual</option>
        <option value="Online" ${targetBoard === 'Online' ? 'selected' : ''}>Online</option>
      `;
    } else {
      classSel.innerHTML = '<option value="">Select New School Class</option>' + 
        FeesModule.SUBJECT_CLASSES.map(c => {
          const code = typeof c === 'object' ? c.code : c;
          const name = typeof c === 'object' ? c.name : c;
          return `<option value="${code}">${name}</option>`;
        }).join('');

      const targetBoard = (targetEnrollment.board || 'Matric').toUpperCase() === 'CBSE' ? 'CBSE' : 'Matric';
      boardSel.innerHTML = `
        <option value="Matric" ${targetBoard === 'Matric' ? 'selected' : ''}>Matric</option>
        <option value="CBSE" ${targetBoard === 'CBSE' ? 'selected' : ''}>CBSE</option>
      `;
    }

    document.getElementById('promo-new-fee-input').value = '';
    document.getElementById('promo-auto-fee-hint').textContent = isHindi ? 'Select new level to calculate fee' : 'Select new class to calculate fee';
    document.getElementById('promo-auto-fee-hint').style.color = 'var(--text-muted)';

    Utils.openModal('modal-promote-student');
  },

  // EXACT MATCH fee lookup for target promotion class
  onPromotionClassChange: () => {
    const e = PromotionsModule.selectedEnrollmentForPromotion;
    if (!e) return;

    const progName = e.programmes?.name || '';
    const isHindi = progName.toLowerCase().includes('hindi');
    const cat = isHindi ? 'HINDI' : 'SUBJECT';

    const newClass = document.getElementById('promo-new-class-select').value;
    const newBoard = document.getElementById('promo-new-board-select').value;
    const feeInput = document.getElementById('promo-new-fee-input');
    const hint = document.getElementById('promo-auto-fee-hint');

    if (!newClass) {
      feeInput.value = '';
      hint.textContent = isHindi ? 'Select new level to calculate fee' : 'Select new class to calculate fee';
      hint.style.color = 'var(--text-muted)';
      return;
    }

    const lookup = FeesModule.lookupRate(cat, newBoard, newClass);
    if (lookup.success && lookup.monthly_fee) {
      feeInput.value = lookup.monthly_fee;
      hint.textContent = `✓ Standard fee for ${newClass} (${newBoard}): ₹${lookup.monthly_fee}/mo`;
      hint.style.color = 'var(--status-paid)';
    } else {
      hint.textContent = `⚠️ Rate not configured for ${newBoard} - ${newClass}. Please enter manually.`;
      hint.style.color = 'var(--status-pending)';
    }
  },

  // Confirm and Execute Individual Promotion (Saves to class_history!)
  confirmPromotion: async (ev) => {
    ev.preventDefault();
    const en = PromotionsModule.selectedEnrollmentForPromotion;
    const student = PromotionsModule.selectedEnrollmentStudent;
    if (!en || !student) return;

    const newClass = document.getElementById('promo-new-class-select').value;
    const newBoard = document.getElementById('promo-new-board-select').value;
    const newFee = parseFloat(document.getElementById('promo-new-fee-input').value) || 0;
    const notes = document.getElementById('promo-notes-input').value.trim();
    const academicYear = document.getElementById('promotion-academic-year-select')?.value || AppState.activeAcademicYear;

    if (!newClass || newFee <= 0) {
      Utils.showToast("Validation", "Please specify the new class and monthly fee", "warning");
      return;
    }

    try {
      // 1. Update enrollment class, board & agreed_fee (applies to future billing)
      const { error: enErr } = await supabaseClient
        .from('enrollments')
        .update({
          class_or_grade: newClass,
          board: newBoard,
          agreed_fee: newFee,
          notes: notes ? `Promoted from ${en.class_or_grade} to ${newClass}. Note: ${notes}` : `Promoted from ${en.class_or_grade}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', en.id);

      if (enErr) throw enErr;

      // 2. Insert record into class_history table
      try {
        await supabaseClient
          .from('class_history')
          .insert([{
            student_id: student.id,
            enrollment_id: en.id,
            old_class: en.class_or_grade,
            new_class: newClass,
            old_board: en.board,
            new_board: newBoard,
            old_fee: en.agreed_fee,
            new_fee: newFee,
            effective_date: new Date().toISOString().slice(0, 10),
            notes: notes || `Academic promotion for ${academicYear}`,
            created_at: new Date().toISOString()
          }]);
      } catch (histEx) {
        console.warn("Class history insert notice (table might be migrating):", histEx);
      }

      await AuthModule.logAudit('promote_student', 'enrollments', en.id, {
        oldClass: en.class_or_grade,
        newClass,
        oldFee: en.agreed_fee,
        newFee,
        academicYear
      });

      Utils.closeModal('modal-promote-student');
      Utils.showToast("Promoted Successfully", `${student.name} promoted to ${newClass}. Future invoices will apply ₹${newFee}/mo.`, "success");

      await StudentsModule.loadStudents();
      PromotionsModule.renderPromotionTable();

    } catch (err) {
      console.error("Promotion error:", err);
      Utils.showToast("Error", "Failed to confirm student promotion", "error");
    }
  }
};

window.PromotionsModule = PromotionsModule;
