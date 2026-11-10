/**
 * EDUTRACK ATTENDANCE MANAGEMENT MODULE
 * Programme-Wise Daily Attendance Register, Segmented Controls, History & Analytics
 */

const AttendanceModule = {
  activeTab: 'register',
  selectedDate: new Date().toISOString().slice(0, 10),
  selectedProgrammeId: null,
  programmeRules: [],
  currentRoster: [],
  currentMarkedStatuses: {},
  currentSession: null,
  isSubmitting: false,

  // Default initial schedule rules
  defaultRules: [
    { code: 'SUBJECT', name: 'Subject', attendance_enabled: true, attendance_weekdays: [1, 2, 3, 4, 5, 6] },
    { code: 'HINDI', name: 'Hindi', attendance_enabled: true, attendance_weekdays: [1, 3, 5] },
    { code: 'WEEKEND_HINDI', name: 'Weekend Hindi', attendance_enabled: true, attendance_weekdays: [0, 6] },
    { code: 'ONLINE_HINDI', name: 'Online Hindi', attendance_enabled: false, attendance_weekdays: [] }
  ],

  init: async () => {
    // 1. Load programme attendance rules from database
    await AttendanceModule.loadProgrammeRules();

    // 2. Default to today's local date
    const todayStr = new Date().toISOString().slice(0, 10);
    AttendanceModule.selectedDate = todayStr;

    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) {
      dateInput.value = todayStr;
      dateInput.max = todayStr; // Prevent selecting future dates in UI
    }

    // 3. Populate available programmes for today
    AttendanceModule.syncProgrammeOptionsForDate();

    // 4. Load initial roster
    await AttendanceModule.loadRoster();

    // 5. Setup tab listeners
    AttendanceModule.setupTabListeners();
  },

  // Switch between Daily Register, History and Reports
  switchTab: (tabName) => {
    AttendanceModule.activeTab = tabName;
    const tabBtns = document.querySelectorAll('.attendance-tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const regSec = document.getElementById('attendance-section-register');
    const histSec = document.getElementById('attendance-section-history');
    const repSec = document.getElementById('attendance-section-reports');

    if (regSec) regSec.style.display = tabName === 'register' ? 'block' : 'none';
    if (histSec) histSec.style.display = tabName === 'history' ? 'block' : 'none';
    if (repSec) repSec.style.display = tabName === 'reports' ? 'block' : 'none';

    if (tabName === 'history') {
      AttendanceModule.loadHistory();
    } else if (tabName === 'reports') {
      AttendanceModule.loadReports();
    }

    Utils.renderIcons();
  },

  setupTabListeners: () => {
    const tabBtns = document.querySelectorAll('.attendance-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        AttendanceModule.switchTab(btn.dataset.tab);
      });
    });
  },

  // Load attendance rules from database or fallback defaults
  loadProgrammeRules: async () => {
    try {
      if (!supabaseClient) {
        AttendanceModule.programmeRules = AttendanceModule.defaultRules;
        return;
      }

      const { data, error } = await supabaseClient
        .from('programme_attendance_rules')
        .select(`*, programmes (*)`);

      if (!error && data && data.length > 0) {
        AttendanceModule.programmeRules = data;
      } else {
        AttendanceModule.programmeRules = AttendanceModule.defaultRules;
      }
    } catch (err) {
      console.warn("Notice loading attendance rules:", err);
      AttendanceModule.programmeRules = AttendanceModule.defaultRules;
    }
  },

  // Reusable Date parsing without UTC shift
  parseLocalDate: (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  },

  // Reusable Schedule Validation: checks if a programme is scheduled on a given date string
  isProgrammeScheduledOnDate: (programmeId, dateStr) => {
    if (!programmeId || !dateStr) return false;

    const prog = (AppState.programmes || []).find(p => p.id === programmeId);
    const progCode = prog ? (prog.code || prog.name).toUpperCase() : '';

    // Online Hindi is NEVER eligible for attendance
    if (progCode.includes('ONLINE')) {
      return false;
    }

    const dateObj = AttendanceModule.parseLocalDate(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    // Find rule in loaded DB rules
    const rule = AttendanceModule.programmeRules.find(r => 
      r.programme_id === programmeId || 
      (r.programmes && r.programmes.id === programmeId) ||
      (r.code && r.code.toUpperCase() === progCode)
    );

    if (rule) {
      if (!rule.attendance_enabled) return false;
      const weekdays = rule.attendance_weekdays || [];
      return weekdays.includes(dayOfWeek);
    }

    // Fallback to initial schedules based on programme code
    if (progCode.includes('SUBJECT')) {
      return [1, 2, 3, 4, 5, 6].includes(dayOfWeek); // Mon - Sat
    } else if (progCode.includes('WEEKEND')) {
      return [0, 6].includes(dayOfWeek); // Sat, Sun
    } else if (progCode.includes('HINDI')) {
      return [1, 3, 5].includes(dayOfWeek); // Mon, Wed, Fri
    }

    return false;
  },

  // Synchronize available programmes dropdown based on the selected date
  syncProgrammeOptionsForDate: () => {
    const progSelect = document.getElementById('attendance-programme-select');
    if (!progSelect) return [];

    const availableProgs = (AppState.programmes || []).filter(p => 
      p.is_active && AttendanceModule.isProgrammeScheduledOnDate(p.id, AttendanceModule.selectedDate)
    );

    if (availableProgs.length === 0) {
      progSelect.innerHTML = '<option value="">-- No scheduled programmes --</option>';
      progSelect.disabled = true;
      AttendanceModule.selectedProgrammeId = null;
      AttendanceModule.renderNoClassesEmptyState();
      return [];
    }

    progSelect.disabled = false;
    progSelect.innerHTML = availableProgs.map(p => `
      <option value="${p.id}" ${AttendanceModule.selectedProgrammeId === p.id ? 'selected' : ''}>
        ${Utils.escapeHtml(p.name)}
      </option>
    `).join('');

    // If current selected programme is not among available, pick first
    if (!availableProgs.some(p => p.id === AttendanceModule.selectedProgrammeId)) {
      AttendanceModule.selectedProgrammeId = availableProgs[0].id;
      progSelect.value = availableProgs[0].id;
    }

    return availableProgs;
  },

  // Handle Date Input change
  onDateChange: async (newDateStr) => {
    if (!newDateStr) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (newDateStr > todayStr) {
      Utils.showToast("Invalid Date", "Attendance cannot be marked for future dates.", "warning");
      const dateInput = document.getElementById('attendance-date-input');
      if (dateInput) dateInput.value = todayStr;
      AttendanceModule.selectedDate = todayStr;
      return;
    }

    AttendanceModule.selectedDate = newDateStr;
    const available = AttendanceModule.syncProgrammeOptionsForDate();

    if (available.length > 0) {
      await AttendanceModule.loadRoster();
    }
  },

  // Handle Programme Select change
  onProgrammeChange: async (newProgId) => {
    AttendanceModule.selectedProgrammeId = newProgId;
    await AttendanceModule.loadRoster();
  },

  // Fetch or filter eligible active student enrolments for the selected date & programme
  loadRoster: async () => {
    const container = document.getElementById('attendance-roster-container');
    const emptyState = document.getElementById('attendance-empty-state');
    const cancelledBanner = document.getElementById('attendance-cancelled-banner');
    const submitBtn = document.getElementById('btn-save-attendance');
    const markAllBtn = document.getElementById('btn-mark-all-present');

    if (!AttendanceModule.selectedProgrammeId) {
      AttendanceModule.renderNoClassesEmptyState();
      return;
    }

    if (cancelledBanner) cancelledBanner.style.display = 'none';

    // 1. Determine eligible active students for this programme & date
    const targetDate = AttendanceModule.selectedDate;
    const progId = AttendanceModule.selectedProgrammeId;

    const eligibleRoster = [];
    const seenStudentIds = new Set();

    (AppState.students || []).forEach(student => {
      if (student.status !== 'active') return;

      const activeEn = (student.enrollments || []).find(e => {
        if (e.programme_id !== progId) return false;
        if (e.status !== 'active') return false;
        if (e.start_date && e.start_date > targetDate) return false;
        if (e.end_date && e.end_date < targetDate) return false;
        return true;
      });

      if (activeEn && !seenStudentIds.has(student.id)) {
        seenStudentIds.add(student.id);
        eligibleRoster.push({
          student,
          enrollment: activeEn
        });
      }
    });

    // Sort alphabetically by student name
    eligibleRoster.sort((a, b) => a.student.name.localeCompare(b.student.name));
    AttendanceModule.currentRoster = eligibleRoster;
    AttendanceModule.currentMarkedStatuses = {};
    AttendanceModule.currentSession = null;

    // 2. Fetch existing saved session and records from database
    if (supabaseClient) {
      try {
        const { data: sessionData } = await supabaseClient
          .from('attendance_sessions')
          .select(`*, attendance_records (*)`)
          .eq('programme_id', progId)
          .eq('attendance_date', targetDate)
          .single();

        if (sessionData) {
          AttendanceModule.currentSession = sessionData;

          // If session is cancelled (Holiday / Class cancelled)
          if (sessionData.status === 'cancelled') {
            AttendanceModule.renderCancelledBanner(sessionData.cancellation_reason || 'Class cancelled');
            return;
          }

          // Populate previously marked student statuses
          (sessionData.attendance_records || []).forEach(rec => {
            AttendanceModule.currentMarkedStatuses[rec.enrollment_id] = rec.status;
          });
        }
      } catch (_) {}
    }

    // 3. Update Save button label (Save vs Update Attendance)
    if (submitBtn) {
      submitBtn.disabled = false;
      const isExisting = AttendanceModule.currentSession && AttendanceModule.currentSession.status === 'completed';
      submitBtn.innerHTML = isExisting 
        ? '<i data-lucide="check-check" style="width: 15px; height: 15px;"></i> Update Attendance'
        : '<i data-lucide="check" style="width: 15px; height: 15px;"></i> Save Attendance';
    }

    if (markAllBtn) markAllBtn.disabled = false;

    // 4. Render Roster Views
    AttendanceModule.renderRoster();
    AttendanceModule.updateSummaryCounts();
  },

  // Render when no classes are scheduled for the selected date
  renderNoClassesEmptyState: () => {
    const container = document.getElementById('attendance-roster-container');
    const emptyState = document.getElementById('attendance-empty-state');
    const cancelledBanner = document.getElementById('attendance-cancelled-banner');
    const submitBtn = document.getElementById('btn-save-attendance');
    const markAllBtn = document.getElementById('btn-mark-all-present');

    if (container) container.style.display = 'none';
    if (cancelledBanner) cancelledBanner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
    if (markAllBtn) markAllBtn.disabled = true;

    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1rem;">
          <i data-lucide="calendar-x" class="empty-state-icon"></i>
          <div class="empty-state-title">No offline classes are scheduled for this date.</div>
          <div class="empty-state-text">Check the weekday schedule or select another date from the register.</div>
        </div>
      `;
      Utils.renderIcons();
    }

    AttendanceModule.resetSummaryCounts();
  },

  // Render when class was cancelled / marked as holiday
  renderCancelledBanner: (reason) => {
    const container = document.getElementById('attendance-roster-container');
    const emptyState = document.getElementById('attendance-empty-state');
    const cancelledBanner = document.getElementById('attendance-cancelled-banner');
    const submitBtn = document.getElementById('btn-save-attendance');
    const markAllBtn = document.getElementById('btn-mark-all-present');

    if (container) container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
    if (markAllBtn) markAllBtn.disabled = true;

    if (cancelledBanner) {
      cancelledBanner.style.display = 'flex';
      cancelledBanner.innerHTML = `
        <div>
          <div class="attendance-cancelled-title">No Class Held (Holiday / Cancelled)</div>
          <div class="attendance-cancelled-reason">Reason: <strong>${Utils.escapeHtml(reason)}</strong></div>
          <div style="font-size: 0.74rem; color: #7f1d1d; margin-top: 0.25rem;">Students are not marked absent. This session is excluded from attendance percentages.</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="AttendanceModule.reopenCancelledSession()" style="background: #ffffff;">
          <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Reopen Register
        </button>
      `;
      Utils.renderIcons();
    }

    AttendanceModule.resetSummaryCounts();
  },

  // Reopen a cancelled session for marking
  reopenCancelledSession: async () => {
    if (!AttendanceModule.currentSession) return;
    if (confirm("Do you want to reopen this cancelled class register and record attendance?")) {
      try {
        if (supabaseClient) {
          await supabaseClient
            .from('attendance_sessions')
            .update({ status: 'open', cancellation_reason: null, updated_at: new Date().toISOString() })
            .eq('id', AttendanceModule.currentSession.id);
        }
        Utils.showToast("Reopened", "Register reopened for attendance marking.", "info");
        await AttendanceModule.loadRoster();
      } catch (e) {
        Utils.showToast("Error", "Failed to reopen session", "error");
      }
    }
  },

  // Render Roster (Desktop Table & Mobile Cards)
  renderRoster: () => {
    const container = document.getElementById('attendance-roster-container');
    const emptyState = document.getElementById('attendance-empty-state');
    const tbody = document.getElementById('attendance-roster-tbody');
    const mobileCards = document.getElementById('attendance-mobile-cards');

    if (emptyState) emptyState.style.display = 'none';
    if (container) container.style.display = 'block';

    const searchTerm = (document.getElementById('attendance-search-input')?.value || '').trim().toLowerCase();
    let roster = AttendanceModule.currentRoster;

    if (searchTerm) {
      roster = roster.filter(item => 
        item.student.name.toLowerCase().includes(searchTerm) ||
        item.student.student_id.toLowerCase().includes(searchTerm)
      );
    }

    if (roster.length === 0) {
      const noMatchHtml = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No students found matching your search.</td></tr>`;
      if (tbody) tbody.innerHTML = noMatchHtml;
      if (mobileCards) mobileCards.innerHTML = `<div class="text-center text-muted" style="padding: 2rem;">No students found matching your search.</div>`;
      return;
    }

    // 1. Desktop Table
    if (tbody) {
      tbody.innerHTML = roster.map((item, idx) => {
        const s = item.student;
        const e = item.enrollment;
        const status = AttendanceModule.currentMarkedStatuses[e.id] || null;

        return `
          <tr data-enrollment-id="${e.id}">
            <td style="color: var(--text-muted); font-size: 0.8rem; width: 40px;">${idx + 1}</td>
            <td><strong>${Utils.escapeHtml(s.student_id)}</strong></td>
            <td>
              <div style="font-weight: 600; font-size: 0.92rem;">${Utils.escapeHtml(s.name)}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${Utils.escapeHtml(s.parent_name || '')}</div>
            </td>
            <td>
              <span class="badge badge-neutral">
                ${Utils.escapeHtml(e.class_or_grade)} ${e.board ? '· ' + Utils.escapeHtml(e.board) : ''}
              </span>
            </td>
            <td style="text-align: right;">
              <div class="attendance-segmented-control">
                <button type="button" class="attendance-segmented-btn ${status === 'present' ? 'selected-present' : ''}" onclick="AttendanceModule.markStudent('${e.id}', 'present')">
                  <i data-lucide="check" style="width: 13px; height: 13px;"></i> Present
                </button>
                <button type="button" class="attendance-segmented-btn ${status === 'absent' ? 'selected-absent' : ''}" onclick="AttendanceModule.markStudent('${e.id}', 'absent')">
                  <i data-lucide="x" style="width: 13px; height: 13px;"></i> Absent
                </button>
                <button type="button" class="attendance-segmented-btn ${status === 'leave' ? 'selected-leave' : ''}" onclick="AttendanceModule.markStudent('${e.id}', 'leave')">
                  <i data-lucide="clock" style="width: 13px; height: 13px;"></i> Leave
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Mobile Roster Cards
    if (mobileCards) {
      mobileCards.innerHTML = roster.map(item => {
        const s = item.student;
        const e = item.enrollment;
        const status = AttendanceModule.currentMarkedStatuses[e.id] || null;

        return `
          <div class="attendance-student-card" data-enrollment-id="${e.id}">
            <div class="attendance-card-header">
              <div>
                <div class="attendance-card-name">${Utils.escapeHtml(s.name)}</div>
                <div class="attendance-card-meta">${Utils.escapeHtml(s.student_id)} • ${Utils.escapeHtml(e.class_or_grade)} ${e.board ? '· ' + Utils.escapeHtml(e.board) : ''}</div>
              </div>
            </div>

            <div class="attendance-card-controls">
              <div class="attendance-segmented-control">
                <button type="button" class="attendance-segmented-btn ${status === 'present' ? 'selected-present' : ''}" onclick="AttendanceModule.markStudent('${e.id}', 'present')">
                  <i data-lucide="check" style="width: 13px; height: 13px;"></i> Present
                </button>
                <button type="button" class="attendance-segmented-btn ${status === 'absent' ? 'selected-absent' : ''}" onclick="AttendanceModule.markStudent('${e.id}', 'absent')">
                  <i data-lucide="x" style="width: 13px; height: 13px;"></i> Absent
                </button>
                <button type="button" class="attendance-segmented-btn ${status === 'leave' ? 'selected-leave' : ''}" onclick="AttendanceModule.markStudent('${e.id}', 'leave')">
                  <i data-lucide="clock" style="width: 13px; height: 13px;"></i> Leave
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    Utils.renderIcons();
  },

  // Mark an individual student status
  markStudent: (enrollmentId, status) => {
    AttendanceModule.currentMarkedStatuses[enrollmentId] = status;

    // Fast DOM state update without full re-render
    const containers = document.querySelectorAll(`[data-enrollment-id="${enrollmentId}"] .attendance-segmented-control`);
    containers.forEach(ctrl => {
      const btns = ctrl.querySelectorAll('.attendance-segmented-btn');
      btns.forEach(btn => {
        btn.classList.remove('selected-present', 'selected-absent', 'selected-leave');
        const text = btn.textContent.toLowerCase();
        if (status === 'present' && text.includes('present')) btn.classList.add('selected-present');
        if (status === 'absent' && text.includes('absent')) btn.classList.add('selected-absent');
        if (status === 'leave' && text.includes('leave')) btn.classList.add('selected-leave');
      });
    });

    AttendanceModule.updateSummaryCounts();
  },

  // Mark All Present (Form only, does not auto-save)
  markAllPresent: () => {
    if (AttendanceModule.currentRoster.length === 0) return;

    AttendanceModule.currentRoster.forEach(item => {
      AttendanceModule.currentMarkedStatuses[item.enrollment.id] = 'present';
    });

    AttendanceModule.renderRoster();
    AttendanceModule.updateSummaryCounts();
    Utils.showToast("Marked Present", "All eligible students marked Present. Review and click Save Attendance.", "info", 4000);
  },

  // Mark No Class / Holiday for the day
  markNoClass: async () => {
    if (!AttendanceModule.selectedProgrammeId) return;

    const prog = (AppState.programmes || []).find(p => p.id === AttendanceModule.selectedProgrammeId);
    const progName = prog ? prog.name : 'this programme';
    const dateFormatted = Utils.formatDate(AttendanceModule.selectedDate);

    const reason = prompt(`Mark No Class / Holiday for ${progName} on ${dateFormatted}.\n\nEnter reason (e.g. Public Holiday, Heavy Rain, Teacher On Leave):`, "Public Holiday");
    if (reason === null) return; // User cancelled prompt

    const cleanReason = reason.trim() || 'Holiday / Cancelled';

    try {
      if (supabaseClient) {
        // Try atomic RPC first
        try {
          await supabaseClient.rpc('cancel_attendance_session', {
            p_programme_id: AttendanceModule.selectedProgrammeId,
            p_attendance_date: AttendanceModule.selectedDate,
            p_reason: cleanReason
          });
        } catch (_) {
          // Client fallback
          await supabaseClient
            .from('attendance_sessions')
            .upsert([{
              programme_id: AttendanceModule.selectedProgrammeId,
              attendance_date: AttendanceModule.selectedDate,
              status: 'cancelled',
              cancellation_reason: cleanReason,
              updated_at: new Date().toISOString()
            }], { onConflict: 'programme_id,attendance_date' });
        }
      }

      Utils.showToast("Class Cancelled", `Class on ${dateFormatted} recorded as Holiday / Cancelled.`, "info", 5000);
      await AttendanceModule.loadRoster();
    } catch (err) {
      console.error("Cancel class error:", err);
      Utils.showToast("Error", "Failed to record holiday", "error");
    }
  },

  // Live Summary counts update
  updateSummaryCounts: () => {
    const total = AttendanceModule.currentRoster.length;
    let present = 0;
    let absent = 0;
    let leave = 0;

    Object.values(AttendanceModule.currentMarkedStatuses).forEach(st => {
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'leave') leave++;
    });

    const unmarked = Math.max(0, total - (present + absent + leave));

    const totalEl = document.getElementById('att-summary-total');
    const presEl = document.getElementById('att-summary-present');
    const absEl = document.getElementById('att-summary-absent');
    const leaEl = document.getElementById('att-summary-leave');
    const unmEl = document.getElementById('att-summary-unmarked');

    if (totalEl) totalEl.textContent = total;
    if (presEl) presEl.textContent = present;
    if (absEl) absEl.textContent = absent;
    if (leaEl) leaEl.textContent = leave;
    if (unmEl) unmEl.textContent = unmarked;
  },

  resetSummaryCounts: () => {
    ['att-summary-total', 'att-summary-present', 'att-summary-absent', 'att-summary-leave', 'att-summary-unmarked'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  },

  // Save Attendance Register (Guards against unmarked students & double submits)
  saveAttendance: async () => {
    if (AttendanceModule.isSubmitting) return;

    if (AttendanceModule.currentRoster.length === 0) {
      Utils.showToast("Notice", "No eligible students in register to save.", "warning");
      return;
    }

    // Verify all students are marked
    const unmarked = AttendanceModule.currentRoster.filter(item => !AttendanceModule.currentMarkedStatuses[item.enrollment.id]);
    if (unmarked.length > 0) {
      Utils.showToast("Unmarked Students", `Please mark attendance for all ${AttendanceModule.currentRoster.length} students (${unmarked.length} unmarked).`, "warning", 5000);
      return;
    }

    const submitBtn = document.getElementById('btn-save-attendance');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    AttendanceModule.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Saving Register...</span>';
    }

    try {
      const progId = AttendanceModule.selectedProgrammeId;
      const attDate = AttendanceModule.selectedDate;

      const recordsPayload = AttendanceModule.currentRoster.map(item => ({
        enrollment_id: item.enrollment.id,
        status: AttendanceModule.currentMarkedStatuses[item.enrollment.id],
        remarks: null
      }));

      let rpcSucceeded = false;

      // 1. Try atomic Supabase RPC
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient.rpc('save_attendance_register', {
            p_programme_id: progId,
            p_attendance_date: attDate,
            p_records: recordsPayload
          });

          if (!error && data && data.success) {
            rpcSucceeded = true;
          }
        } catch (_) {
          rpcSucceeded = false;
        }

        // 2. Client fallback execution
        if (!rpcSucceeded) {
          // Upsert session
          const { data: sessData, error: sessErr } = await supabaseClient
            .from('attendance_sessions')
            .upsert([{
              programme_id: progId,
              attendance_date: attDate,
              status: 'completed',
              cancellation_reason: null,
              updated_at: new Date().toISOString()
            }], { onConflict: 'programme_id,attendance_date' })
            .select();

          if (sessErr) throw sessErr;
          const sessionId = sessData[0].id;

          // Upsert records
          for (const rec of recordsPayload) {
            await supabaseClient
              .from('attendance_records')
              .upsert([{
                session_id: sessionId,
                enrollment_id: rec.enrollment_id,
                status: rec.status,
                remarks: rec.remarks,
                updated_at: new Date().toISOString()
              }], { onConflict: 'session_id,enrollment_id' });
          }
        }
      }

      await AuthModule.logAudit('save_attendance', 'attendance_sessions', `${progId}-${attDate}`, { count: recordsPayload.length });
      Utils.showToast("Attendance Saved", `Attendance register for ${Utils.formatDate(attDate)} saved successfully.`, "success");

      await AttendanceModule.loadRoster();

    } catch (err) {
      console.error("Save attendance error:", err);
      Utils.showToast("Error", err.message || "Failed to save attendance register", "error");
    } finally {
      AttendanceModule.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        Utils.renderIcons();
      }
    }
  },

  // ===========================================================================
  // SECTION B: ATTENDANCE HISTORY
  // ===========================================================================
  loadHistory: async () => {
    const tbody = document.getElementById('attendance-history-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Loading attendance history...</td></tr>`;

    try {
      if (!supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Database client not connected.</td></tr>`;
        return;
      }

      const { data: sessions, error } = await supabaseClient
        .from('attendance_sessions')
        .select(`
          *,
          programmes (*),
          attendance_records (*)
        `)
        .order('attendance_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-muted" style="padding: 2.5rem 1rem;">
              <div class="empty-state-title">No attendance sessions recorded yet</div>
              <div class="empty-state-text">Attendance marked in the Daily Register will appear here.</div>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = sessions.map(sess => {
        const prog = sess.programmes?.name || 'Programme';
        const isCancelled = sess.status === 'cancelled';
        const records = sess.attendance_records || [];
        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const leave = records.filter(r => r.status === 'leave').length;
        const total = records.length;

        return `
          <tr>
            <td><strong>${Utils.formatDate(sess.attendance_date)}</strong></td>
            <td><span class="badge badge-neutral">${Utils.escapeHtml(prog)}</span></td>
            <td><strong>${isCancelled ? '—' : total}</strong></td>
            <td><span style="color: var(--status-paid); font-weight: 600;">${isCancelled ? '—' : present}</span></td>
            <td><span style="color: var(--status-unpaid); font-weight: 600;">${isCancelled ? '—' : absent}</span></td>
            <td><span style="color: #d97706; font-weight: 600;">${isCancelled ? '—' : leave}</span></td>
            <td>
              <span class="badge ${isCancelled ? 'badge-neutral' : 'badge-paid'}">
                ${isCancelled ? 'Cancelled / Holiday' : 'Completed'}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-secondary btn-sm" onclick="AttendanceModule.openHistoricalRegister('${sess.attendance_date}', '${sess.programme_id}')">
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i> Open Register
              </button>
            </td>
          </tr>
        `;
      }).join('');

      Utils.renderIcons();

    } catch (err) {
      console.error("Load history error:", err);
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Failed to load attendance history.</td></tr>`;
    }
  },

  // Open an existing historical register for viewing or editing
  openHistoricalRegister: async (dateStr, progId) => {
    AttendanceModule.selectedDate = dateStr;
    AttendanceModule.selectedProgrammeId = progId;

    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) dateInput.value = dateStr;

    AttendanceModule.syncProgrammeOptionsForDate();
    const progSelect = document.getElementById('attendance-programme-select');
    if (progSelect) progSelect.value = progId;

    AttendanceModule.switchTab('register');
    await AttendanceModule.loadRoster();
  },

  // ===========================================================================
  // SECTION C: ATTENDANCE REPORTS & ANALYTICS
  // ===========================================================================
  loadReports: async () => {
    const tbody = document.getElementById('attendance-reports-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Calculating attendance statistics...</td></tr>`;

    try {
      if (!supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Database client not connected.</td></tr>`;
        return;
      }

      // Fetch completed sessions with records
      const { data: records, error } = await supabaseClient
        .from('attendance_records')
        .select(`
          *,
          attendance_sessions (*),
          enrollments (*, students (*), programmes (*))
        `);

      if (error) throw error;

      // Group records by enrollment_id
      const enrolStats = {};
      (records || []).forEach(r => {
        const sess = r.attendance_sessions;
        if (!sess || sess.status === 'cancelled') return; // Exclude cancelled sessions!

        const eId = r.enrollment_id;
        if (!enrolStats[eId]) {
          enrolStats[eId] = {
            student: r.enrollments?.students,
            programme: r.enrollments?.programmes,
            enrollment: r.enrollments,
            present: 0,
            absent: 0,
            leave: 0,
            totalSessions: 0
          };
        }

        enrolStats[eId].totalSessions++;
        if (r.status === 'present') enrolStats[eId].present++;
        else if (r.status === 'absent') enrolStats[eId].absent++;
        else if (r.status === 'leave') enrolStats[eId].leave++;
      });

      const list = Object.values(enrolStats);
      list.sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || ''));

      // Summary counts
      let grandPresent = 0;
      let grandAbsent = 0;
      let grandLeave = 0;
      let grandSessions = 0;

      list.forEach(item => {
        grandPresent += item.present;
        grandAbsent += item.absent;
        grandLeave += item.leave;
        grandSessions += item.totalSessions;
      });

      const repPresEl = document.getElementById('att-rep-stat-present');
      const repAbsEl = document.getElementById('att-rep-stat-absent');
      const repLeaEl = document.getElementById('att-rep-stat-leave');
      const repRateEl = document.getElementById('att-rep-stat-rate');

      const grandDenominator = grandPresent + grandAbsent;
      const overallRate = grandDenominator > 0 ? ((grandPresent / grandDenominator) * 100).toFixed(1) : '100.0';

      if (repPresEl) repPresEl.textContent = grandPresent;
      if (repAbsEl) repAbsEl.textContent = grandAbsent;
      if (repLeaEl) repLeaEl.textContent = grandLeave;
      if (repRateEl) repRateEl.textContent = `${overallRate}%`;

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem 1rem;">No attendance data available to report yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(item => {
        const denom = item.present + item.absent;
        const rate = denom > 0 ? ((item.present / denom) * 100).toFixed(1) : '100.0';
        const rateNum = parseFloat(rate);
        const rateColor = rateNum >= 85 ? 'var(--status-paid)' : (rateNum >= 75 ? '#d97706' : 'var(--status-unpaid)');

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(item.student?.student_id || '—')}</strong></td>
            <td>
              <div style="font-weight: 600;">${Utils.escapeHtml(item.student?.name || '—')}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${Utils.escapeHtml(item.programme?.name || '—')} (${Utils.escapeHtml(item.enrollment?.class_or_grade || '')})</div>
            </td>
            <td><strong>${item.totalSessions}</strong></td>
            <td><span style="color: var(--status-paid); font-weight: 600;">${item.present}</span></td>
            <td><span style="color: var(--status-unpaid); font-weight: 600;">${item.absent}</span></td>
            <td><span style="color: #d97706; font-weight: 600;">${item.leave}</span></td>
            <td>
              <strong style="color: ${rateColor}; font-size: 0.95rem;">${rate}%</strong>
            </td>
          </tr>
        `;
      }).join('');

      Utils.renderIcons();

    } catch (err) {
      console.error("Load reports error:", err);
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Failed to generate attendance report.</td></tr>`;
    }
  },

  // Export Attendance Report to Excel using SheetJS
  exportToExcel: () => {
    if (typeof XLSX === 'undefined') {
      Utils.showToast("Notice", "Excel export library loading. Please try again.", "warning");
      return;
    }

    const rows = [];
    const tableRows = document.querySelectorAll('#attendance-reports-tbody tr');
    tableRows.forEach(tr => {
      const cols = tr.querySelectorAll('td');
      if (cols.length >= 7) {
        rows.push({
          "Student ID": cols[0].innerText.trim(),
          "Student & Programme": cols[1].innerText.trim(),
          "Sessions Held": cols[2].innerText.trim(),
          "Present Days": cols[3].innerText.trim(),
          "Absent Days": cols[4].innerText.trim(),
          "Leave Days": cols[5].innerText.trim(),
          "Attendance %": cols[6].innerText.trim()
        });
      }
    });

    if (rows.length === 0) {
      Utils.showToast("Notice", "No attendance records to export.", "info");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, `EduTrack_Attendance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Utils.showToast("Export Complete", "Attendance report exported to Excel.", "success");
  },

  // ===========================================================================
  // SECTION D: STUDENT PROFILE ATTENDANCE INTEGRATION
  // ===========================================================================
  renderStudentProfileAttendance: async (studentId) => {
    const container = document.getElementById('profile-attendance-container');
    if (!container) return;

    container.innerHTML = `<div class="text-muted" style="padding: 0.75rem 0; font-size: 0.85rem;">Loading attendance statistics...</div>`;

    try {
      if (!supabaseClient) {
        container.innerHTML = `<div class="text-muted" style="padding: 0.75rem 0; font-size: 0.85rem;">No attendance data.</div>`;
        return;
      }

      // Fetch student active and historical enrolments
      const student = (AppState.students || []).find(s => s.id === studentId);
      if (!student || !student.enrollments || student.enrollments.length === 0) {
        container.innerHTML = `<div class="text-muted" style="padding: 0.75rem 0; font-size: 0.85rem;">No programme enrolments recorded.</div>`;
        return;
      }

      // Exclude Online Hindi from attendance calculations
      const eligibleEnrolments = student.enrollments.filter(e => {
        const progName = (e.programmes?.name || '').toLowerCase();
        return !progName.includes('online');
      });

      if (eligibleEnrolments.length === 0) {
        container.innerHTML = `<div class="text-muted" style="padding: 0.75rem 0; font-size: 0.85rem;">Online Hindi coaching does not require offline attendance tracking.</div>`;
        return;
      }

      const enrollmentIds = eligibleEnrolments.map(e => e.id);

      const { data: records } = await supabaseClient
        .from('attendance_records')
        .select(`*, attendance_sessions (*)`)
        .in('enrollment_id', enrollmentIds);

      const statsByEnrolment = {};
      eligibleEnrolments.forEach(e => {
        statsByEnrolment[e.id] = {
          enrolment: e,
          present: 0,
          absent: 0,
          leave: 0,
          total: 0
        };
      });

      (records || []).forEach(r => {
        const sess = r.attendance_sessions;
        if (!sess || sess.status === 'cancelled') return; // Exclude cancelled!
        if (statsByEnrolment[r.enrollment_id]) {
          statsByEnrolment[r.enrollment_id].total++;
          if (r.status === 'present') statsByEnrolment[r.enrollment_id].present++;
          else if (r.status === 'absent') statsByEnrolment[r.enrollment_id].absent++;
          else if (r.status === 'leave') statsByEnrolment[r.enrollment_id].leave++;
        }
      });

      container.innerHTML = `
        <div class="profile-attendance-grid">
          ${eligibleEnrolments.map(e => {
            const st = statsByEnrolment[e.id];
            const denom = st.present + st.absent;
            const rate = denom > 0 ? ((st.present / denom) * 100).toFixed(1) : (st.total === 0 ? '—' : '100.0');
            const rateColor = rate !== '—' && parseFloat(rate) >= 85 ? 'var(--status-paid)' : (parseFloat(rate) >= 75 ? '#d97706' : 'var(--status-unpaid)');

            return `
              <div class="profile-attendance-card">
                <div class="profile-attendance-title">
                  <span>${Utils.escapeHtml(e.programmes?.name || 'Programme')} (${Utils.escapeHtml(e.class_or_grade)})</span>
                  <span class="badge ${e.status === 'active' ? 'badge-paid' : 'badge-neutral'}">${e.status}</span>
                </div>
                <div class="profile-attendance-rate" style="color: ${rateColor};">
                  ${rate !== '—' ? rate + '%' : 'No Records'}
                </div>
                <div class="profile-attendance-breakdown">
                  <span>Present: <strong style="color: var(--status-paid);">${st.present}</strong></span>
                  <span>Absent: <strong style="color: var(--status-unpaid);">${st.absent}</strong></span>
                  <span>Leave: <strong style="color: #d97706;">${st.leave}</strong></span>
                  <span>Sessions: <strong>${st.total}</strong></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

    } catch (err) {
      console.warn("Student profile attendance error:", err);
      container.innerHTML = `<div class="text-muted" style="padding: 0.75rem 0; font-size: 0.85rem;">Attendance summary unavailable.</div>`;
    }
  }
};

window.AttendanceModule = AttendanceModule;
