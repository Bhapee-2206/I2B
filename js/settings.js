/**
 * EDUTRACK SETTINGS MODULE
 * Organisation Branding, Financial Prefixes & Academic Year Configuration
 */

const SettingsModule = {
  init: async () => {
    await SettingsModule.loadSettings();
    SettingsModule.populateForm();
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
      }
      return AppState.institution;
    } catch (err) {
      console.error("Error loading settings:", err);
      return null;
    }
  },

  // Populate settings form with database values
  populateForm: () => {
    const s = AppState.institution;
    if (!s) return;

    // Update brand titles across application
    const brandTitles = document.querySelectorAll('.brand-dynamic-name');
    brandTitles.forEach(el => el.textContent = s.institution_name || 'I2B Institution');

    const brandSubs = document.querySelectorAll('.brand-dynamic-sub');
    brandSubs.forEach(el => el.textContent = s.subtitle || 'EduTrack System');

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
      const currentId = AppState.institution?.id || 'a0000000-0000-0000-0000-000000000001';
      const { data, error } = await supabaseClient
        .from('institution_settings')
        .update(payload)
        .eq('id', currentId)
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        AppState.institution = data[0];
      }

      await AuthModule.logAudit('update_settings', 'institution_settings', currentId, payload);
      SettingsModule.populateForm();
      Utils.showToast("Settings Saved", "Institution profile and billing settings updated successfully", "success");

    } catch (err) {
      console.error("Save settings error:", err);
      Utils.showToast("Error", err.message || "Failed to save settings", "error");
    }
  }
};

window.SettingsModule = SettingsModule;
