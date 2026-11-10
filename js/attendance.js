/**
 * EDUTRACK ATTENDANCE MANAGEMENT MODULE (V2.1 - RESILIENT PRODUCTION)
 * Fast Mobile Administrative Register, Dual Cloud/Local Storage Resilience, One-Click Supabase Setup
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

  STORAGE_SESSIONS_KEY: 'edutrack_attendance_sessions_local',
  STORAGE_RECORDS_KEY: 'edutrack_attendance_records_local',

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

  // Local Storage Resilience Helpers
  getLocalSessions: () => {
    try {
      return JSON.parse(localStorage.getItem(AttendanceModule.STORAGE_SESSIONS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  },

  getLocalRecords: () => {
    try {
      return JSON.parse(localStorage.getItem(AttendanceModule.STORAGE_RECORDS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  },

  saveLocalSession: (session, records) => {
    try {
      const sessions = AttendanceModule.getLocalSessions();
      const existingIdx = sessions.findIndex(s => s.programme_id === session.programme_id && s.attendance_date === session.attendance_date);
      const sessionWithId = {
        ...session,
        id: session.id || 'loc-sess-' + Date.now()
      };

      if (existingIdx >= 0) {
        sessions[existingIdx] = sessionWithId;
      } else {
        sessions.push(sessionWithId);
      }
      localStorage.setItem(AttendanceModule.STORAGE_SESSIONS_KEY, JSON.stringify(sessions));

      const allRecords = AttendanceModule.getLocalRecords();
      const filteredRecords = allRecords.filter(r => r.session_id !== sessionWithId.id && !(r.programme_id === session.programme_id && r.attendance_date === session.attendance_date));
      const newRecords = records.map(r => ({
        ...r,
        id: r.id || 'loc-rec-' + Math.random().toString(36).substr(2, 9),
        session_id: sessionWithId.id,
        programme_id: session.programme_id,
        attendance_date: session.attendance_date
      }));
      localStorage.setItem(AttendanceModule.STORAGE_RECORDS_KEY, JSON.stringify([...filteredRecords, ...newRecords]));

      return sessionWithId;
    } catch (e) {
      console.warn("Local storage write notice:", e);
    }
  },

  // 1. Module Initialization
  init: async () => {
    const todayStr = AttendanceModule.getLocalDateString();
    if (!AttendanceModule.selectedDate) {
      AttendanceModule.selectedDate = todayStr;
    }

    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) {
      dateInput.value = AttendanceModule.selectedDate;
      dateInput.max = todayStr;
    }

    AttendanceModule.updateReadableDateDisplay();
    AttendanceModule.setupTabListeners();

    // Load database rules (silent fallback to defaults if table not created yet)
    await AttendanceModule.loadProgrammeRules();

    // Populate programme chips
    AttendanceModule.syncProgrammeOptionsForDate();

    // Load roster
    await AttendanceModule.loadRoster();

    // Populate history & reports filters
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

  // Load Attendance Rules from Supabase (Clean silent fallback to default timetable rules)
  rulesLoaded: false,
  loadProgrammeRules: async (force = false) => {
    if (AttendanceModule.rulesLoaded && !force) return;
    try {
      if (!supabaseClient) {
        AttendanceModule.programmeRules = AttendanceModule.defaultRules;
        AttendanceModule.rulesLoaded = true;
        return;
      }

      const { data, error } = await supabaseClient
        .from('programme_attendance_rules')
        .select(`*, programmes (*)`);

      if (!error && data && data.length > 0) {
        AttendanceModule.programmeRules = data;
      } else {
        // Fall back gracefully to default timetable rules without popping error toasts
        AttendanceModule.programmeRules = AttendanceModule.defaultRules;
      }
    } catch (_) {
      AttendanceModule.programmeRules = AttendanceModule.defaultRules;
    } finally {
      AttendanceModule.rulesLoaded = true;
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

  // Synchronize Programme Chips for Selected Date
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

  // Load Student Roster Directly from Database (with local session merging)
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

      // 1. Fetch eligible student enrolments for this programme
      if (supabaseClient) {
        try {
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

          if (!enrolErr && enrolments && enrolments.length > 0) {
            enrolments.forEach(e => {
              if (e.start_date && e.start_date > targetDate) return;
              if (e.end_date && e.end_date < targetDate) return;
              eligibleRoster.push({ student: e.students, enrollment: e });
            });
          }
        } catch (_) {}
      }

      // Fallback to AppState.students if database query yielded nothing
      if (eligibleRoster.length === 0) {
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

      eligibleRoster.sort((a, b) => a.student.name.localeCompare(b.student.name));
      AttendanceModule.currentRoster = eligibleRoster;
      AttendanceModule.currentMarkedStatuses = {};
      AttendanceModule.currentSession = null;

      // 2. Fetch saved session (Check Supabase first, then LocalStorage)
      let foundSession = false;
      if (supabaseClient) {
        try {
          const { data: sessionData, error: sessErr } = await supabaseClient
            .from('attendance_sessions')
            .select(`*, attendance_records (*)`)
            .eq('programme_id', progId)
            .eq('attendance_date', targetDate)
            .single();

          if (!sessErr && sessionData) {
            AttendanceModule.currentSession = sessionData;
            foundSession = true;

            if (sessionData.status === 'cancelled') {
              AttendanceModule.renderCancelledBanner(sessionData.cancellation_reason || 'Class cancelled');
              return;
            }

            (sessionData.attendance_records || []).forEach(rec => {
              AttendanceModule.currentMarkedStatuses[rec.enrollment_id] = rec.status;
            });
          }
        } catch (_) {}
      }

      // Check LocalStorage if Supabase didn't have records
      if (!foundSession) {
        const localSessions = AttendanceModule.getLocalSessions();
        const localSess = localSessions.find(s => s.programme_id === progId && s.attendance_date === targetDate);
        if (localSess) {
          AttendanceModule.currentSession = localSess;
          if (localSess.status === 'cancelled') {
            AttendanceModule.renderCancelledBanner(localSess.cancellation_reason || 'Class cancelled');
            return;
          }
          const localRecords = AttendanceModule.getLocalRecords().filter(r => r.session_id === localSess.id || (r.programme_id === progId && r.attendance_date === targetDate));
          localRecords.forEach(rec => {
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

      AttendanceModule.renderRoster();
      AttendanceModule.updateSummaryCounts();

    } catch (err) {
      console.error("Load roster error:", err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No students enrolled in this programme.</td></tr>`;
      if (mobileCards) mobileCards.innerHTML = `<div class="text-center text-muted" style="padding: 2rem;">No students enrolled in this programme.</div>`;
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

  // Reopen Cancelled Session
  reopenCancelledSession: async () => {
    if (!AttendanceModule.selectedProgrammeId || !AttendanceModule.selectedDate) return;
    const prog = (AppState.programmes || []).find(p => p.id === AttendanceModule.selectedProgrammeId);
    const progName = prog ? prog.name : 'this programme';
    const dateFormatted = AttendanceModule.formatReadableDate(AttendanceModule.selectedDate);

    if (confirm(`Do you want to reopen the cancelled register for ${progName} on ${dateFormatted}?\n\nAttendance will need to be marked and saved.`)) {
      try {
        let reopenedInCloud = false;
        if (supabaseClient) {
          try {
            const { error } = await supabaseClient.rpc('reopen_attendance_session', {
              p_programme_id: AttendanceModule.selectedProgrammeId,
              p_attendance_date: AttendanceModule.selectedDate
            });
            if (!error) reopenedInCloud = true;
          } catch (_) {}
        }

        // Also update local storage
        const localSessions = AttendanceModule.getLocalSessions();
        const localSess = localSessions.find(s => s.programme_id === AttendanceModule.selectedProgrammeId && s.attendance_date === AttendanceModule.selectedDate);
        if (localSess) {
          localSess.status = 'open';
          localSess.cancellation_reason = null;
          localStorage.setItem(AttendanceModule.STORAGE_SESSIONS_KEY, JSON.stringify(localSessions));
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

    // Fast DOM update for mobile card
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

    const hasAbsentOrLeave = Object.values(AttendanceModule.currentMarkedStatuses).some(s => s === 'absent' || s === 'leave');
    const totalCount = AttendanceModule.currentRoster.length;

    if (hasAbsentOrLeave) {
      if (!confirm(`This will change all ${totalCount} students to Present, including previously marked Absent or Leave. Continue?`)) {
        return;
      }
    }

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

  // Confirm No Class / Holiday
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
      let cancelledInCloud = false;
      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.rpc('cancel_attendance_session', {
            p_programme_id: AttendanceModule.selectedProgrammeId,
            p_attendance_date: AttendanceModule.selectedDate,
            p_reason: reason
          });
          if (!error) cancelledInCloud = true;
        } catch (_) {}

        if (!cancelledInCloud) {
          try {
            const { data: sessData, error: sessErr } = await supabaseClient
              .from('attendance_sessions')
              .upsert({
                attendance_date: AttendanceModule.selectedDate,
                programme_id: AttendanceModule.selectedProgrammeId,
                status: 'cancelled',
                cancellation_reason: reason,
                total_students: 0,
                present_count: 0,
                absent_count: 0,
                leave_count: 0,
                marked_by: 'Administrator',
                updated_at: new Date().toISOString()
              }, { onConflict: 'attendance_date,programme_id' })
              .select();

            if (!sessErr && sessData && sessData[0]) {
              await supabaseClient.from('attendance_records').delete().eq('session_id', sessData[0].id);
              cancelledInCloud = true;
            }
          } catch (tableEx) {
            console.warn("Direct cancel session table notice:", tableEx);
          }
        }
      }

      // Also save cancellation locally
      AttendanceModule.saveLocalSession({
        programme_id: AttendanceModule.selectedProgrammeId,
        attendance_date: AttendanceModule.selectedDate,
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      }, []);

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

  // Open Database Setup Modal
  openDatabaseSetupModal: () => {
    Utils.openModal('modal-attendance-db-setup');
  },

  // Copy Migration SQL Script to Clipboard
  copyMigrationSQL: () => {
    const sql = AttendanceModule.MIGRATION_SQL;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sql).then(() => {
        Utils.showToast("Copied to Clipboard!", "Paste this into Supabase SQL Editor and click Run.", "success");
      }).catch(() => {
        AttendanceModule.fallbackCopy(sql);
      });
    } else {
      AttendanceModule.fallbackCopy(sql);
    }
  },

  fallbackCopy: (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      Utils.showToast("Copied to Clipboard!", "Paste this into Supabase SQL Editor and click Run.", "success");
    } catch (_) {
      prompt("Copy the SQL script manually:", text);
    }
    document.body.removeChild(textArea);
  },

  // Save Attendance (Dual Cloud/Local Resilience)
  saveAttendance: async () => {
    if (AttendanceModule.isSubmitting) return;

    if (AttendanceModule.currentRoster.length === 0) {
      Utils.showToast("Notice", "No eligible students in register to save.", "warning");
      return;
    }

    // 1. Strict roster completeness check
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

      // Calculate summary statistics
      let total = 0, present = 0, absent = 0, leave = 0;
      recordsPayload.forEach(r => {
        total++;
        if (r.status === 'present') present++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'leave') leave++;
      });

      let savedToCloud = false;

      // 1. Primary: Save directly to Supabase PostgreSQL (Fast, reliable, zero schema cache dependency)
      if (supabaseClient) {
        // Direct Table Upsert
        try {
          const { data: sessData, error: sessErr } = await supabaseClient
            .from('attendance_sessions')
            .upsert({
              attendance_date: attDate,
              programme_id: progId,
              status: 'completed',
              total_students: total,
              present_count: present,
              absent_count: absent,
              leave_count: leave,
              marked_by: 'Administrator',
              updated_at: new Date().toISOString()
            }, { onConflict: 'attendance_date,programme_id' })
            .select();

          if (!sessErr && sessData && sessData[0]) {
            const sessionId = sessData[0].id;
            const recRows = recordsPayload.map(r => ({
              session_id: sessionId,
              enrollment_id: r.enrollment_id,
              status: r.status,
              updated_at: new Date().toISOString()
            }));

            const { error: recErr } = await supabaseClient
              .from('attendance_records')
              .upsert(recRows, { onConflict: 'session_id,enrollment_id' });

            if (!recErr) {
              savedToCloud = true;
            }
          }
        } catch (tableEx) {
          console.warn("Direct attendance table upsert notice:", tableEx);
        }

        // Secondary fallback to RPC if direct table upsert was blocked
        if (!savedToCloud) {
          try {
            const { data, error } = await supabaseClient.rpc('save_attendance_register', {
              p_programme_id: progId,
              p_attendance_date: attDate,
              p_records: recordsPayload
            });

            if (!error && data && (data.success || data.session_id)) {
              savedToCloud = true;
            }
          } catch (_) {}
        }
      }

      // Always save to local storage as an immediate safety cache
      AttendanceModule.saveLocalSession({
        programme_id: progId,
        attendance_date: attDate,
        status: 'completed',
        updated_at: new Date().toISOString()
      }, recordsPayload);

      if (savedToCloud) {
        Utils.showToast("Attendance Saved", `Attendance register for ${AttendanceModule.formatReadableDate(attDate)} saved to cloud successfully.`, "success");
      } else {
        // Only if both Supabase cloud methods failed
        Utils.showToast("Attendance Saved (Local)", `Register for ${AttendanceModule.formatReadableDate(attDate)} saved on device. Run Supabase SQL setup to enable cloud sync.`, "info", 6000);
        AttendanceModule.openDatabaseSetupModal();
      }

      await AttendanceModule.loadRoster();

    } catch (err) {
      console.error("Save attendance error:", err);
      Utils.showToast("Save Failed", err.message || "Failed to save attendance register.", "error", 7000);
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
      const fromDate = document.getElementById('history-filter-from')?.value;
      const toDate = document.getElementById('history-filter-to')?.value;
      const progFilter = document.getElementById('history-filter-programme')?.value;

      let cloudSessions = [];
      if (supabaseClient) {
        try {
          let query = supabaseClient
            .from('attendance_sessions')
            .select(`*, programmes (*), attendance_records (*)`)
            .order('attendance_date', { ascending: false })
            .limit(100);

          if (fromDate) query = query.gte('attendance_date', fromDate);
          if (toDate) query = query.lte('attendance_date', toDate);
          if (progFilter) query = query.eq('programme_id', progFilter);

          const { data, error } = await query;
          if (!error && data) cloudSessions = data;
        } catch (_) {}
      }

      // Merge local storage sessions
      const localSessions = AttendanceModule.getLocalSessions();
      const localRecords = AttendanceModule.getLocalRecords();

      const mergedMap = new Map();
      cloudSessions.forEach(s => mergedMap.set(`${s.programme_id}_${s.attendance_date}`, s));

      localSessions.forEach(ls => {
        const key = `${ls.programme_id}_${ls.attendance_date}`;
        if (!mergedMap.has(key)) {
          const prog = (AppState.programmes || []).find(p => p.id === ls.programme_id);
          const records = localRecords.filter(r => r.session_id === ls.id || (r.programme_id === ls.programme_id && r.attendance_date === ls.attendance_date));
          mergedMap.set(key, {
            ...ls,
            programmes: prog,
            attendance_records: records
          });
        }
      });

      let sessions = Array.from(mergedMap.values());
      if (fromDate) sessions = sessions.filter(s => s.attendance_date >= fromDate);
      if (toDate) sessions = sessions.filter(s => s.attendance_date <= toDate);
      if (progFilter) sessions = sessions.filter(s => s.programme_id === progFilter);
      sessions.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

      if (sessions.length === 0) {
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
      const progFilter = document.getElementById('reports-filter-programme')?.value;

      let allRecords = [];
      if (supabaseClient) {
        try {
          let query = supabaseClient
            .from('attendance_records')
            .select(`
              *,
              attendance_sessions!inner (*),
              enrollments!inner (*, students (*), programmes (*))
            `)
            .eq('attendance_sessions.status', 'completed');

          if (progFilter) {
            query = query.eq('attendance_sessions.programme_id', progFilter);
          }

          const { data, error } = await query;
          if (!error && data) allRecords = data;
        } catch (_) {}
      }

      // Merge local storage records
      const localSessions = AttendanceModule.getLocalSessions().filter(s => s.status === 'completed');
      const localRecords = AttendanceModule.getLocalRecords();

      localSessions.forEach(ls => {
        if (progFilter && ls.programme_id !== progFilter) return;
        const matchingRecords = localRecords.filter(r => r.session_id === ls.id || (r.programme_id === ls.programme_id && r.attendance_date === ls.attendance_date));
        matchingRecords.forEach(mr => {
          // Check if already in allRecords
          if (!allRecords.some(ar => ar.enrollment_id === mr.enrollment_id && ar.attendance_sessions?.attendance_date === ls.attendance_date)) {
            // Find student & enrolment from AppState
            let foundStudent = null;
            let foundEnrolment = null;
            (AppState.students || []).forEach(st => {
              const en = (st.enrollments || []).find(e => e.id === mr.enrollment_id);
              if (en) {
                foundStudent = st;
                foundEnrolment = en;
              }
            });

            allRecords.push({
              ...mr,
              attendance_sessions: ls,
              enrollments: {
                ...foundEnrolment,
                students: foundStudent,
                programmes: (AppState.programmes || []).find(p => p.id === ls.programme_id)
              }
            });
          }
        });
      });

      // Group records by enrollment_id
      const enrolStats = {};
      allRecords.forEach(r => {
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

      // Query completed sessions records from Supabase
      let cloudRecords = [];
      if (supabaseClient) {
        try {
          const { data } = await supabaseClient
            .from('attendance_records')
            .select(`*, attendance_sessions!inner (*)`)
            .eq('attendance_sessions.status', 'completed')
            .in('enrollment_id', enrollmentIds);
          if (data) cloudRecords = data;
        } catch (_) {}
      }

      // Merge local records
      const localSessions = AttendanceModule.getLocalSessions().filter(s => s.status === 'completed');
      const localRecords = AttendanceModule.getLocalRecords().filter(r => enrollmentIds.includes(r.enrollment_id));

      const statsByEnrolment = {};
      eligibleEnrolments.forEach(e => {
        statsByEnrolment[e.id] = { enrolment: e, present: 0, absent: 0, leave: 0, total: 0 };
      });

      const processedKeys = new Set();
      cloudRecords.forEach(r => {
        const key = `${r.enrollment_id}_${r.attendance_sessions?.attendance_date}`;
        processedKeys.add(key);
        if (statsByEnrolment[r.enrollment_id]) {
          statsByEnrolment[r.enrollment_id].total++;
          if (r.status === 'present') statsByEnrolment[r.enrollment_id].present++;
          else if (r.status === 'absent') statsByEnrolment[r.enrollment_id].absent++;
          else if (r.status === 'leave') statsByEnrolment[r.enrollment_id].leave++;
        }
      });

      localSessions.forEach(ls => {
        const matching = localRecords.filter(r => r.session_id === ls.id || (r.programme_id === ls.programme_id && r.attendance_date === ls.attendance_date));
        matching.forEach(mr => {
          const key = `${mr.enrollment_id}_${ls.attendance_date}`;
          if (!processedKeys.has(key)) {
            processedKeys.add(key);
            if (statsByEnrolment[mr.enrollment_id]) {
              statsByEnrolment[mr.enrollment_id].total++;
              if (mr.status === 'present') statsByEnrolment[mr.enrollment_id].present++;
              else if (mr.status === 'absent') statsByEnrolment[mr.enrollment_id].absent++;
              else if (mr.status === 'leave') statsByEnrolment[mr.enrollment_id].leave++;
            }
          }
        });
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
  },

  // 1-Click Complete Supabase SQL Migration Script
  MIGRATION_SQL: `-- =============================================================================
-- I2B EDUCATIONAL INSTITUTION (EDUTRACK)
-- ATTENDANCE MODULE DATABASE SETUP SCRIPT
-- =============================================================================

-- 1. Programme Attendance Rules
CREATE TABLE IF NOT EXISTS public.programme_attendance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    attendance_enabled BOOLEAN NOT NULL DEFAULT true,
    attendance_weekdays INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_programme_attendance_rule UNIQUE (programme_id)
);

-- 2. Daily Attendance Sessions (Registers)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_date DATE NOT NULL,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    cancellation_reason TEXT,
    total_students INTEGER NOT NULL DEFAULT 0,
    present_count INTEGER NOT NULL DEFAULT 0,
    absent_count INTEGER NOT NULL DEFAULT 0,
    leave_count INTEGER NOT NULL DEFAULT 0,
    marked_by TEXT DEFAULT 'Administrator',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_programme_daily_attendance UNIQUE (attendance_date, programme_id)
);

-- 3. Daily Attendance Records (Per Student Enrolment)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_session_student_attendance UNIQUE (session_id, enrollment_id)
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_prog ON public.attendance_sessions(programme_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_enrol ON public.attendance_records(enrollment_id);

-- 5. Open Permissive Row Level Security Policies
ALTER TABLE public.programme_attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_programme_attendance_rules ON public.programme_attendance_rules;
CREATE POLICY allow_all_programme_attendance_rules ON public.programme_attendance_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_attendance_sessions ON public.attendance_sessions;
CREATE POLICY allow_all_attendance_sessions ON public.attendance_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_attendance_records ON public.attendance_records;
CREATE POLICY allow_all_attendance_records ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.programme_attendance_rules TO anon, authenticated, service_role;
GRANT ALL ON public.attendance_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.attendance_records TO anon, authenticated, service_role;

-- 6. Seed Default Timetable Rules
INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays, notes)
SELECT id, true, '{1,2,3,4,5,6}', 'Monday to Saturday' FROM public.programmes WHERE code = 'SUBJECT'
ON CONFLICT (programme_id) DO UPDATE SET attendance_enabled = true, attendance_weekdays = '{1,2,3,4,5,6}';

INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays, notes)
SELECT id, true, '{1,3,5}', 'Monday, Wednesday, Friday' FROM public.programmes WHERE code = 'HINDI'
ON CONFLICT (programme_id) DO UPDATE SET attendance_enabled = true, attendance_weekdays = '{1,3,5}';

INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays, notes)
SELECT id, true, '{0,6}', 'Saturday, Sunday' FROM public.programmes WHERE code = 'WEEKEND_HINDI'
ON CONFLICT (programme_id) DO UPDATE SET attendance_enabled = true, attendance_weekdays = '{0,6}';

INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays, notes)
SELECT id, false, '{}', 'Online attendance not tracked' FROM public.programmes WHERE code = 'ONLINE_HINDI'
ON CONFLICT (programme_id) DO UPDATE SET attendance_enabled = false, attendance_weekdays = '{}';

-- 7. Atomic Attendance Save RPC
DROP FUNCTION IF EXISTS public.save_attendance_register(DATE, UUID, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.save_attendance_register(UUID, DATE, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.save_attendance_register(
    p_programme_id UUID,
    p_attendance_date DATE,
    p_records JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
    v_rec RECORD;
    v_total INTEGER := 0;
    v_present INTEGER := 0;
    v_absent INTEGER := 0;
    v_leave INTEGER := 0;
BEGIN
    IF p_attendance_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance cannot be recorded for future dates.';
    END IF;

    FOR v_rec IN SELECT * FROM jsonb_to_recordset(p_records) AS x(enrollment_id UUID, status TEXT, notes TEXT)
    LOOP
        v_total := v_total + 1;
        IF v_rec.status = 'present' THEN v_present := v_present + 1;
        ELSIF v_rec.status = 'absent' THEN v_absent := v_absent + 1;
        ELSIF v_rec.status = 'leave' THEN v_leave := v_leave + 1;
        END IF;
    END LOOP;

    INSERT INTO public.attendance_sessions (
        attendance_date, programme_id, status, total_students,
        present_count, absent_count, leave_count, notes, marked_by, updated_at
    ) VALUES (
        p_attendance_date, p_programme_id, 'completed', v_total,
        v_present, v_absent, v_leave, p_notes, 'Administrator', NOW()
    )
    ON CONFLICT (attendance_date, programme_id) DO UPDATE SET
        status = 'completed',
        total_students = EXCLUDED.total_students,
        present_count = EXCLUDED.present_count,
        absent_count = EXCLUDED.absent_count,
        leave_count = EXCLUDED.leave_count,
        notes = COALESCE(EXCLUDED.notes, attendance_sessions.notes),
        cancellation_reason = NULL,
        updated_at = NOW()
    RETURNING id INTO v_session_id;

    FOR v_rec IN SELECT * FROM jsonb_to_recordset(p_records) AS x(enrollment_id UUID, status TEXT, notes TEXT)
    LOOP
        INSERT INTO public.attendance_records (
            session_id, enrollment_id, status, notes, updated_at
        ) VALUES (
            v_session_id, v_rec.enrollment_id, v_rec.status, v_rec.notes, NOW()
        )
        ON CONFLICT (session_id, enrollment_id) DO UPDATE SET
            status = EXCLUDED.status,
            notes = COALESCE(EXCLUDED.notes, attendance_records.notes),
            updated_at = NOW();
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'total', v_total,
        'present', v_present,
        'absent', v_absent,
        'leave', v_leave
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_attendance_register(UUID, DATE, JSONB, TEXT) TO anon, authenticated, service_role;

-- 8. Cancel Session RPC
CREATE OR REPLACE FUNCTION public.cancel_attendance_session(
    p_programme_id UUID,
    p_attendance_date DATE,
    p_reason TEXT DEFAULT 'Class cancelled'
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO public.attendance_sessions (
        attendance_date, programme_id, status, cancellation_reason,
        total_students, present_count, absent_count, leave_count, updated_at
    ) VALUES (
        p_attendance_date, p_programme_id, 'cancelled', p_reason,
        0, 0, 0, 0, NOW()
    )
    ON CONFLICT (attendance_date, programme_id) DO UPDATE SET
        status = 'cancelled',
        cancellation_reason = EXCLUDED.cancellation_reason,
        updated_at = NOW()
    RETURNING id INTO v_session_id;

    DELETE FROM public.attendance_records WHERE session_id = v_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_attendance_session(UUID, DATE, TEXT) TO anon, authenticated, service_role;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';`
};

window.AttendanceModule = AttendanceModule;
