/**
 * EDUTRACK SETTINGS & MASTER DATA MODULE
 * Organisation Branding, Dynamic Academic Years & Master Classes/Boards
 */

const SettingsModule = {
  init: async () => {
    await SettingsModule.loadSettings();
    await SettingsModule.loadAcademicYears();
    SettingsModule.populateForm();
    SettingsModule.renderAcademicYearsTable();
  },

  // Load institution settings from Supabase
  loadSettings: async () => {
    try {
      if (!supabaseClient) return null;
      const { data, error } = await supabaseClient
        .from('institution_settings')
        .select('*')
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        AppState.institution = data[0];
      } else {
        // Create initial default settings record if missing
        const defaultSettings = {
          institution_name: 'I2B Educational Institution',
          subtitle: 'Student & Monthly Fee Management',
          currency_symbol: '₹',
          default_due_day: 10,
          receipt_prefix: 'REC',
          invoice_prefix: 'INV',
          student_prefix: 'STU',
          created_at: new Date().toISOString()
        };
        const { data: created } = await supabaseClient
          .from('institution_settings')
          .insert([defaultSettings])
          .select();
        if (created && created[0]) {
          AppState.institution = created[0];
        }
      }
      return AppState.institution;
    } catch (err) {
      console.warn("Notice loading settings:", err);
      return null;
    }
  },

  // Load academic years dynamically from Supabase
  loadAcademicYears: async () => {
    try {
      if (!supabaseClient) return AppState.academicYears;
      const { data, error } = await supabaseClient
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data && data.length > 0) {
        AppState.academicYears = data;
        const active = data.find(ay => ay.is_active);
        if (active) {
          AppState.activeAcademicYear = active.year_name;
        }
      }
    } catch (e) {
      console.warn("Notice loading academic years:", e);
    }

    // Update active academic year badges in header & dashboard
    const badgeEls = document.querySelectorAll('.active-academic-year-text');
    badgeEls.forEach(el => el.textContent = AppState.activeAcademicYear);

    return AppState.academicYears;
  },

  // Populate settings form inputs with database values
  populateForm: () => {
    const s = AppState.institution;
    if (!s) return;

    // Update brand titles across application
    const brandTitles = document.querySelectorAll('.brand-dynamic-name');
    brandTitles.forEach(el => el.textContent = s.institution_name || 'EduTrack');

    const brandSubs = document.querySelectorAll('.brand-dynamic-sub');
    brandSubs.forEach(el => el.textContent = s.subtitle || 'Fee Management');

    // Populate inputs if Settings page is mounted
    const nameInput = document.getElementById('setting-org-name');
    if (nameInput) {
      nameInput.value = s.institution_name || '';
      document.getElementById('setting-org-subtitle').value = s.subtitle || '';
      document.getElementById('setting-org-tagline').value = s.tagline || '';
      document.getElementById('setting-org-address').value = s.address || '';
      document.getElementById('setting-org-phone').value = s.contact_phone || '';
      document.getElementById('setting-org-email').value = s.contact_email || '';
      document.getElementById('setting-org-whatsapp').value = s.whatsapp_number || '';
      document.getElementById('setting-currency-symbol').value = s.currency_symbol || '₹';
      document.getElementById('setting-due-day').value = s.default_due_day || 10;
      document.getElementById('setting-receipt-prefix').value = s.receipt_prefix || 'REC';
      document.getElementById('setting-invoice-prefix').value = s.invoice_prefix || 'INV';
      document.getElementById('setting-student-prefix').value = s.student_prefix || 'STU';
      document.getElementById('setting-receipt-footer').value = s.receipt_footer || '';
    }
  },

  // Render Academic Years List
  renderAcademicYearsTable: () => {
    const tbody = document.getElementById('academic-years-table-body');
    if (!tbody) return;

    tbody.innerHTML = (AppState.academicYears || []).map(ay => `
      <tr>
        <td><strong>${Utils.escapeHtml(ay.year_name)}</strong></td>
        <td>${Utils.formatDate(ay.start_date)}</td>
        <td>${Utils.formatDate(ay.end_date)}</td>
        <td>
          <span class="badge ${ay.is_active ? 'badge-paid' : 'badge-neutral'}">
            <span class="badge-dot"></span>
            ${ay.is_active ? 'Active' : 'Archived'}
          </span>
        </td>
        <td class="actions-cell">
          ${!ay.is_active ? `
            <button class="btn btn-secondary btn-sm" onclick="SettingsModule.setActiveAcademicYear('${ay.id}')">
              Set Active
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: var(--status-paid); font-weight: 600;">Current Active</span>
          `}
        </td>
      </tr>
    `).join('');

    Utils.renderIcons();
  },

  // Set active academic year
  setActiveAcademicYear: async (id) => {
    try {
      if (supabaseClient) {
        await supabaseClient.from('academic_years').update({ is_active: false }).neq('id', id);
        await supabaseClient.from('academic_years').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', id);
      }
      AppState.academicYears.forEach(ay => ay.is_active = (ay.id === id));
      const active = AppState.academicYears.find(ay => ay.id === id);
      if (active) AppState.activeAcademicYear = active.year_name;

      SettingsModule.renderAcademicYearsTable();
      SettingsModule.loadAcademicYears();
      Utils.showToast("Updated", `Active Academic Year set to ${AppState.activeAcademicYear}`, "success");
    } catch (e) {
      Utils.showToast("Error", "Failed to update academic year", "error");
    }
  },

  // Save Settings directly to Supabase
  saveSettings: async (e) => {
    e.preventDefault();

    const payload = {
      institution_name: document.getElementById('setting-org-name').value.trim(),
      subtitle: document.getElementById('setting-org-subtitle').value.trim(),
      tagline: document.getElementById('setting-org-tagline').value.trim(),
      address: document.getElementById('setting-org-address').value.trim(),
      contact_phone: document.getElementById('setting-org-phone').value.trim(),
      contact_email: document.getElementById('setting-org-email').value.trim(),
      whatsapp_number: document.getElementById('setting-org-whatsapp').value.trim(),
      currency_symbol: document.getElementById('setting-currency-symbol').value.trim() || '₹',
      default_due_day: parseInt(document.getElementById('setting-due-day').value, 10) || 10,
      receipt_prefix: document.getElementById('setting-receipt-prefix').value.trim().toUpperCase() || 'REC',
      invoice_prefix: document.getElementById('setting-invoice-prefix').value.trim().toUpperCase() || 'INV',
      student_prefix: document.getElementById('setting-student-prefix').value.trim().toUpperCase() || 'STU',
      receipt_footer: document.getElementById('setting-receipt-footer').value.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      const currentId = AppState.institution?.id;
      let res;
      if (currentId) {
        res = await supabaseClient
          .from('institution_settings')
          .update(payload)
          .eq('id', currentId)
          .select();
      } else {
        res = await supabaseClient
          .from('institution_settings')
          .insert([payload])
          .select();
      }

      if (res.error) throw res.error;
      if (res.data && res.data.length > 0) {
        AppState.institution = res.data[0];
      }

      await AuthModule.logAudit('update_settings', 'institution_settings', currentId || 'new', payload);
      SettingsModule.populateForm();
      Utils.showToast("Settings Saved", "Institution profile and billing settings updated successfully", "success");

    } catch (err) {
      console.error("Save settings error:", err);
      Utils.showToast("Error", err.message || "Failed to save settings", "error");
    }
  }
};

window.SettingsModule = SettingsModule;
