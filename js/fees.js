/**
 * EDUTRACK FEE STRUCTURE MODULE
 * Strict Exact Matching Lookup & Fee Matrix Management
 */

const FeesModule = {
  init: async () => {
    await FeesModule.loadFeeStructures();
  },

  // Load fee structures from Supabase
  loadFeeStructures: async () => {
    try {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from('fee_structures')
        .select('*, programmes(id, name, code)')
        .order('class_or_grade', { ascending: true });

      if (error) throw error;
      AppState.feeStructures = data || [];
      return AppState.feeStructures;
    } catch (err) {
      console.error("Error loading fee structures:", err);
      Utils.showToast("Error", "Failed to load fee structures", "error");
      return [];
    }
  },

  // Normalize grade string for consistent comparison (e.g. "5th", "5", "5.0")
  normalizeGrade: (val) => {
    if (!val) return '';
    return String(val).trim().toLowerCase().replace(/st|nd|rd|th|\.0$/g, '');
  },

  // EXACT MATCHING LOOKUP (Strictly no silent fallback to wrong boards!)
  lookupFee: (programmeId, classOrGrade, board = null) => {
    if (!programmeId || !classOrGrade) return null;

    const normGrade = FeesModule.normalizeGrade(classOrGrade);
    const normBoard = (board || '').trim().toLowerCase();

    // Exact lookup matching programme + normalized grade + board
    const exactMatch = AppState.feeStructures.find(fs => {
      if (!fs.is_active || fs.programme_id !== programmeId) return false;
      
      const fsGrade = FeesModule.normalizeGrade(fs.class_or_grade);
      const gradeMatches = (fsGrade === normGrade || fs.class_or_grade.toLowerCase() === classOrGrade.toLowerCase());
      if (!gradeMatches) return false;

      // If board is provided, must match board exactly
      if (normBoard) {
        return fs.board && fs.board.toLowerCase() === normBoard;
      } else {
        // If no board requested, matches if fs has no board or is universal
        return !fs.board;
      }
    });

    if (exactMatch) {
      return exactMatch.monthly_fee;
    }

    // Return null if no exact matching rule exists
    return null;
  },

  // Render the fee structure page table
  renderFeeStructureTable: (filteredProgrammeId = '') => {
    const tbody = document.getElementById('fee-structure-table-body');
    if (!tbody) return;

    let list = AppState.feeStructures || [];
    if (filteredProgrammeId) {
      list = list.filter(fs => fs.programme_id === filteredProgrammeId);
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
            No fee structure rules configured for this selection.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map(fs => {
      const progName = fs.programmes?.name || 'Programme';
      return `
        <tr>
          <td><span class="badge badge-info">${Utils.escapeHtml(progName)}</span></td>
          <td><strong>${Utils.escapeHtml(fs.class_or_grade)}</strong></td>
          <td>${fs.board ? `<span class="badge badge-neutral">${Utils.escapeHtml(fs.board)}</span>` : '<span class="text-muted">—</span>'}</td>
          <td><strong style="color: var(--text-main); font-size: 0.95rem;">${Utils.formatCurrency(fs.monthly_fee)}</strong> / mo</td>
          <td>
            <span class="badge ${fs.is_active ? 'badge-paid' : 'badge-neutral'}">
              <span class="badge-dot"></span>
              ${fs.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="actions-cell">
            <button class="btn btn-secondary btn-sm" onclick="FeesModule.editFeeStructure('${fs.id}')">
              <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Edit
            </button>
            <button class="btn ${fs.is_active ? 'btn-danger' : 'btn-success'} btn-sm" onclick="FeesModule.toggleFeeStatus('${fs.id}', ${fs.is_active})">
              ${fs.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    Utils.renderIcons();
  },

  // Open modal to add a new fee rule
  openAddModal: () => {
    document.getElementById('fee-form-id').value = '';
    document.getElementById('fee-class').value = '';
    document.getElementById('fee-board').value = 'Matric';
    document.getElementById('fee-amount').value = '';
    document.getElementById('fee-status').checked = true;
    document.getElementById('fee-modal-title').textContent = 'Add Fee Structure Rule';

    // Populate programme dropdown
    const select = document.getElementById('fee-programme-select');
    select.innerHTML = (AppState.programmes || []).map(p => `
      <option value="${p.id}">${Utils.escapeHtml(p.name)}</option>
    `).join('');

    Utils.openModal('modal-fee-structure');
  },

  // Edit fee structure
  editFeeStructure: (id) => {
    const fs = AppState.feeStructures.find(f => f.id === id);
    if (!fs) return;

    document.getElementById('fee-form-id').value = fs.id;
    document.getElementById('fee-class').value = fs.class_or_grade;
    document.getElementById('fee-board').value = fs.board || '';
    document.getElementById('fee-amount').value = fs.monthly_fee;
    document.getElementById('fee-status').checked = fs.is_active;
    document.getElementById('fee-modal-title').textContent = 'Edit Fee Structure';

    const select = document.getElementById('fee-programme-select');
    select.innerHTML = (AppState.programmes || []).map(p => `
      <option value="${p.id}" ${p.id === fs.programme_id ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>
    `).join('');

    Utils.openModal('modal-fee-structure');
  },

  // Save fee structure rule
  saveFeeStructure: async (e) => {
    e.preventDefault();
    const id = document.getElementById('fee-form-id').value;
    const programme_id = document.getElementById('fee-programme-select').value;
    const class_or_grade = document.getElementById('fee-class').value.trim();
    const board = document.getElementById('fee-board').value.trim() || null;
    const monthly_fee = parseFloat(document.getElementById('fee-amount').value) || 0;
    const is_active = document.getElementById('fee-status').checked;

    if (!programme_id || !class_or_grade || monthly_fee <= 0) {
      Utils.showToast("Validation", "Please provide Programme, Class/Grade, and Monthly Fee", "warning");
      return;
    }

    try {
      const payload = {
        programme_id,
        class_or_grade,
        board,
        monthly_fee,
        is_active,
        effective_from: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString()
      };

      if (id) {
        const { error } = await supabaseClient
          .from('fee_structures')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        await AuthModule.logAudit('update_fee_structure', 'fee_structures', id, payload);
        Utils.showToast("Saved", "Fee structure rule updated", "success");
      } else {
        payload.created_at = new Date().toISOString();
        const { data, error } = await supabaseClient
          .from('fee_structures')
          .insert([payload])
          .select();
        if (error) throw error;
        await AuthModule.logAudit('create_fee_structure', 'fee_structures', data[0]?.id, payload);
        Utils.showToast("Saved", "New fee rule added", "success");
      }

      Utils.closeModal('modal-fee-structure');
      await FeesModule.loadFeeStructures();
      FeesModule.renderFeeStructureTable(document.getElementById('fee-structure-filter-prog')?.value || '');
    } catch (err) {
      console.error("Save fee structure error:", err);
      Utils.showToast("Error", err.message || "Failed to save fee structure", "error");
    }
  },

  // Toggle active/inactive
  toggleFeeStatus: async (id, currentStatus) => {
    try {
      const { error } = await supabaseClient
        .from('fee_structures')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      await AuthModule.logAudit('toggle_fee_structure_status', 'fee_structures', id, { is_active: !currentStatus });
      Utils.showToast("Success", `Fee rule ${!currentStatus ? 'activated' : 'deactivated'}`, "success");
      await FeesModule.loadFeeStructures();
      FeesModule.renderFeeStructureTable(document.getElementById('fee-structure-filter-prog')?.value || '');
    } catch (err) {
      Utils.showToast("Error", "Failed to update fee status", "error");
    }
  }
};

window.FeesModule = FeesModule;
