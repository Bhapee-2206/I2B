/**
 * EDUTRACK ATTENDANCE MANAGEMENT MODULE (V2 - PRODUCTION QUALITY)
 * Fast Mobile Administrative Register, Strictly Transactional Save, Robust Error Handling
 */

const AttendanceModule = {
  activeTab: 'register',
  selectedDate: '',
  selectedProgrammeId: null,
  programmeRules: [],
  currentRoster: [],
  currentMarkedStatuses: {},
  previousMarkedState: null,
  currentSession: null,
  isSubmitting: false,
  searchTerm: '',

  // Asia/Kolkata Calendar Helper (Date-only YYYY-MM-DD, Zero UTC shift)
  getLocalDateString: (d = new Date()) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(d);
    } catch (_) {
      // Fallback with timezone offset adjustment
      const tzOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(d.getTime() + tzOffset);
      return istDate.toISOString().slice(0, 10);
    }
  },

  // Parse date string without timezone shifts
  parseLocalDate: (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  },

  // Format readable date (e.g. "Tuesday, 10 November 2026")
  formatReadableDate: (dateStr) => {
    if (!dateStr) return '—';
    const dateObj = AttendanceModule.parseLocalDate(dateStr);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  },

  // Default initial schedule rules
  defaultRules: [
    { code: 'SUBJECT', name: 'Subject', attendance_enabled: true, attendance_weekdays: [1, 2, 3, 4, 5, 6] },
    { code: 'HINDI', name: 'Hindi', attendance_enabled: true, attendance_weekdays: [1, 3, 5] },
    { code: 'WEEKEND_HINDI', name: 'Weekend Hindi', attendance_enabled: true, attendance_weekdays: [0, 6] },
    { code: 'ONLINE_HINDI', name: 'Online Hindi', attendance_enabled: false, attendance_weekdays: [] }
  ],

  // 1. Module Initialization
  init: async () => {
    const todayStr = AttendanceModule.getLocalDateString();
    if (!AttendanceModule.selectedDate) {
      AttendanceModule.selectedDate = todayStr;
    }

    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) {
      dateInput.value = AttendanceModule.selectedDate;
      dateInput.max = todayStr; // Prevent picking future dates
    }

    AttendanceModule.updateReadableDateDisplay();
    AttendanceModule.setupTabListeners();

    // Load database rules
    await AttendanceModule.loadProgrammeRules();

    // Populate programme chips
    AttendanceModule.syncProgrammeOptionsForDate();

    // Load roster
    await AttendanceModule.loadRoster();

    // Populate history filters
    AttendanceModule.populateHistoryFilters();
  },

  // Update readable date label
  updateReadableDateDisplay: () => {
    const readableEl = document.getElementById('attendance-readable-date');
    if (readableEl) {
      readableEl.textContent = AttendanceModule.formatReadableDate(AttendanceModule.selectedDate);
    }
    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput && dateInput.value !== AttendanceModule.selectedDate) {
      dateInput.value = AttendanceModule.selectedDate;
    }
    // Disable next button if at today
    const nextBtn = document.getElementById('btn-attendance-next-day');
    if (nextBtn) {
      nextBtn.disabled = AttendanceModule.selectedDate >= AttendanceModule.getLocalDateString();
    }
  },

  // Date Navigation: Step by +1 or -1 days
  changeDateStep: async (deltaDays) => {
    const current = AttendanceModule.parseLocalDate(AttendanceModule.selectedDate);
    current.setDate(current.getDate() + deltaDays);

    const newDateStr = AttendanceModule.getLocalDateString(current);
    const todayStr = AttendanceModule.getLocalDateString();

    if (newDateStr > todayStr) {
      Utils.showToast("Future Date", "Cannot record attendance for future dates.", "warning");
      return;
    }

    AttendanceModule.selectedDate = newDateStr;
    AttendanceModule.updateReadableDateDisplay();
    AttendanceModule.syncProgrammeOptionsForDate();
    await AttendanceModule.loadRoster();
  },

  // Jump to Today shortcut
  goToToday: async () => {
    const todayStr = AttendanceModule.getLocalDateString();
    if (AttendanceModule.selectedDate === todayStr) return;
    AttendanceModule.selectedDate = todayStr;
    AttendanceModule.updateReadableDateDisplay();
    AttendanceModule.syncProgrammeOptionsForDate();
    await AttendanceModule.loadRoster();
  },

  // Native Date Picker Change
  onDateChange: async (newDateStr) => {
    if (!newDateStr) return;
    const todayStr = AttendanceModule.getLocalDateString();

    if (newDateStr > todayStr) {
      Utils.showToast("Invalid Date", "Attendance cannot be marked for future dates.", "warning");
      AttendanceModule.selectedDate = todayStr;
      AttendanceModule.updateReadableDateDisplay();
      return;
    }

    AttendanceModule.selectedDate = newDateStr;
    AttendanceModule.updateReadableDateDisplay();
    AttendanceModule.syncProgrammeOptionsForDate();
    await AttendanceModule.loadRoster();
  },

  // Navigation Tabs Switcher
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
      btn.onclick = () => AttendanceModule.switchTab(btn.dataset.tab);
    });
  },

  // Load Attendance Rules from Supabase
  loadProgrammeRules: async () => {
    try {
      if (!supabaseClient) {
        AttendanceModule.programmeRules = AttendanceModule.defaultRules;
        return;
      }

      const { data, error } = await supabaseClient
        .from('programme_attendance_rules')
        .select(`*, programmes (*)`);

      if (error) {
        console.error("Error loading programme rules from Supabase:", error);
        Utils.showToast("Configuration Notice", "Could not load attendance rules from database. Using default timetable.", "warning");
        AttendanceModule.programmeRules = AttendanceModule.defaultRules;
        return;
      }

      if (data && data.length > 0) {
        AttendanceModule.programmeRules = data;
      } else {
        AttendanceModule.programmeRules = AttendanceModule.defaultRules;
      }
    } catch (err) {
      console.warn("Exception loading attendance rules:", err);
      AttendanceModule.programmeRules = AttendanceModule.defaultRules;
    }
  },

  // Check if Programme is scheduled on target date
  isProgrammeScheduledOnDate: (programmeId, dateStr) => {
    if (!programmeId || !dateStr) return false;

    const prog = (AppState.programmes || []).find(p => p.id === programmeId);
    const progCode = prog ? (prog.code || prog.name).toUpperCase() : '';

    // Online Hindi is NEVER eligible for offline attendance
    if (progCode.includes('ONLINE')) {
      return false;
    }

    const dateObj = AttendanceModule.parseLocalDate(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    // 1. Check against loaded DB rules
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

    // 2. Default initial timetable rules
    if (progCode.includes('SUBJECT')) {
      return [1, 2, 3, 4, 5, 6].includes(dayOfWeek); // Mon - Sat
    } else if (progCode.includes('WEEKEND')) {
      return [0, 6].includes(dayOfWeek); // Sat, Sun
    } else if (progCode.includes('HINDI')) {
      return [1, 3, 5].includes(dayOfWeek); // Mon, Wed, Fri
    }

    return false;
  },

  // Synchronize Programme Chips for the Selected Date
  syncProgrammeOptionsForDate: () => {
    const chipsContainer = document.getElementById('attendance-programme-chips');
    if (!chipsContainer) return [];

    const availableProgs = (AppState.programmes || []).filter(p => 
      p.is_active && AttendanceModule.isProgrammeScheduledOnDate(p.id, AttendanceModule.selectedDate)
    );

    if (availableProgs.length === 0) {
      chipsContainer.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-muted);">No offline classes scheduled</span>`;
      AttendanceModule.selectedProgrammeId = null;
      AttendanceModule.renderNoClassesEmptyState();
      return [];
    }

    // Ensure selected programme is among available
    if (!availableProgs.some(p => p.id === AttendanceModule.selectedProgrammeId)) {
      AttendanceModule.selectedProgrammeId = availableProgs[0].id;
    }

    chipsContainer.innerHTML = availableProgs.map(p => {
      const isSelected = p.id === AttendanceModule.selectedProgrammeId;
      return `
        <button type="button" 
          class="programme-chip ${isSelected ? 'active' : ''}" 
          onclick="AttendanceModule.onProgrammeSelect('${p.id}')">
          ${Utils.escapeHtml(p.name)}
        </button>
      `;
    }).join('');

    return availableProgs;
  },

  // Programme Chip Selection
  onProgrammeSelect: async (progId) => {
    if (AttendanceModule.selectedProgrammeId === progId) return;
    AttendanceModule.selectedProgrammeId = progId;
    AttendanceModule.syncProgrammeOptionsForDate();
    await AttendanceModule.loadRoster();
  },

  // Search Input Handler
  onSearchInput: (term) => {
    AttendanceModule.searchTerm = (term || '').trim().toLowerCase();
    AttendanceModule.renderRoster();
  },

  // Load Student Roster Directly from Supabase (Source of Truth)
  loadRoster: async () => {
    const container = document.getElementById('attendance-roster-container');
    const emptyState = document.getElementById('attendance-empty-state');
    const cancelledBanner = document.getElementById('attendance-cancelled-banner');
    const submitBtn = document.getElementById('btn-save-attendance');
    const markAllBtn = document.getElementById('btn-mark-all-present');
    const tbody = document.getElementById('attendance-roster-tbody');
    const mobileCards = document.getElementById('attendance-mobile-cards');

    if (!AttendanceModule.selectedProgrammeId) {
      AttendanceModule.renderNoClassesEmptyState();
      return;
    }

    if (cancelledBanner) cancelledBanner.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (container) container.style.display = 'block';

    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">Loading student roster...</td></tr>`;
    if (mobileCards) mobileCards.innerHTML = `<div class="text-center text-muted" style="padding: 2rem;">Loading student roster...</div>`;

    const targetDate = AttendanceModule.selectedDate;
    const progId = AttendanceModule.selectedProgrammeId;

    try {
      let eligibleRoster = [];

      // Query database for active student enrolments for this programme
      if (supabaseClient) {
        const { data: enrolments, error: enrolErr } = await supabaseClient
          .from('enrollments')
          .select(`
            id,
            programme_id,
            class_or_grade,
            board,
            agreed_fee,
            start_date,
            end_date,
            status,
            students!inner (
              id,
              student_id,
              name,
              parent_name,
              whatsapp_number,
              status
            )
          `)
          .eq('programme_id', progId)
          .eq('status', 'active')
          .eq('students.status', 'active');

        if (enrolErr) {
          console.error("Database roster query error:", enrolErr);
          throw enrolErr;
        }

        (enrolments || []).forEach(e => {
          if (e.start_date && e.start_date > targetDate) return;
          if (e.end_date && e.end_date < targetDate) return;
          eligibleRoster.push({
            student: e.students,
            enrollment: e
          });
        });
      } else {
        // Fallback to AppState
        (AppState.students || []).forEach(student => {
          if (student.status !== 'active') return;
          const activeEn = (student.enrollments || []).find(e => {
            if (e.programme_id !== progId || e.status !== 'active') return false;
            if (e.start_date && e.start_date > targetDate) return false;
            if (e.end_date && e.end_date < targetDate) return false;
            return true;
          });
          if (activeEn) {
            eligibleRoster.push({ student, enrollment: activeEn });
          }
        });
      }

      // Sort alphabetically by student name
      eligibleRoster.sort((a, b) => a.student.name.localeCompare(b.student.name));
      AttendanceModule.currentRoster = eligibleRoster;
      AttendanceModule.currentMarkedStatuses = {};
      AttendanceModule.currentSession = null;

      // Fetch saved session & records for this programme and date
      if (supabaseClient) {
        const { data: sessionData } = await supabaseClient
          .from('attendance_sessions')
          .select(`*, attendance_records (*)`)
          .eq('programme_id', progId)
          .eq('attendance_date', targetDate)
          .single();

        if (sessionData) {
          AttendanceModule.currentSession = sessionData;

          // Check if session was cancelled / marked as holiday
          if (sessionData.status === 'cancelled') {
            AttendanceModule.renderCancelledBanner(sessionData.cancellation_reason || 'Class cancelled');
            return;
          }

          // Populate saved records
          (sessionData.attendance_records || []).forEach(rec => {
            AttendanceModule.currentMarkedStatuses[rec.enrollment_id] = rec.status;
          });
        }
      }

      // Update submit button label
      if (submitBtn) {
        submitBtn.disabled = false;
        const isExisting = AttendanceModule.currentSession && AttendanceModule.currentSession.status === 'completed';
        submitBtn.innerHTML = isExisting 
          ? '<i data-lucide="check-check" style="width: 15px; height: 15px;"></i> Update Attendance'
          : '<i data-lucide="check" style="width: 15px; height: 15px;"></i> Save Attendance';
      }

      if (markAllBtn) markAllBtn.disabled = false;

      // Render Roster Views
      AttendanceModule.renderRoster();
      AttendanceModule.updateSummaryCounts();

    } catch (err) {
      console.error("Load roster error:", err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem; color: var(--status-unpaid);">Error loading roster: ${Utils.escapeHtml(err.message || 'Database error')}</td></tr>`;
      if (mobileCards) mobileCards.innerHTML = `<div class="text-center text-muted" style="padding: 2rem; color: var(--status-unpaid);">Error loading roster: ${Utils.escapeHtml(err.message || 'Database error')}</div>`;
      Utils.showToast("Database Error", "Failed to load active roster from database.", "error");
    }
  },

  // Render when no classes are scheduled
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
          <div class="empty-state-text">Select another date or check programme schedule settings.</div>
        </div>
      `;
      Utils.renderIcons();
    }

    AttendanceModule.resetSummaryCounts();
  },

  // Render when session was cancelled / holiday
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

  // Reopen Cancelled Session (Transactional RPC)
  reopenCancelledSession: async () => {
    if (!AttendanceModule.selectedProgrammeId || !AttendanceModule.selectedDate) return;
    const prog = (AppState.programmes || []).find(p => p.id === AttendanceModule.selectedProgrammeId);
    const progName = prog ? prog.name : 'this programme';
    const dateFormatted = AttendanceModule.formatReadableDate(AttendanceModule.selectedDate);

    if (confirm(`Do you want to reopen the cancelled register for ${progName} on ${dateFormatted}?\n\nAttendance will need to be marked and saved.`)) {
      try {
        if (supabaseClient) {
          const { data, error } = await supabaseClient.rpc('reopen_attendance_session', {
            p_programme_id: AttendanceModule.selectedProgrammeId,
            p_attendance_date: AttendanceModule.selectedDate
          });

          if (error) throw error;
        }

        Utils.showToast("Register Reopened", `Register reopened for ${dateFormatted}.`, "success");
        await AttendanceModule.loadRoster();
      } catch (err) {
        console.error("Reopen register error:", err);
        Utils.showToast("Error", err.message || "Failed to reopen register", "error");
      }
    }
  },

  // Render Roster: Desktop Table + Mobile Cards
  renderRoster: () => {
    const tbody = document.getElementById('attendance-roster-tbody');
    const mobileCards = document.getElementById('attendance-mobile-cards');

    let roster = AttendanceModule.currentRoster;

    if (AttendanceModule.searchTerm) {
      roster = roster.filter(item => 
        item.student.name.toLowerCase().includes(AttendanceModule.searchTerm) ||
        item.student.student_id.toLowerCase().includes(AttendanceModule.searchTerm)
      );
    }

    if (roster.length === 0) {
      const emptyMsg = `No matching students found.`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2.5rem 1rem;">${emptyMsg}</td></tr>`;
      if (mobileCards) mobileCards.innerHTML = `<div class="text-center text-muted" style="padding: 2.5rem 1rem; background: #ffffff; border: 1px solid var(--border-light); border-radius: var(--radius-md);">${emptyMsg}</div>`;
      return;
    }

    // 1. Desktop Table Roster
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

    // 2. Mobile Roster Cards (44px min-height touch controls)
    if (mobileCards) {
      mobileCards.innerHTML = roster.map(item => {
        const s = item.student;
        const e = item.enrollment;
        const status = AttendanceModule.currentMarkedStatuses[e.id] || null;

        return `
          <div class="attendance-student-card" data-enrollment-id="${e.id}">
            <div class="attendance-student-header">
              <div class="attendance-student-info">
                <div class="attendance-student-name">${Utils.escapeHtml(s.name)}</div>
                <div class="attendance-student-meta">
                  <span class="attendance-student-id">${Utils.escapeHtml(s.student_id)}</span>
                  <span class="attendance-student-divider">•</span>
                  <span class="attendance-student-class">${Utils.escapeHtml(e.class_or_grade)} ${e.board ? '· ' + Utils.escapeHtml(e.board) : ''}</span>
                </div>
              </div>
              <div class="attendance-status-indicator ${status || 'unmarked'}" id="status-pill-${e.id}">
                ${status ? status.toUpperCase() : 'UNMARKED'}
              </div>
            </div>

            <div class="attendance-action-grid">
              <button type="button" 
                class="attendance-btn btn-present ${status === 'present' ? 'active' : ''}" 
                onclick="AttendanceModule.markStudent('${e.id}', 'present')"
                aria-label="Mark ${Utils.escapeHtml(s.name)} Present">
                <i data-lucide="check" style="width: 15px; height: 15px;"></i> Present
              </button>

              <button type="button" 
                class="attendance-btn btn-absent ${status === 'absent' ? 'active' : ''}" 
                onclick="AttendanceModule.markStudent('${e.id}', 'absent')"
                aria-label="Mark ${Utils.escapeHtml(s.name)} Absent">
                <i data-lucide="x" style="width: 15px; height: 15px;"></i> Absent
              </button>

              <button type="button" 
                class="attendance-btn btn-leave ${status === 'leave' ? 'active' : ''}" 
                onclick="AttendanceModule.markStudent('${e.id}', 'leave')"
                aria-label="Mark ${Utils.escapeHtml(s.name)} Leave">
                <i data-lucide="clock" style="width: 15px; height: 15px;"></i> Leave
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    Utils.renderIcons();
  },

  // Mark Individual Student Status
  markStudent: (enrollmentId, status) => {
    AttendanceModule.currentMarkedStatuses[enrollmentId] = status;

    // Fast DOM state update for mobile card
    const card = document.querySelector(`.attendance-student-card[data-enrollment-id="${enrollmentId}"]`);
    if (card) {
      const btns = card.querySelectorAll('.attendance-btn');
      btns.forEach(btn => {
        btn.classList.remove('active');
        if (status === 'present' && btn.classList.contains('btn-present')) btn.classList.add('active');
        if (status === 'absent' && btn.classList.contains('btn-absent')) btn.classList.add('active');
        if (status === 'leave' && btn.classList.contains('btn-leave')) btn.classList.add('active');
      });

      const pill = card.querySelector(`#status-pill-${enrollmentId}`);
      if (pill) {
        pill.className = `attendance-status-indicator ${status}`;
        pill.textContent = status.toUpperCase();
      }
    }

    // Fast DOM update for desktop table
    const tableRow = document.querySelector(`tr[data-enrollment-id="${enrollmentId}"]`);
    if (tableRow) {
      const segBtns = tableRow.querySelectorAll('.attendance-segmented-btn');
      segBtns.forEach(btn => {
        btn.classList.remove('selected-present', 'selected-absent', 'selected-leave');
        const text = btn.textContent.toLowerCase();
        if (status === 'present' && text.includes('present')) btn.classList.add('selected-present');
        if (status === 'absent' && text.includes('absent')) btn.classList.add('selected-absent');
        if (status === 'leave' && text.includes('leave')) btn.classList.add('selected-leave');
      });
    }

    AttendanceModule.updateSummaryCounts();
  },

  // Mark All Present (With Overwrite Safety & Undo)
  handleMarkAllPresent: () => {
    if (AttendanceModule.currentRoster.length === 0) return;

    // Safety check: if existing marks have absent or leave
    const hasAbsentOrLeave = Object.values(AttendanceModule.currentMarkedStatuses).some(s => s === 'absent' || s === 'leave');
    const totalCount = AttendanceModule.currentRoster.length;

    if (hasAbsentOrLeave) {
      if (!confirm(`This will change all ${totalCount} students to Present, including previously marked Absent or Leave. Continue?`)) {
        return;
      }
    }

    // Preserve previous state for Undo
    AttendanceModule.previousMarkedState = { ...AttendanceModule.currentMarkedStatuses };

    AttendanceModule.currentRoster.forEach(item => {
      AttendanceModule.currentMarkedStatuses[item.enrollment.id] = 'present';
    });

    AttendanceModule.renderRoster();
    AttendanceModule.updateSummaryCounts();

    Utils.showToast("All Marked Present", `All ${totalCount} students marked Present. Tap Save Attendance to submit.`, "info", 5000);
  },

  // Undo Mark All Action
  undoMarkAll: () => {
    if (!AttendanceModule.previousMarkedState) return;
    AttendanceModule.currentMarkedStatuses = { ...AttendanceModule.previousMarkedState };
    AttendanceModule.previousMarkedState = null;
    AttendanceModule.renderRoster();
    AttendanceModule.updateSummaryCounts();
    Utils.showToast("Restored", "Previous attendance marks restored.", "info");
  },

  // Open No Class / Holiday Modal
  openNoClassModal: () => {
    if (!AttendanceModule.selectedProgrammeId || !AttendanceModule.selectedDate) return;

    const prog = (AppState.programmes || []).find(p => p.id === AttendanceModule.selectedProgrammeId);
    const progName = prog ? prog.name : 'Selected Programme';
    const dateFormatted = AttendanceModule.formatReadableDate(AttendanceModule.selectedDate);

    document.getElementById('no-class-modal-prog-name').textContent = progName;
    document.getElementById('no-class-modal-date-display').textContent = dateFormatted;

    // Warn if existing completed register exists
    const warnEl = document.getElementById('no-class-overwrite-warning');
    if (warnEl) {
      const isExisting = AttendanceModule.currentSession && AttendanceModule.currentSession.status === 'completed';
      warnEl.style.display = isExisting ? 'block' : 'none';
    }

    document.getElementById('no-class-reason-select').value = 'Public Holiday';
    document.getElementById('no-class-custom-reason-wrap').style.display = 'none';
    document.getElementById('no-class-custom-reason-input').value = '';

    Utils.openModal('modal-attendance-no-class');
  },

  // Reason select change
  onNoClassReasonChange: (reason) => {
    const wrap = document.getElementById('no-class-custom-reason-wrap');
    if (wrap) {
      wrap.style.display = reason === 'Other' ? 'block' : 'none';
    }
  },

  // Confirm No Class / Holiday (Transactional RPC)
  confirmNoClass: async (event) => {
    event.preventDefault();

    let reason = document.getElementById('no-class-reason-select').value;
    if (reason === 'Other') {
      const custom = document.getElementById('no-class-custom-reason-input').value.trim();
      reason = custom || 'Other Reason';
    }

    const confirmBtn = document.getElementById('btn-confirm-no-class');
    const originalText = confirmBtn ? confirmBtn.innerHTML : '';
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = 'Recording...';
    }

    try {
      if (supabaseClient) {
        const { data, error } = await supabaseClient.rpc('cancel_attendance_session', {
          p_programme_id: AttendanceModule.selectedProgrammeId,
          p_attendance_date: AttendanceModule.selectedDate,
          p_reason: reason
        });

        if (error) throw error;
      }

      Utils.closeModal('modal-attendance-no-class');
      Utils.showToast("Class Cancelled", `Class marked as ${reason}. Session excluded from reports.`, "info", 5000);
      await AttendanceModule.loadRoster();

    } catch (err) {
      console.error("Cancel session error:", err);
      Utils.showToast("Cancellation Failed", err.message || "Failed to cancel class session.", "error");
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        Utils.renderIcons();
      }
    }
  },

  // Update Summary Counts & Progress Bar
  updateSummaryCounts: () => {
    const total = AttendanceModule.currentRoster.length;
    let present = 0;
    let absent = 0;
    let leave = 0;

    // Summary counts always represent the complete roster
    AttendanceModule.currentRoster.forEach(item => {
      const st = AttendanceModule.currentMarkedStatuses[item.enrollment.id];
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'leave') leave++;
    });

    const markedCount = present + absent + leave;
    const unmarked = Math.max(0, total - markedCount);
    const progressPercent = total > 0 ? Math.round((markedCount / total) * 100) : 0;

    const totalEl = document.getElementById('att-summary-total');
    const presEl = document.getElementById('att-summary-present');
    const absEl = document.getElementById('att-summary-absent');
    const leaEl = document.getElementById('att-summary-leave');
    const unmEl = document.getElementById('att-summary-unmarked');
    const progTextEl = document.getElementById('att-summary-progress-text');
    const barFillEl = document.getElementById('att-progress-bar-fill');
    const saveStatusEl = document.getElementById('attendance-save-status-text');
    const submitBtn = document.getElementById('btn-save-attendance');

    if (totalEl) totalEl.textContent = total;
    if (presEl) presEl.textContent = present;
    if (absEl) absEl.textContent = absent;
    if (leaEl) leaEl.textContent = leave;
    if (unmEl) unmEl.textContent = unmarked;

    if (progTextEl) progTextEl.textContent = `${markedCount} of ${total} marked`;
    if (barFillEl) barFillEl.style.width = `${progressPercent}%`;

    // Save bar states
    if (saveStatusEl) {
      if (total === 0) {
        saveStatusEl.textContent = `0 of 0 marked`;
      } else if (unmarked > 0) {
        saveStatusEl.textContent = `${markedCount} of ${total} marked (${unmarked} remaining)`;
        saveStatusEl.style.color = 'var(--text-muted)';
      } else {
        saveStatusEl.textContent = `All ${total} students marked ✓`;
        saveStatusEl.style.color = 'var(--status-paid)';
      }
    }

    if (submitBtn) {
      // Disable save if any unmarked or empty roster
      submitBtn.disabled = total === 0 || unmarked > 0;
    }
  },

  resetSummaryCounts: () => {
    ['att-summary-total', 'att-summary-present', 'att-summary-absent', 'att-summary-leave', 'att-summary-unmarked'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    const progText = document.getElementById('att-summary-progress-text');
    if (progText) progText.textContent = '0 of 0 marked';
    const barFill = document.getElementById('att-progress-bar-fill');
    if (barFill) barFill.style.width = '0%';
  },

  // Strictly Transactional Attendance Save (No Client Fallback Bypass)
  saveAttendance: async () => {
    if (AttendanceModule.isSubmitting) return;

    if (AttendanceModule.currentRoster.length === 0) {
      Utils.showToast("Notice", "No eligible students in register to save.", "warning");
      return;
    }

    // 1. Strict frontend roster completeness check
    const unmarked = AttendanceModule.currentRoster.filter(item => !AttendanceModule.currentMarkedStatuses[item.enrollment.id]);
    if (unmarked.length > 0) {
      Utils.showToast("Incomplete Register", `Please mark all ${AttendanceModule.currentRoster.length} students before saving (${unmarked.length} unmarked).`, "warning", 5000);
      return;
    }

    const submitBtn = document.getElementById('btn-save-attendance');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    AttendanceModule.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Saving...</span>';
    }

    try {
      const progId = AttendanceModule.selectedProgrammeId;
      const attDate = AttendanceModule.selectedDate;

      const recordsPayload = AttendanceModule.currentRoster.map(item => ({
        enrollment_id: item.enrollment.id,
        status: AttendanceModule.currentMarkedStatuses[item.enrollment.id],
        remarks: null
      }));

      if (!supabaseClient) {
        throw new Error("Supabase client is not connected. Cannot save attendance without active connection.");
      }

      // 2. Call Transactional Database RPC
      const { data, error } = await supabaseClient.rpc('save_attendance_register', {
        p_programme_id: progId,
        p_attendance_date: attDate,
        p_records: recordsPayload
      });

      if (error) {
        console.error("Database save attendance RPC error:", error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to save attendance register.");
      }

      Utils.showToast("Attendance Saved", `Attendance register for ${AttendanceModule.formatReadableDate(attDate)} saved successfully.`, "success");
      await AttendanceModule.loadRoster();

    } catch (err) {
      console.error("Save attendance error:", err);
      // Keep unsaved state in memory so administrator does not lose what they marked!
      Utils.showToast("Save Failed", err.message || "Failed to save attendance register. Check connection and rules.", "error", 7000);
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
  populateHistoryFilters: () => {
    const progSelect = document.getElementById('history-filter-programme');
    const repProgSelect = document.getElementById('reports-filter-programme');
    if (!progSelect) return;

    const offlineProgs = (AppState.programmes || []).filter(p => !p.code?.toUpperCase().includes('ONLINE'));
    const optionsHtml = '<option value="">All Offline Programmes</option>' + offlineProgs.map(p => `
      <option value="${p.id}">${Utils.escapeHtml(p.name)}</option>
    `).join('');

    progSelect.innerHTML = optionsHtml;
    if (repProgSelect) repProgSelect.innerHTML = optionsHtml;
  },

  loadHistory: async () => {
    const tbody = document.getElementById('attendance-history-tbody');
    const mobileCards = document.getElementById('attendance-history-mobile-cards');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">Loading history...</td></tr>`;
    if (mobileCards) mobileCards.innerHTML = `<div class="text-center text-muted" style="padding: 2rem;">Loading history...</div>`;

    try {
      if (!supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">Database client not connected.</td></tr>`;
        return;
      }

      const fromDate = document.getElementById('history-filter-from')?.value;
      const toDate = document.getElementById('history-filter-to')?.value;
      const progFilter = document.getElementById('history-filter-programme')?.value;

      let query = supabaseClient
        .from('attendance_sessions')
        .select(`
          *,
          programmes (*),
          attendance_records (*)
        `)
        .order('attendance_date', { ascending: false })
        .limit(100);

      if (fromDate) query = query.gte('attendance_date', fromDate);
      if (toDate) query = query.lte('attendance_date', toDate);
      if (progFilter) query = query.eq('programme_id', progFilter);

      const { data: sessions, error } = await query;
      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        const noDataHtml = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2.5rem 1rem;">No attendance registers match your filters.</td></tr>`;
        tbody.innerHTML = noDataHtml;
        if (mobileCards) mobileCards.innerHTML = `<div class="text-center text-muted" style="padding: 2.5rem 1rem;">No attendance registers match your filters.</div>`;
        return;
      }

      // Desktop History Table
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
              <span class="badge ${isCancelled ? 'badge-unpaid' : 'badge-paid'}">
                ${isCancelled ? 'Cancelled' : 'Completed'}
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

      // Mobile History Cards
      if (mobileCards) {
        mobileCards.innerHTML = sessions.map(sess => {
          const prog = sess.programmes?.name || 'Programme';
          const isCancelled = sess.status === 'cancelled';
          const records = sess.attendance_records || [];
          const present = records.filter(r => r.status === 'present').length;
          const absent = records.filter(r => r.status === 'absent').length;
          const leave = records.filter(r => r.status === 'leave').length;

          return `
            <div class="attendance-history-card">
              <div class="attendance-history-card-header">
                <div>
                  <strong style="font-size: 0.95rem;">${Utils.formatDate(sess.attendance_date)}</strong>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">${Utils.escapeHtml(prog)}</div>
                </div>
                <span class="badge ${isCancelled ? 'badge-unpaid' : 'badge-paid'}">
                  ${isCancelled ? 'Cancelled' : 'Completed'}
                </span>
              </div>
              ${isCancelled ? `
                <div style="font-size: 0.76rem; color: #7f1d1d; margin-bottom: 0.65rem;">Reason: ${Utils.escapeHtml(sess.cancellation_reason || 'Holiday')}</div>
              ` : `
                <div class="attendance-history-stats">
                  <span>Present: <strong style="color: var(--status-paid);">${present}</strong></span>
                  <span>Absent: <strong style="color: var(--status-unpaid);">${absent}</strong></span>
                  <span>Leave: <strong style="color: #d97706;">${leave}</strong></span>
                  <span>Total: <strong>${records.length}</strong></span>
                </div>
              `}
              <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center;" onclick="AttendanceModule.openHistoricalRegister('${sess.attendance_date}', '${sess.programme_id}')">
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i> Open Register
              </button>
            </div>
          `;
        }).join('');
      }

      Utils.renderIcons();

    } catch (err) {
      console.error("Load history error:", err);
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">Failed to load attendance history.</td></tr>`;
    }
  },

  // Open Historical Register for Editing or Viewing
  openHistoricalRegister: async (dateStr, progId) => {
    AttendanceModule.selectedDate = dateStr;
    AttendanceModule.selectedProgrammeId = progId;

    AttendanceModule.updateReadableDateDisplay();
    AttendanceModule.syncProgrammeOptionsForDate();
    AttendanceModule.switchTab('register');

    await AttendanceModule.loadRoster();
  },

  // ===========================================================================
  // SECTION C: ATTENDANCE REPORTS & ANALYTICS
  // ===========================================================================
  reportDataCache: [],

  loadReports: async () => {
    const tbody = document.getElementById('attendance-reports-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Calculating attendance statistics...</td></tr>`;

    try {
      if (!supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Database client not connected.</td></tr>`;
        return;
      }

      // Query ONLY completed sessions and their records
      const progFilter = document.getElementById('reports-filter-programme')?.value;

      let query = supabaseClient
        .from('attendance_records')
        .select(`
          *,
          attendance_sessions!inner (*),
          enrollments!inner (*, students (*), programmes (*))
        `)
        .eq('attendance_sessions.status', 'completed'); // STRICTLY exclude cancelled and open sessions!

      if (progFilter) {
        query = query.eq('attendance_sessions.programme_id', progFilter);
      }

      const { data: records, error } = await query;
      if (error) throw error;

      // Group records by enrollment_id
      const enrolStats = {};
      (records || []).forEach(r => {
        const sess = r.attendance_sessions;
        if (!sess || sess.status !== 'completed') return;

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
      AttendanceModule.reportDataCache = list;

      // Aggregate institution-wide KPIs
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
      const overallRate = grandDenominator > 0 
        ? ((grandPresent / grandDenominator) * 100).toFixed(1) + '%'
        : (grandSessions === 0 ? 'No Data' : '100.0%');

      if (repPresEl) repPresEl.textContent = grandPresent;
      if (repAbsEl) repAbsEl.textContent = grandAbsent;
      if (repLeaEl) repLeaEl.textContent = grandLeave;
      if (repRateEl) repRateEl.textContent = overallRate;

      AttendanceModule.renderReportsTable();

    } catch (err) {
      console.error("Load reports error:", err);
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Failed to generate attendance report.</td></tr>`;
    }
  },

  renderReportsTable: () => {
    const tbody = document.getElementById('attendance-reports-tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('reports-filter-search')?.value || '').trim().toLowerCase();
    let list = AttendanceModule.reportDataCache;

    if (searchTerm) {
      list = list.filter(item => 
        (item.student?.name || '').toLowerCase().includes(searchTerm) ||
        (item.student?.student_id || '').toLowerCase().includes(searchTerm)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem 1rem;">No attendance records found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const denom = item.present + item.absent;
      const hasData = item.totalSessions > 0 && denom > 0;
      const rate = hasData ? ((item.present / denom) * 100).toFixed(1) + '%' : (item.totalSessions === 0 ? 'No Data' : '100.0%');
      const rateNum = parseFloat(rate);
      const rateColor = !hasData ? 'var(--text-muted)' : (rateNum >= 85 ? 'var(--status-paid)' : (rateNum >= 75 ? '#d97706' : 'var(--status-unpaid)'));

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
            <strong style="color: ${rateColor}; font-size: 0.95rem;">${rate}</strong>
          </td>
        </tr>
      `;
    }).join('');

    Utils.renderIcons();
  },

  filterReportsTable: () => {
    AttendanceModule.renderReportsTable();
  },

  // Export Reports to Excel (.xlsx)
  exportToExcel: () => {
    if (typeof XLSX === 'undefined') {
      Utils.showToast("Notice", "Excel export library loading. Please try again.", "warning");
      return;
    }

    const rows = AttendanceModule.reportDataCache.map(item => {
      const denom = item.present + item.absent;
      const rate = denom > 0 ? ((item.present / denom) * 100).toFixed(1) + '%' : (item.totalSessions === 0 ? 'No Data' : '100.0%');
      return {
        "Student ID": item.student?.student_id || '',
        "Student Name": item.student?.name || '',
        "Programme": item.programme?.name || '',
        "Class / Level": item.enrollment?.class_or_grade || '',
        "Sessions Held": item.totalSessions,
        "Present Days": item.present,
        "Absent Days": item.absent,
        "Leave Days": item.leave,
        "Attendance %": rate
      };
    });

    if (rows.length === 0) {
      Utils.showToast("Notice", "No attendance records to export.", "info");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, `EduTrack_Attendance_Report_${AttendanceModule.getLocalDateString()}.xlsx`);
    Utils.showToast("Export Complete", "Attendance report exported to Excel.", "success");
  },

  // Export Reports to CSV
  exportToCSV: () => {
    const rows = AttendanceModule.reportDataCache.map(item => {
      const denom = item.present + item.absent;
      const rate = denom > 0 ? ((item.present / denom) * 100).toFixed(1) + '%' : (item.totalSessions === 0 ? 'No Data' : '100.0%');
      return [
        `"${item.student?.student_id || ''}"`,
        `"${item.student?.name || ''}"`,
        `"${item.programme?.name || ''}"`,
        `"${item.enrollment?.class_or_grade || ''}"`,
        item.totalSessions,
        item.present,
        item.absent,
        item.leave,
        `"${rate}"`
      ].join(',');
    });

    if (rows.length === 0) {
      Utils.showToast("Notice", "No attendance records to export.", "info");
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      "Student ID,Student Name,Programme,Class / Level,Sessions Held,Present Days,Absent Days,Leave Days,Attendance %",
      ...rows
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EduTrack_Attendance_Report_${AttendanceModule.getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Utils.showToast("Export Complete", "Attendance report exported to CSV.", "success");
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

      const student = (AppState.students || []).find(s => s.id === studentId);
      if (!student || !student.enrollments || student.enrollments.length === 0) {
        container.innerHTML = `<div class="text-muted" style="padding: 0.75rem 0; font-size: 0.85rem;">No programme enrolments recorded.</div>`;
        return;
      }

      // Exclude Online Hindi
      const eligibleEnrolments = student.enrollments.filter(e => {
        const progName = (e.programmes?.name || '').toLowerCase();
        return !progName.includes('online');
      });

      if (eligibleEnrolments.length === 0) {
        container.innerHTML = `<div class="text-muted" style="padding: 0.75rem 0; font-size: 0.85rem;">Online Hindi coaching does not require offline attendance tracking.</div>`;
        return;
      }

      const enrollmentIds = eligibleEnrolments.map(e => e.id);

      // Query completed sessions records only
      const { data: records } = await supabaseClient
        .from('attendance_records')
        .select(`*, attendance_sessions!inner (*)`)
        .eq('attendance_sessions.status', 'completed')
        .in('enrollment_id', enrollmentIds);

      const statsByEnrolment = {};
      eligibleEnrolments.forEach(e => {
        statsByEnrolment[e.id] = { enrolment: e, present: 0, absent: 0, leave: 0, total: 0 };
      });

      (records || []).forEach(r => {
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
            const hasData = st.total > 0 && denom > 0;
            const rate = hasData ? ((st.present / denom) * 100).toFixed(1) + '%' : (st.total === 0 ? 'No Data' : '100.0%');
            const rateColor = !hasData ? 'var(--text-muted)' : (parseFloat(rate) >= 85 ? 'var(--status-paid)' : (parseFloat(rate) >= 75 ? '#d97706' : 'var(--status-unpaid)'));

            return `
              <div class="profile-attendance-card">
                <div class="profile-attendance-title">
                  <span>${Utils.escapeHtml(e.programmes?.name || 'Programme')} (${Utils.escapeHtml(e.class_or_grade)})</span>
                  <span class="badge ${e.status === 'active' ? 'badge-paid' : 'badge-neutral'}">${e.status}</span>
                </div>
                <div class="profile-attendance-rate" style="color: ${rateColor};">
                  ${rate}
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
