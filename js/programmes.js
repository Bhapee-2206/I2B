/**
 * EDUTRACK PROGRAMMES MODULE
 * Loads and manages academic programmes dynamically from the database
 */

const ProgrammesModule = {
  init: async () => {
    await ProgrammesModule.loadProgrammes();
  },

  // Load all programmes from database
  loadProgrammes: async () => {
    try {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from('programmes')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      AppState.programmes = data || [];
      return AppState.programmes;
    } catch (err) {
      console.error("Error loading programmes:", err);
      Utils.showToast("Error", "Failed to load tuition programmes", "error");
      return [];
    }
  },

  // Render programmes list in settings/management
  renderProgrammesTable: () => {
    const tbody = document.getElementById('programmes-table-body');
    if (!tbody) return;

    if (!AppState.programmes || AppState.programmes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding: 2rem; color: var(--text-muted);">
            No programmes found in database.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = AppState.programmes.map(prog => `
      <tr>
        <td><strong>${Utils.escapeHtml(prog.name)}</strong></td>
        <td><code>${Utils.escapeHtml(prog.code)}</code></td>
        <td>${Utils.escapeHtml(prog.description || '—')}</td>
        <td>
          <span class="badge ${prog.is_active ? 'badge-active' : 'badge-inactive'}">
            <span class="badge-dot"></span>
            ${prog.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="ProgrammesModule.editProgramme('${prog.id}')">
            <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Edit
          </button>
          <button class="btn ${prog.is_active ? 'btn-danger' : 'btn-success'} btn-sm" onclick="ProgrammesModule.toggleProgrammeStatus('${prog.id}', ${prog.is_active})">
            ${prog.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');

    Utils.renderIcons();
  },

  // Open modal to add a new programme
  openAddModal: () => {
    document.getElementById('programme-form-id').value = '';
    document.getElementById('programme-name').value = '';
    document.getElementById('programme-code').value = '';
    document.getElementById('programme-description').value = '';
    document.getElementById('programme-status').checked = true;
    document.getElementById('programme-modal-title').textContent = 'Add New Programme';
    Utils.openModal('modal-programme');
  },

  // Edit existing programme
  editProgramme: (id) => {
    const prog = AppState.programmes.find(p => p.id === id);
    if (!prog) return;

    document.getElementById('programme-form-id').value = prog.id;
    document.getElementById('programme-name').value = prog.name;
    document.getElementById('programme-code').value = prog.code;
    document.getElementById('programme-description').value = prog.description || '';
    document.getElementById('programme-status').checked = prog.is_active;
    document.getElementById('programme-modal-title').textContent = 'Edit Programme';
    Utils.openModal('modal-programme');
  },

  // Save programme (Insert or Update)
  saveProgramme: async (e) => {
    e.preventDefault();
    const id = document.getElementById('programme-form-id').value;
    const name = document.getElementById('programme-name').value.trim();
    const code = document.getElementById('programme-code').value.trim().toUpperCase();
    const description = document.getElementById('programme-description').value.trim();
    const is_active = document.getElementById('programme-status').checked;

    if (!name || !code) {
      Utils.showToast("Required Fields", "Please enter Programme Name and Code", "warning");
      return;
    }

    try {
      const payload = {
        name,
        code,
        description,
        is_active,
        fee_mode: code === 'SUBJECT' ? 'matric_cbse' : 'virtual_online',
        updated_at: new Date().toISOString()
      };

      if (id) {
        const { error } = await supabaseClient
          .from('programmes')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        await AuthModule.logAudit('update_programme', 'programmes', id, payload);
        Utils.showToast("Success", "Programme updated successfully", "success");
      } else {
        payload.created_at = new Date().toISOString();
        payload.sort_order = AppState.programmes.length + 1;
        const { data, error } = await supabaseClient
          .from('programmes')
          .insert([payload])
          .select();
        if (error) throw error;
        await AuthModule.logAudit('create_programme', 'programmes', data[0]?.id, payload);
        Utils.showToast("Success", "New programme added successfully", "success");
      }

      Utils.closeModal('modal-programme');
      await ProgrammesModule.loadProgrammes();
      ProgrammesModule.renderProgrammesTable();
    } catch (err) {
      console.error("Save programme error:", err);
      Utils.showToast("Error", err.message || "Failed to save programme", "error");
    }
  },

  // Toggle active/inactive
  toggleProgrammeStatus: async (id, currentStatus) => {
    try {
      const { error } = await supabaseClient
        .from('programmes')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      await AuthModule.logAudit('toggle_programme_status', 'programmes', id, { is_active: !currentStatus });
      Utils.showToast("Success", `Programme ${!currentStatus ? 'activated' : 'deactivated'}`, "success");
      await ProgrammesModule.loadProgrammes();
      ProgrammesModule.renderProgrammesTable();
    } catch (err) {
      Utils.showToast("Error", "Failed to update programme status", "error");
    }
  }
};

window.ProgrammesModule = ProgrammesModule;

