/**
 * EDUTRACK FEE STRUCTURE & PARENT ENQUIRY MODULE
 * Pedagogically Natural Class Sorting, Parent Fee Calculator & Responsive Cards
 */

const FeesModule = {
  activeFilterProgId: '',

  // Standard ordered classes for selectors and natural pedagogical sorting
  STANDARD_CLASSES: [
    { value: 'LKG', label: 'LKG', rank: 1 },
    { value: 'UKG', label: 'UKG', rank: 2 },
    { value: '1st', label: '1st Standard', rank: 3 },
    { value: '2nd', label: '2nd Standard', rank: 4 },
    { value: '3rd', label: '3rd Standard', rank: 5 },
    { value: '4th', label: '4th Standard', rank: 6 },
    { value: '5th', label: '5th Standard', rank: 7 },
    { value: '6th', label: '6th Standard', rank: 8 },
    { value: '7th', label: '7th Standard', rank: 9 },
    { value: '8th', label: '8th Standard', rank: 10 },
    { value: '9th', label: '9th Standard', rank: 11 },
    { value: '10th', label: '10th Standard', rank: 12 },
    { value: '11th', label: '11th Standard', rank: 13 },
    { value: '12th', label: '12th Standard', rank: 14 },
    { value: 'Basic', label: 'Basic Level (Hindi)', rank: 20 }
  ],

  init: async () => {
    await FeesModule.loadFeeStructures();
    FeesModule.initParentCalculator();
    FeesModule.renderProgrammeTabs();
    FeesModule.renderFeeStructureTable();
  },

  // Load fee structures from Supabase
  loadFeeStructures: async () => {
    try {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from('fee_structures')
        .select('*, programmes(id, name, code, fee_mode, sort_order)');

      if (error) throw error;
      AppState.feeStructures = data || [];
      return AppState.feeStructures;
    } catch (err) {
      console.error("Error loading fee structures:", err);
      Utils.showToast("Error", "Failed to load fee structures", "error");
      return [];
    }
  },

  // Normalize grade string for consistent comparison (e.g. "5th", "5", "5.0", "5th Standard")
  normalizeGrade: (val) => {
    if (!val) return '';
    return String(val)
      .trim()
      .toLowerCase()
      .replace(/standard|\.0$/g, '')
      .replace(/st|nd|rd|th/g, '')
      .trim();
  },

  // Format class / grade string cleanly (e.g. "1.0" -> "1st Standard", "LKG" -> "LKG")
  formatClassDisplay: (val) => {
    if (!val) return '—';
    const s = String(val).trim();
    const clean = s.replace(/\.0$/, '').toLowerCase();
    
    if (clean === 'lkg') return 'LKG';
    if (clean === 'ukg') return 'UKG';
    if (clean === 'basic') return 'Basic Level (Hindi)';
    if (clean === 'school') return 'School Level';

    const num = parseInt(clean.replace(/st|nd|rd|th/g, ''), 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      const suffixes = ['', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th'];
      return `${num}${suffixes[num]} Standard`;
    }
    return s;
  },

  // Numerical rank for natural pedagogical sorting (LKG -> UKG -> 1st -> ... -> 12th -> Basic)
  getClassRank: (val) => {
    if (!val) return 99;
    const s = String(val).trim().toLowerCase().replace(/\.0$/, '');
    if (s === 'lkg') return 1;
    if (s === 'ukg') return 2;
    const num = parseInt(s.replace(/st|nd|rd|th/g, ''), 10);
    if (!isNaN(num) && num >= 1 && num <= 12) return num + 2;
    if (s.includes('basic')) return 20;
    if (s.includes('school')) return 21;
    return 50;
  },

  // EXACT MATCHING LOOKUP
  lookupFee: (programmeId, classOrGrade, board = null) => {
    if (!programmeId || !classOrGrade) return null;

    const normGrade = FeesModule.normalizeGrade(classOrGrade);
    const normBoard = (board || '').trim().toLowerCase();

    // 1. Exact lookup matching programme + normalized grade + board
    const exactMatch = AppState.feeStructures.find(fs => {
      if (!fs.is_active || fs.programme_id !== programmeId) return false;
      
      const fsGrade = FeesModule.normalizeGrade(fs.class_or_grade);
      const gradeMatches = (fsGrade === normGrade || fs.class_or_grade.toLowerCase() === classOrGrade.toLowerCase());
      if (!gradeMatches) return false;

      if (normBoard) {
        return fs.board && fs.board.toLowerCase() === normBoard;
      } else {
        return !fs.board;
      }
    });

    if (exactMatch) {
      return parseFloat(exactMatch.monthly_fee);
    }

    // 2. If board was provided but not found, check if a universal rule without board exists
    if (normBoard) {
      const universalMatch = AppState.feeStructures.find(fs => {
        if (!fs.is_active || fs.programme_id !== programmeId || fs.board) return false;
        const fsGrade = FeesModule.normalizeGrade(fs.class_or_grade);
        return (fsGrade === normGrade || fs.class_or_grade.toLowerCase() === classOrGrade.toLowerCase());
      });
      if (universalMatch) return parseFloat(universalMatch.monthly_fee);
    }

    return null;
  },

  // =========================================================================
  // 1. PARENT ENQUIRY FEE CALCULATOR & QUICK QUOTE
  // =========================================================================
  initParentCalculator: () => {
    const classSelect = document.getElementById('calc-quote-class');
    const progContainer = document.getElementById('calc-programmes-list');
    if (!classSelect || !progContainer) return;

    // Populate standard classes dropdown
    classSelect.innerHTML = FeesModule.STANDARD_CLASSES.map(c => `
      <option value="${c.value}" ${c.value === '5th' ? 'selected' : ''}>${c.label}</option>
    `).join('');

    // Populate programme interactive checkboxes
    const progs = AppState.programmes || [];
    progContainer.innerHTML = progs.map((p, idx) => `
      <div class="calc-prog-card ${idx === 0 ? 'selected' : ''}" onclick="FeesModule.toggleCalcProg('${p.id}')" id="calc-card-${p.id}">
        <div class="calc-prog-left">
          <input 
            type="checkbox" 
            id="calc-chk-${p.id}" 
            value="${p.id}" 
            ${idx === 0 ? 'checked' : ''} 
            onclick="event.stopPropagation(); FeesModule.updateParentQuote();"
          >
          <span class="calc-prog-title">${Utils.escapeHtml(p.name)}</span>
        </div>
        <div class="calc-prog-badge" id="calc-badge-${p.id}">₹0/mo</div>
      </div>
    `).join('');

    FeesModule.updateParentQuote();
  },

  toggleCalcProg: (progId) => {
    const chk = document.getElementById(`calc-chk-${progId}`);
    if (chk) {
      chk.checked = !chk.checked;
      FeesModule.updateParentQuote();
    }
  },

  // Recalculate parent fee quotation live
  updateParentQuote: () => {
    const classVal = document.getElementById('calc-quote-class')?.value || '5th';
    const boardVal = document.getElementById('calc-quote-board')?.value || 'Matric';
    const progs = AppState.programmes || [];

    const targetDisplay = document.getElementById('quote-target-display');
    const totalDisplay = document.getElementById('quote-total-display');
    const breakdownList = document.getElementById('quote-breakdown-list');

    if (targetDisplay) {
      targetDisplay.textContent = `${FeesModule.formatClassDisplay(classVal)} • ${boardVal} Board`;
    }

    let totalMonthlyFee = 0;
    const selectedBreakdown = [];

    progs.forEach(p => {
      const chk = document.getElementById(`calc-chk-${p.id}`);
      const card = document.getElementById(`calc-card-${p.id}`);
      const badge = document.getElementById(`calc-badge-${p.id}`);

      // Determine appropriate board for lookup
      let lookupBoard = boardVal;
      if (p.fee_mode === 'virtual_online') {
        lookupBoard = (boardVal === 'Online' ? 'Online' : 'Virtual');
      }

      // Exact fee lookup
      let fee = FeesModule.lookupFee(p.id, classVal, lookupBoard);
      if (fee === null && p.fee_mode === 'virtual_online') {
        fee = FeesModule.lookupFee(p.id, classVal, 'Virtual') || FeesModule.lookupFee(p.id, 'Basic', 'Virtual');
      }

      const isChecked = chk && chk.checked;
      if (card) {
        if (isChecked) card.classList.add('selected');
        else card.classList.remove('selected');
      }

      if (badge) {
        if (fee !== null && fee > 0) {
          badge.textContent = `${Utils.formatCurrency(fee)}/mo`;
          badge.style.color = 'var(--accent-blue)';
        } else {
          badge.textContent = 'Rule missing';
          badge.style.color = 'var(--text-light)';
        }
      }

      if (isChecked) {
        const itemFee = fee || 0;
        totalMonthlyFee += itemFee;
        selectedBreakdown.push({
          name: p.name,
          fee: itemFee,
          board: lookupBoard
        });
      }
    });

    if (totalDisplay) {
      totalDisplay.innerHTML = `${Utils.formatCurrency(totalMonthlyFee)} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">/ month</span>`;
    }

    if (breakdownList) {
      if (selectedBreakdown.length === 0) {
        breakdownList.innerHTML = `<span class="text-muted" style="font-size: 0.8rem; font-style: italic;">Select one or more programmes to view breakdown.</span>`;
      } else {
        breakdownList.innerHTML = selectedBreakdown.map(b => `
          <div class="quote-breakdown-item">
            <span>• ${Utils.escapeHtml(b.name)} <small style="color: var(--text-light);">(${b.board})</small>:</span>
            <strong>${Utils.formatCurrency(b.fee)}/mo</strong>
          </div>
        `).join('');
      }
    }
  },

  // 1-Click: Enrol Student With This Quoted Fee
  enrolWithQuote: () => {
    const classVal = document.getElementById('calc-quote-class')?.value || '5th';
    const boardVal = document.getElementById('calc-quote-board')?.value || 'Matric';
    const progs = AppState.programmes || [];

    const selectedEnrolments = [];

    progs.forEach(p => {
      const chk = document.getElementById(`calc-chk-${p.id}`);
      if (chk && chk.checked) {
        let lookupBoard = boardVal;
        if (p.fee_mode === 'virtual_online') {
          lookupBoard = (boardVal === 'Online' ? 'Online' : 'Virtual');
        }
        let fee = FeesModule.lookupFee(p.id, classVal, lookupBoard) || 0;
        selectedEnrolments.push({
          programme_id: p.id,
          class_or_grade: classVal,
          board: lookupBoard,
          monthly_fee: fee
        });
      }
    });

    if (selectedEnrolments.length === 0) {
      Utils.showToast("Selection Needed", "Please check at least one programme before enrolling", "warning");
      return;
    }

    // Open Student Modal
    StudentsModule.openAddStudentModal();

    // Clear default empty programme row
    const container = document.getElementById('programme-rows-container');
    if (container) container.innerHTML = '';
    StudentsModule.activeProgrammeRowCount = 0;

    // Add each quoted programme row pre-filled
    selectedEnrolments.forEach(enrol => {
      StudentsModule.addProgrammeRow(enrol);
    });

    StudentsModule.updateCombinedFeePreview();
    Utils.showToast("Quote Loaded", "Student registration form pre-filled with quoted fee", "info");
  },

  // Copy Quotation Message to Clipboard for WhatsApp
  copyQuoteText: () => {
    const classVal = document.getElementById('calc-quote-class')?.value || '5th';
    const boardVal = document.getElementById('calc-quote-board')?.value || 'Matric';
    const progs = AppState.programmes || [];

    let totalMonthlyFee = 0;
    const lines = [];

    progs.forEach(p => {
      const chk = document.getElementById(`calc-chk-${p.id}`);
      if (chk && chk.checked) {
        let lookupBoard = boardVal;
        if (p.fee_mode === 'virtual_online') {
          lookupBoard = (boardVal === 'Online' ? 'Online' : 'Virtual');
        }
        let fee = FeesModule.lookupFee(p.id, classVal, lookupBoard) || 0;
        totalMonthlyFee += fee;
        lines.push(`• ${p.name} (${lookupBoard}): ₹${fee}/month`);
      }
    });

    if (lines.length === 0) {
      Utils.showToast("Quotation", "Please select programmes first", "warning");
      return;
    }

    const orgName = AppState.institution?.institution_name || 'EduTrack';
    const msg = `📚 ${orgName} – Tuition Fee Quotation\nStudent: ${FeesModule.formatClassDisplay(classVal)} (${boardVal} Board)\n------------------------------------\n${lines.join('\n')}\n------------------------------------\nTotal Monthly Fee: ₹${totalMonthlyFee.toLocaleString('en-IN')}/month\n\nRegistration is open. Please let us know if you would like to proceed with admission!`;

    navigator.clipboard.writeText(msg).then(() => {
      Utils.showToast("Copied!", "Fee quote copied to clipboard ready to send on WhatsApp", "success");
    }).catch(() => {
      Utils.showToast("Notice", "Unable to copy automatically. Please copy from summary.", "info");
    });
  },

  // =========================================================================
  // 2. FEE STRUCTURE DIRECTORY & TABS
  // =========================================================================
  renderProgrammeTabs: () => {
    const tabsContainer = document.getElementById('fee-programme-filter-tabs');
    if (!tabsContainer) return;

    const progs = AppState.programmes || [];
    let html = `
      <button class="prog-tab-pill ${FeesModule.activeFilterProgId === '' ? 'active' : ''}" onclick="FeesModule.setFilterProgramme('')">
        All Programmes (${AppState.feeStructures.length})
      </button>
    `;

    progs.forEach(p => {
      const count = (AppState.feeStructures || []).filter(fs => fs.programme_id === p.id).length;
      html += `
        <button class="prog-tab-pill ${FeesModule.activeFilterProgId === p.id ? 'active' : ''}" onclick="FeesModule.setFilterProgramme('${p.id}')">
          ${Utils.escapeHtml(p.name)} (${count})
        </button>
      `;
    });

    tabsContainer.innerHTML = html;
  },

  setFilterProgramme: (progId) => {
    FeesModule.activeFilterProgId = progId;
    FeesModule.renderProgrammeTabs();
    FeesModule.renderFeeStructureTable(progId);
  },

  // Render the fee structure page table and mobile cards
  renderFeeStructureTable: (filteredProgrammeId = '') => {
    const tbody = document.getElementById('fee-structure-table-body');
    const mobileCardsContainer = document.getElementById('fee-structure-mobile-cards');
    if (!tbody) return;

    const targetProgId = filteredProgrammeId !== undefined && filteredProgrammeId !== '' ? filteredProgrammeId : FeesModule.activeFilterProgId;

    let list = [...(AppState.feeStructures || [])];
    if (targetProgId) {
      list = list.filter(fs => fs.programme_id === targetProgId);
    }

    // NATURAL PEDAGOGICAL SORTING: LKG -> UKG -> 1st -> ... -> 12th -> Basic
    list.sort((a, b) => {
      const rankA = FeesModule.getClassRank(a.class_or_grade);
      const rankB = FeesModule.getClassRank(b.class_or_grade);
      if (rankA !== rankB) return rankA - rankB;

      const progOrderA = a.programmes?.sort_order || 0;
      const progOrderB = b.programmes?.sort_order || 0;
      if (progOrderA !== progOrderB) return progOrderA - progOrderB;

      return (a.board || '').localeCompare(b.board || '');
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
            No fee structure rules configured for this selection.
          </td>
        </tr>`;
      if (mobileCardsContainer) {
        mobileCardsContainer.innerHTML = `
          <div class="text-muted" style="padding: 2rem; text-align: center; font-size: 0.85rem;">
            No fee rules found for this programme filter.
          </div>`;
      }
      return;
    }

    // 1. Desktop Table HTML
    tbody.innerHTML = list.map(fs => {
      const progName = fs.programmes?.name || 'Programme';
      const cleanClass = FeesModule.formatClassDisplay(fs.class_or_grade);
      return `
        <tr>
          <td><strong style="font-size: 0.95rem; color: var(--text-main);">${Utils.escapeHtml(cleanClass)}</strong></td>
          <td><span class="badge badge-info">${Utils.escapeHtml(progName)}</span></td>
          <td>${fs.board ? `<span class="badge badge-neutral">${Utils.escapeHtml(fs.board)}</span>` : '<span class="text-muted">Universal</span>'}</td>
          <td><strong style="color: var(--accent-blue); font-size: 1.05rem;">${Utils.formatCurrency(fs.monthly_fee)}</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">/ month</span></td>
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

    // 2. Mobile Responsive Fee Cards (Zero Horizontal Scroll!)
    if (mobileCardsContainer) {
      mobileCardsContainer.innerHTML = list.map(fs => {
        const progName = fs.programmes?.name || 'Programme';
        const cleanClass = FeesModule.formatClassDisplay(fs.class_or_grade);
        return `
          <div class="mobile-fee-card">
            <div class="mobile-fee-header">
              <span class="mobile-fee-class">${Utils.escapeHtml(cleanClass)}</span>
              <span class="badge badge-info" style="font-size: 0.72rem;">${Utils.escapeHtml(progName)}</span>
            </div>

            <div class="mobile-fee-middle">
              <div>
                <span class="badge badge-neutral" style="font-size: 0.74rem;">${fs.board ? Utils.escapeHtml(fs.board) : 'Universal Board'}</span>
                <span class="badge ${fs.is_active ? 'badge-paid' : 'badge-neutral'}" style="margin-left: 0.35rem; font-size: 0.7rem;">
                  <span class="badge-dot"></span> ${fs.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div class="mobile-fee-amount">${Utils.formatCurrency(fs.monthly_fee)} <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">/ mo</span></div>
            </div>

            <div class="mobile-fee-actions">
              <button class="btn btn-secondary btn-sm" onclick="FeesModule.editFeeStructure('${fs.id}')" style="min-height: 34px; padding: 0.25rem 0.65rem;">
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i> Edit Rate
              </button>
              <button class="btn ${fs.is_active ? 'btn-danger' : 'btn-success'} btn-sm" onclick="FeesModule.toggleFeeStatus('${fs.id}', ${fs.is_active})" style="min-height: 34px; padding: 0.25rem 0.65rem;">
                ${fs.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    Utils.renderIcons();
  },

  // Open modal to add a new fee rule
  openAddModal: () => {
    document.getElementById('fee-form-id').value = '';
    document.getElementById('fee-class').value = '5th';
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
    
    // Select matching class in dropdown (or fallback)
    const classSelect = document.getElementById('fee-class');
    const norm = FeesModule.normalizeGrade(fs.class_or_grade);
    const matchingOption = Array.from(classSelect.options).find(opt => FeesModule.normalizeGrade(opt.value) === norm);
    if (matchingOption) {
      classSelect.value = matchingOption.value;
    } else {
      classSelect.value = fs.class_or_grade;
    }

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
      FeesModule.updateParentQuote();
      FeesModule.renderProgrammeTabs();
      FeesModule.renderFeeStructureTable(FeesModule.activeFilterProgId);
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
      FeesModule.updateParentQuote();
      FeesModule.renderProgrammeTabs();
      FeesModule.renderFeeStructureTable(FeesModule.activeFilterProgId);
    } catch (err) {
      Utils.showToast("Error", "Failed to update fee status", "error");
    }
  }
};

window.FeesModule = FeesModule;
