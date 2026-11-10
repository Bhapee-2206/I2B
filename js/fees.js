/**
 * EDUTRACK – COMPLETE FEE STRUCTURE & PRICING ENGINE
 * Normalized Business Model: Subject Tuition (Matric/CBSE) & Hindi (Virtual/Online)
 */

const FeesModule = {
  activeTab: 'SUBJECT', // 'SUBJECT' or 'HINDI'

  // 1. DATA MODEL DEFINITIONS
  CATEGORIES: {
    SUBJECT: {
      code: 'SUBJECT',
      name: 'Subject Tuition',
      description: 'Core academic school tuition for Matric and CBSE boards',
      icon: 'book-open'
    },
    HINDI: {
      code: 'HINDI',
      name: 'Hindi Programme',
      description: 'Language training across 10 official Hindi course levels',
      icon: 'languages'
    }
  },

  VARIANTS: {
    SUBJECT: [
      { code: 'MATRIC', name: 'Matric', label: 'Matric Board', sort_order: 1 },
      { code: 'CBSE', name: 'CBSE', label: 'CBSE Board', sort_order: 2 }
    ],
    HINDI: [
      { code: 'VIRTUAL', name: 'Virtual', label: 'Virtual Delivery', sort_order: 1 },
      { code: 'ONLINE', name: 'Online', label: 'Online Delivery', sort_order: 2 }
    ]
  },

  SUBJECT_CLASSES: [
    { code: 'LKG', name: 'LKG', sort_order: 1 },
    { code: 'UKG', name: 'UKG', sort_order: 2 },
    { code: '1st', name: '1st Standard', sort_order: 3 },
    { code: '2nd', name: '2nd Standard', sort_order: 4 },
    { code: '3rd', name: '3rd Standard', sort_order: 5 },
    { code: '4th', name: '4th Standard', sort_order: 6 },
    { code: '5th', name: '5th Standard', sort_order: 7 },
    { code: '6th', name: '6th Standard', sort_order: 8 },
    { code: '7th', name: '7th Standard', sort_order: 9 },
    { code: '8th', name: '8th Standard', sort_order: 10 },
    { code: '9th', name: '9th Standard', sort_order: 11 },
    { code: '10th', name: '10th Standard', sort_order: 12 },
    { code: '11th', name: '11th Standard', sort_order: 13 },
    { code: '12th', name: '12th Standard', sort_order: 14 }
  ],

  HINDI_LEVELS: [
    { code: 'BASIC', name: 'Basic', local: 'बेसिक', label: 'Basic (बेसिक)', sort_order: 0 },
    { code: 'PARICHAYA', name: 'Parichaya', local: 'परिचय', label: 'Parichaya (परिचय)', sort_order: 1 },
    { code: 'PRATHAMIC', name: 'Prathamic', local: 'प्राथमिक', label: 'Prathamic (प्राथमिक)', sort_order: 2 },
    { code: 'MADHYAMA', name: 'Madhyama', local: 'मध्यमा', label: 'Madhyama (मध्यमा)', sort_order: 3 },
    { code: 'RASHTRABHASHA', name: 'Rashtrabhasha', local: 'राष्ट्रभाषा', label: 'Rashtrabhasha (राष्ट्रभाषा)', sort_order: 4 },
    { code: 'PRAVESHIKA', name: 'Praveshika', local: 'प्रवेशिका', label: 'Praveshika (प्रवेशिका)', sort_order: 5 },
    { code: 'VISHARAD_POORVARDH', name: 'Visharad Poorvardh', local: 'विशारद पूर्वार्ध', label: 'Visharad Poorvardh (विशारद पूर्वार्ध)', sort_order: 6 },
    { code: 'VISHARAD_UTTARARDH', name: 'Visharad Uttarardh', local: 'विशारद उत्तरार्ध', label: 'Visharad Uttarardh (विशारद उत्तरार्ध)', sort_order: 7 },
    { code: 'PRAVEEN_POORVARDH', name: 'Praveen Poorvardh', local: 'प्रवीण पूर्वार्ध', label: 'Praveen Poorvardh (प्रवीण पूर्वार्ध)', sort_order: 8 },
    { code: 'PRAVEEN_UTTARARDH', name: 'Praveen Uttarardh', local: 'प्रवीण उत्तरार्ध', label: 'Praveen Uttarardh (प्रवीण उत्तरार्ध)', sort_order: 9 }
  ],

  // In-memory rate matrix dictionary: key = `${category}_${variant}_${level}`
  // Example: 'SUBJECT_MATRIC_5th' -> { monthly_fee: 650, is_active: true }
  rateMatrix: {},

  // 2. INITIALIZATION
  init: async () => {
    FeesModule.seedInitialRateMatrix();
    await FeesModule.loadFromSupabase();
    FeesModule.renderCatalogue();
  },

  // Seed default rates matching the original workbook (Section 2)
  seedInitialRateMatrix: () => {
    FeesModule.rateMatrix = {};

    // A. Subject Tuition Rates
    const subjectRates = [
      { level: 'LKG', matric: 500, cbse: 600 },
      { level: 'UKG', matric: 500, cbse: 600 },
      { level: '1st', matric: 550, cbse: 600 },
      { level: '2nd', matric: 600, cbse: 650 },
      { level: '3rd', matric: 600, cbse: 650 },
      { level: '4th', matric: 600, cbse: 650 },
      { level: '5th', matric: 650, cbse: 700 },
      { level: '6th', matric: 650, cbse: 700 },
      { level: '7th', matric: 650, cbse: 750 },
      { level: '8th', matric: 800, cbse: 900 },
      { level: '9th', matric: 900, cbse: null },   // Not configured
      { level: '10th', matric: 1000, cbse: null }, // Not configured
      { level: '11th', matric: 1100, cbse: null }, // Not configured
      { level: '12th', matric: 1200, cbse: null }  // Not configured
    ];

    subjectRates.forEach(r => {
      FeesModule.setRateInMemory('SUBJECT', 'MATRIC', r.level, r.matric);
      if (r.cbse !== null) {
        FeesModule.setRateInMemory('SUBJECT', 'CBSE', r.level, r.cbse);
      }
    });

    // B. Hindi Rates (Virtual & Online)
    const hindiRates = [
      { level: 'BASIC', virtual: 500, online: 750 },
      { level: 'PARICHAYA', virtual: 500, online: 750 },
      { level: 'PRATHAMIC', virtual: 600, online: 750 },
      { level: 'MADHYAMA', virtual: 700, online: 850 },
      { level: 'RASHTRABHASHA', virtual: 800, online: 950 },
      { level: 'PRAVESHIKA', virtual: 900, online: 1050 },
      { level: 'VISHARAD_POORVARDH', virtual: 1000, online: 1150 },
      { level: 'VISHARAD_UTTARARDH', virtual: 1100, online: 1250 },
      { level: 'PRAVEEN_POORVARDH', virtual: 1200, online: 1350 },
      { level: 'PRAVEEN_UTTARARDH', virtual: 1300, online: 1450 }
    ];

    hindiRates.forEach(r => {
      FeesModule.setRateInMemory('HINDI', 'VIRTUAL', r.level, r.virtual);
      FeesModule.setRateInMemory('HINDI', 'ONLINE', r.level, r.online);
    });
  },

  setRateInMemory: (category, variant, level, fee, id = null, isActive = true) => {
    const key = `${category.toUpperCase()}_${variant.toUpperCase()}_${level.toUpperCase()}`;
    FeesModule.rateMatrix[key] = {
      category: category.toUpperCase(),
      variant: variant.toUpperCase(),
      level: level.toUpperCase(),
      monthly_fee: fee !== null && fee !== undefined ? parseFloat(fee) : null,
      id: id,
      is_active: isActive
    };
  },

  // 3. SUPABASE SYNC & LOAD
  loadFromSupabase: async () => {
    try {
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('fee_structures')
        .select('*');

      if (error) {
        console.warn("Notice loading fee_structures:", error);
        return;
      }

      if (data && data.length > 0) {
        data.forEach(row => {
          const cat = FeesModule.inferCategoryFromRow(row);
          const variant = FeesModule.inferVariantFromRow(row, cat);
          const level = FeesModule.inferLevelFromRow(row, cat);

          if (cat && variant && level && row.monthly_fee) {
            FeesModule.setRateInMemory(cat, variant, level, row.monthly_fee, row.id, row.is_active);
          }
        });
      }
    } catch (err) {
      console.warn("Fee structures sync error:", err);
    }
  },

  inferCategoryFromRow: (row) => {
    const board = (row.board || '').toLowerCase();
    const grade = (row.class_or_grade || '').toLowerCase();
    if (board === 'matric' || board === 'cbse') return 'SUBJECT';
    if (board === 'virtual' || board === 'online') return 'HINDI';
    if (grade.includes('parichaya') || grade.includes('prathamic') || grade.includes('madhyama') || grade.includes('basic')) {
      return 'HINDI';
    }
    return 'SUBJECT';
  },

  inferVariantFromRow: (row, cat) => {
    const board = (row.board || '').toUpperCase();
    if (cat === 'SUBJECT') {
      return board.includes('CBSE') ? 'CBSE' : 'MATRIC';
    } else {
      return board.includes('ONLINE') ? 'ONLINE' : 'VIRTUAL';
    }
  },

  inferLevelFromRow: (row, cat) => {
    const raw = String(row.class_or_grade || '').trim();
    if (cat === 'SUBJECT') {
      return FeesModule.normalizeSubjectClass(raw);
    } else {
      return FeesModule.normalizeHindiLevel(raw);
    }
  },

  // 4. LEVEL NORMALIZATION HELPERS
  normalizeSubjectClass: (val) => {
    if (!val) return '5th';
    const s = String(val).trim().toUpperCase().replace(/\.0$/, '');
    if (s === 'LKG' || s === 'UKG') return s;
    const cleanNum = s.replace(/STANDARD|ST|ND|RD|TH/g, '').trim();
    const num = parseInt(cleanNum, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      const suffixes = ['', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th'];
      return `${num}${suffixes[num]}`;
    }
    return s;
  },

  normalizeHindiLevel: (val) => {
    if (!val) return 'BASIC';
    const s = String(val).trim().toUpperCase().replace(/\.0$/, '');
    
    // Exact code match
    const direct = FeesModule.HINDI_LEVELS.find(l => l.code === s || l.name.toUpperCase() === s);
    if (direct) return direct.code;

    // Numeric mapping from Excel migration (Section 10)
    // 0/Basic -> BASIC, 1/1st -> PARICHAYA, 2/2nd -> PRATHAMIC, etc.
    const num = parseInt(s.replace(/ST|ND|RD|TH/g, ''), 10);
    if (s.includes('BASIC')) return 'BASIC';
    if (num === 1) return 'PARICHAYA';
    if (num === 2) return 'PRATHAMIC';
    if (num === 3) return 'MADHYAMA';
    if (num === 4) return 'RASHTRABHASHA';
    if (num === 5) return 'PRAVESHIKA';
    if (num === 6) return 'VISHARAD_POORVARDH';
    if (num === 7) return 'VISHARAD_UTTARARDH';
    if (num === 8) return 'PRAVEEN_POORVARDH';
    if (num === 9) return 'PRAVEEN_UTTARARDH';

    return 'BASIC';
  },

  // 5. CENTRAL FEE LOOKUP LOGIC (Section 12)
  // lookupRate(categoryCode, variantCode, levelCode, effectiveDate)
  lookupRate: (categoryCode, variantCode, levelCode, effectiveDate = null) => {
    if (!categoryCode || !variantCode || !levelCode) {
      return { success: false, monthly_fee: null, error: 'Incomplete parameters' };
    }

    const cat = categoryCode.toUpperCase();
    const variant = variantCode.toUpperCase();
    const level = (cat === 'SUBJECT' ? FeesModule.normalizeSubjectClass(levelCode) : FeesModule.normalizeHindiLevel(levelCode)).toUpperCase();

    const key = `${cat}_${variant}_${level}`;
    const rate = FeesModule.rateMatrix[key];

    if (rate && rate.is_active && rate.monthly_fee !== null && rate.monthly_fee > 0) {
      return {
        success: true,
        monthly_fee: parseFloat(rate.monthly_fee),
        category: cat,
        variant: variant,
        level: level,
        effective_date: effectiveDate || new Date().toISOString().slice(0, 10)
      };
    }

    // Explicit missing rate - NEVER return 0 as a configured rate
    return {
      success: false,
      monthly_fee: null,
      category: cat,
      variant: variant,
      level: level,
      error: 'Fee not configured'
    };
  },

  // Backward compatibility wrapper for old callers: lookupFee(programmeIdOrCat, classOrGrade, board)
  lookupFee: (programmeIdOrCat, classOrGrade, board = null) => {
    let cat = 'SUBJECT';
    let variant = 'MATRIC';

    // Infer category
    if (typeof programmeIdOrCat === 'string') {
      const p = (AppState.programmes || []).find(x => x.id === programmeIdOrCat);
      const name = (p ? p.name : programmeIdOrCat).toLowerCase();
      if (name.includes('hindi')) {
        cat = 'HINDI';
      } else {
        cat = 'SUBJECT';
      }
    }

    // Infer variant
    if (cat === 'SUBJECT') {
      variant = (board && String(board).toUpperCase().includes('CBSE')) ? 'CBSE' : 'MATRIC';
    } else {
      variant = (board && String(board).toUpperCase().includes('ONLINE')) ? 'ONLINE' : 'VIRTUAL';
    }

    const res = FeesModule.lookupRate(cat, variant, classOrGrade);
    return res.success ? res.monthly_fee : null;
  },

  // 6. UI RENDERING: FEE CATALOGUE
  switchTab: (tabKey) => {
    FeesModule.activeTab = tabKey;
    
    // Update tab button styles
    const btnSub = document.getElementById('tab-btn-subject');
    const btnHin = document.getElementById('tab-btn-hindi');
    const viewSub = document.getElementById('fee-cat-subject-view');
    const viewHin = document.getElementById('fee-cat-hindi-view');

    if (tabKey === 'SUBJECT') {
      btnSub?.classList.add('active');
      btnHin?.classList.remove('active');
      if (viewSub) viewSub.style.display = 'block';
      if (viewHin) viewHin.style.display = 'none';
    } else {
      btnSub?.classList.remove('active');
      btnHin?.classList.add('active');
      if (viewSub) viewSub.style.display = 'none';
      if (viewHin) viewHin.style.display = 'block';
    }

    FeesModule.renderCatalogue();
  },

  renderCatalogue: () => {
    FeesModule.renderSubjectView();
    FeesModule.renderHindiView();
    Utils.renderIcons();
  },

  // Render Subject Tuition Matrix (Matric vs CBSE Side-by-Side)
  renderSubjectView: () => {
    const tbody = document.getElementById('subject-fee-table-body');
    const mobileCards = document.getElementById('subject-fee-mobile-cards');
    if (!tbody) return;

    // 1. Desktop Comparison Table Rows
    tbody.innerHTML = FeesModule.SUBJECT_CLASSES.map(cls => {
      const matricRes = FeesModule.lookupRate('SUBJECT', 'MATRIC', cls.code);
      const cbseRes = FeesModule.lookupRate('SUBJECT', 'CBSE', cls.code);

      const matricDisplay = matricRes.success 
        ? `<strong style="font-size: 1.05rem; color: var(--text-main);">₹${matricRes.monthly_fee.toLocaleString('en-IN')}</strong> <small class="text-muted">/ month</small>`
        : `<span class="badge badge-neutral" style="font-weight: 500;">Not configured</span>`;

      const cbseDisplay = cbseRes.success
        ? `<strong style="font-size: 1.05rem; color: var(--accent-blue);">₹${cbseRes.monthly_fee.toLocaleString('en-IN')}</strong> <small class="text-muted">/ month</small>`
        : `<span class="badge badge-neutral" style="font-weight: 500;">Not configured</span>`;

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge badge-info" style="font-size: 0.75rem;">School Class</span>
              <strong style="font-size: 1rem; color: var(--text-main);">${cls.name}</strong>
            </div>
          </td>
          <td>${matricDisplay}</td>
          <td>${cbseDisplay}</td>
          <td class="actions-cell">
            <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('SUBJECT', 'MATRIC', '${cls.code}')" title="Edit Matric Fee">
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i> Matric
              </button>
              <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('SUBJECT', 'CBSE', '${cls.code}')" title="Edit CBSE Fee">
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i> CBSE
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // 2. Mobile Responsive Cards (1 Card Per School Class)
    if (mobileCards) {
      mobileCards.innerHTML = FeesModule.SUBJECT_CLASSES.map(cls => {
        const matricRes = FeesModule.lookupRate('SUBJECT', 'MATRIC', cls.code);
        const cbseRes = FeesModule.lookupRate('SUBJECT', 'CBSE', cls.code);

        return `
          <div class="fee-matrix-card">
            <div class="fee-card-top">
              <span class="fee-card-class-badge">${cls.name}</span>
              <span class="badge badge-info">Subject Tuition</span>
            </div>

            <div class="fee-card-rates-grid">
              <div class="fee-rate-box">
                <div class="fee-rate-label">Matric Board</div>
                <div class="fee-rate-val">
                  ${matricRes.success ? `₹${matricRes.monthly_fee.toLocaleString('en-IN')}<small>/mo</small>` : `<span class="not-config">Not configured</span>`}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('SUBJECT', 'MATRIC', '${cls.code}')" style="width: 100%; margin-top: 0.4rem; min-height: 32px; font-size: 0.75rem;">
                  <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> ${matricRes.success ? 'Edit Matric' : '+ Add Matric'}
                </button>
              </div>

              <div class="fee-rate-box">
                <div class="fee-rate-label">CBSE Board</div>
                <div class="fee-rate-val" style="color: var(--accent-blue);">
                  ${cbseRes.success ? `₹${cbseRes.monthly_fee.toLocaleString('en-IN')}<small>/mo</small>` : `<span class="not-config">Not configured</span>`}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('SUBJECT', 'CBSE', '${cls.code}')" style="width: 100%; margin-top: 0.4rem; min-height: 32px; font-size: 0.75rem;">
                  <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> ${cbseRes.success ? 'Edit CBSE' : '+ Add CBSE'}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  // Render Hindi Matrix (Virtual vs Online Side-by-Side)
  renderHindiView: () => {
    const tbody = document.getElementById('hindi-fee-table-body');
    const mobileCards = document.getElementById('hindi-fee-mobile-cards');
    if (!tbody) return;

    // 1. Desktop Comparison Table Rows
    tbody.innerHTML = FeesModule.HINDI_LEVELS.map(lvl => {
      const virtualRes = FeesModule.lookupRate('HINDI', 'VIRTUAL', lvl.code);
      const onlineRes = FeesModule.lookupRate('HINDI', 'ONLINE', lvl.code);

      const virtualDisplay = virtualRes.success
        ? `<strong style="font-size: 1.05rem; color: var(--text-main);">₹${virtualRes.monthly_fee.toLocaleString('en-IN')}</strong> <small class="text-muted">/ month</small>`
        : `<span class="badge badge-neutral" style="font-weight: 500;">Not configured</span>`;

      const onlineDisplay = onlineRes.success
        ? `<strong style="font-size: 1.05rem; color: var(--accent-blue);">₹${onlineRes.monthly_fee.toLocaleString('en-IN')}</strong> <small class="text-muted">/ month</small>`
        : `<span class="badge badge-neutral" style="font-weight: 500;">Not configured</span>`;

      return `
        <tr>
          <td>
            <div style="display: flex; flex-direction: column;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="badge badge-info" style="font-size: 0.72rem;">Level ${lvl.sort_order}</span>
                <strong style="font-size: 1rem; color: var(--text-main);">${lvl.name}</strong>
                ${lvl.local ? `<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">(${lvl.local})</span>` : ''}
              </div>
            </div>
          </td>
          <td>${virtualDisplay}</td>
          <td>${onlineDisplay}</td>
          <td class="actions-cell">
            <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('HINDI', 'VIRTUAL', '${lvl.code}')" title="Edit Virtual Delivery Fee">
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i> Virtual
              </button>
              <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('HINDI', 'ONLINE', '${lvl.code}')" title="Edit Online Delivery Fee">
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i> Online
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // 2. Mobile Responsive Cards (1 Card Per Hindi Level)
    if (mobileCards) {
      mobileCards.innerHTML = FeesModule.HINDI_LEVELS.map(lvl => {
        const virtualRes = FeesModule.lookupRate('HINDI', 'VIRTUAL', lvl.code);
        const onlineRes = FeesModule.lookupRate('HINDI', 'ONLINE', lvl.code);

        return `
          <div class="fee-matrix-card">
            <div class="fee-card-top">
              <span class="fee-card-class-badge">${lvl.name} ${lvl.local ? `(${lvl.local})` : ''}</span>
              <span class="badge badge-info">Hindi Level ${lvl.sort_order}</span>
            </div>

            <div class="fee-card-rates-grid">
              <div class="fee-rate-box">
                <div class="fee-rate-label">Virtual Delivery</div>
                <div class="fee-rate-val">
                  ${virtualRes.success ? `₹${virtualRes.monthly_fee.toLocaleString('en-IN')}<small>/mo</small>` : `<span class="not-config">Not configured</span>`}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('HINDI', 'VIRTUAL', '${lvl.code}')" style="width: 100%; margin-top: 0.4rem; min-height: 32px; font-size: 0.75rem;">
                  <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> ${virtualRes.success ? 'Edit Virtual' : '+ Add Virtual'}
                </button>
              </div>

              <div class="fee-rate-box">
                <div class="fee-rate-label">Online Delivery</div>
                <div class="fee-rate-val" style="color: var(--accent-blue);">
                  ${onlineRes.success ? `₹${onlineRes.monthly_fee.toLocaleString('en-IN')}<small>/mo</small>` : `<span class="not-config">Not configured</span>`}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="FeesModule.openEditModal('HINDI', 'ONLINE', '${lvl.code}')" style="width: 100%; margin-top: 0.4rem; min-height: 32px; font-size: 0.75rem;">
                  <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> ${onlineRes.success ? 'Edit Online' : '+ Add Online'}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  // 7. COMPACT FEE EDITING EXPERIENCE (Section 7)
  openEditModal: (category, variant, level) => {
    const res = FeesModule.lookupRate(category, variant, level);
    
    document.getElementById('edit-fee-category').value = category;
    document.getElementById('edit-fee-variant').value = variant;
    document.getElementById('edit-fee-level').value = level;

    // Display labels
    const catName = category === 'SUBJECT' ? 'Subject Tuition' : 'Hindi Programme';
    let variantName = variant;
    if (category === 'SUBJECT') {
      variantName = variant === 'CBSE' ? 'CBSE Board' : 'Matric Board';
    } else {
      variantName = variant === 'ONLINE' ? 'Online Delivery' : 'Virtual Delivery';
    }

    let levelName = level;
    if (category === 'SUBJECT') {
      const c = FeesModule.SUBJECT_CLASSES.find(x => x.code === level);
      levelName = c ? c.name : level;
    } else {
      const l = FeesModule.HINDI_LEVELS.find(x => x.code === level);
      levelName = l ? `${l.name} (${l.local})` : level;
    }

    document.getElementById('edit-fee-modal-title').textContent = `Edit Fee: ${catName}`;
    document.getElementById('edit-fee-badge-cat').textContent = catName;
    document.getElementById('edit-fee-badge-variant').textContent = variantName;
    document.getElementById('edit-fee-badge-level').textContent = levelName;

    // Inputs
    document.getElementById('edit-fee-existing-display').textContent = res.success 
      ? `Current Rate: ₹${res.monthly_fee.toLocaleString('en-IN')} / month` 
      : 'Current Rate: Not configured';

    document.getElementById('edit-fee-amount-input').value = res.success ? res.monthly_fee : '';
    document.getElementById('edit-fee-effective-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('edit-fee-status').checked = true;

    Utils.openModal('modal-edit-fee-rate');
  },

  saveEditedRate: async (e) => {
    e.preventDefault();

    const category = document.getElementById('edit-fee-category').value;
    const variant = document.getElementById('edit-fee-variant').value;
    const level = document.getElementById('edit-fee-level').value;
    const amountVal = document.getElementById('edit-fee-amount-input').value;
    const effectiveDate = document.getElementById('edit-fee-effective-date').value || new Date().toISOString().slice(0, 10);
    const isActive = document.getElementById('edit-fee-status').checked;

    const monthlyFee = parseFloat(amountVal);
    if (isNaN(monthlyFee) || monthlyFee <= 0) {
      Utils.showToast("Validation", "Please enter a valid monthly fee amount greater than 0", "warning");
      return;
    }

    const key = `${category}_${variant}_${level}`;
    const existing = FeesModule.rateMatrix[key];

    // 1. Update in-memory
    FeesModule.setRateInMemory(category, variant, level, monthlyFee, existing?.id, isActive);

    // 2. Persist to Supabase
    try {
      if (supabaseClient) {
        // Find matching programme id for backwards compatibility
        let progId = null;
        if (category === 'SUBJECT') {
          const p = (AppState.programmes || []).find(x => x.code === 'SUBJECT' || x.name === 'Subject');
          progId = p ? p.id : 'b0000000-0000-0000-0000-000000000001';
        } else {
          const progCode = variant === 'ONLINE' ? 'ONLINE_HINDI' : 'HINDI';
          const p = (AppState.programmes || []).find(x => x.code === progCode || x.name.toLowerCase().includes(variant.toLowerCase()));
          progId = p ? p.id : (variant === 'ONLINE' ? 'b0000000-0000-0000-0000-000000000004' : 'b0000000-0000-0000-0000-000000000002');
        }

        const payload = {
          programme_id: progId,
          class_or_grade: level,
          board: variant === 'MATRIC' ? 'Matric' : (variant === 'CBSE' ? 'CBSE' : (variant === 'ONLINE' ? 'Online' : 'Virtual')),
          monthly_fee: monthlyFee,
          effective_from: effectiveDate,
          is_active: isActive,
          updated_at: new Date().toISOString()
        };

        if (existing && existing.id) {
          await supabaseClient.from('fee_structures').update(payload).eq('id', existing.id);
        } else {
          payload.created_at = new Date().toISOString();
          const { data } = await supabaseClient.from('fee_structures').insert([payload]).select();
          if (data && data[0]) {
            FeesModule.setRateInMemory(category, variant, level, monthlyFee, data[0].id, isActive);
          }
        }

        await AuthModule.logAudit('UPDATE_FEE_RATE', 'fee_structures', key, {
          category, variant, level, monthly_fee: monthlyFee, effective_date: effectiveDate
        });
      }

      Utils.showToast("Saved!", `Updated ${category} ${variant} (${level}) to ₹${monthlyFee.toLocaleString('en-IN')}/mo`, "success");
      Utils.closeModal('modal-edit-fee-rate');
      FeesModule.renderCatalogue();
    } catch (err) {
      console.error("Save fee rate error:", err);
      Utils.showToast("Notice", "Updated locally. Supabase sync notice: " + (err.message || 'Saved'), "info");
      Utils.closeModal('modal-edit-fee-rate');
      FeesModule.renderCatalogue();
    }
  },

  // Backward compatibility stubs
  renderProgrammeTabs: () => FeesModule.renderCatalogue(),
  renderFeeStructureTable: () => FeesModule.renderCatalogue(),
  initParentCalculator: () => {},
  initFinder: () => {},
  openFinderModal: () => {}
};

window.FeesModule = FeesModule;
