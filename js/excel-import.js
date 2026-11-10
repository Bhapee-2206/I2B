/**
 * EDUTRACK EXCEL WORKBOOK IMPORT MODULE
 * Reads I2B.xlsx layout, extracts programmes, students & fees, previews & imports
 */

const ExcelImportModule = {
  extractedStudents: [],
  extractedFeeStructures: [],

  init: () => {
    const fileInput = document.getElementById('excel-file-upload');
    if (fileInput) {
      fileInput.addEventListener('change', ExcelImportModule.handleFileUpload);
    }
  },

  handleFileUpload: (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      alert("SheetJS library is loading. Please try again.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        ExcelImportModule.parseWorkbook(workbook);
      } catch (err) {
        console.error("Workbook read error:", err);
        Utils.showToast("Error", "Failed to parse Excel workbook", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  },

  parseWorkbook: (workbook) => {
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) return;

    // Convert sheet to 2D array of rows
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const studentMap = {}; // name.toLowerCase() -> { name, programmes: [] }
    const feeStructures = [];

    // Parse Subject Students (Cols 0-3, Rows 3 to 30)
    for (let r = 3; r <= 30; r++) {
      const row = rows[r];
      if (!row) continue;
      const name = row[1];
      const grade = row[2];
      const fee = parseFloat(row[3]);
      if (name && name !== 'TOTAL' && typeof name === 'string') {
        const cleanName = name.trim();
        const key = cleanName.toLowerCase();
        if (!studentMap[key]) studentMap[key] = { name: cleanName, programmes: [] };
        studentMap[key].programmes.push({
          programmeName: 'Subject',
          programmeCode: 'SUBJECT',
          classOrGrade: String(grade).trim(),
          board: 'Matric',
          agreedFee: fee || 600
        });
      }
    }

    // Parse Hindi Students (Cols 5-8, Rows 3 to 27)
    for (let r = 3; r <= 27; r++) {
      const row = rows[r];
      if (!row) continue;
      const name = row[6];
      const grade = row[7];
      const fee = parseFloat(row[8]);
      if (name && name !== 'TOTAL' && typeof name === 'string') {
        const cleanName = name.trim();
        const key = cleanName.toLowerCase();
        if (!studentMap[key]) studentMap[key] = { name: cleanName, programmes: [] };
        studentMap[key].programmes.push({
          programmeName: 'Hindi',
          programmeCode: 'HINDI',
          classOrGrade: String(grade).trim(),
          board: 'Virtual',
          agreedFee: fee || 500
        });
      }
    }

    // Parse Weekend Hindi (Cols 0-3, Rows 34 to 54)
    for (let r = 34; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const name = row[1];
      const grade = row[2];
      const fee = parseFloat(row[3]);
      if (name === 'TOTAL') break;
      if (name && typeof name === 'string') {
        const cleanName = name.trim();
        const key = cleanName.toLowerCase();
        if (!studentMap[key]) studentMap[key] = { name: cleanName, programmes: [] };
        studentMap[key].programmes.push({
          programmeName: 'Weekend Hindi',
          programmeCode: 'WEEKEND_HINDI',
          classOrGrade: String(grade).trim(),
          board: 'Virtual',
          agreedFee: fee || 500
        });
      }
    }

    // Parse Online Hindi (Cols 5-8, Rows 34 to 38)
    for (let r = 34; r <= 38; r++) {
      const row = rows[r];
      if (!row) continue;
      const name = row[6];
      const grade = row[7];
      const fee = parseFloat(row[8]);
      if (name === 'TOTAL') break;
      if (name && typeof name === 'string') {
        const cleanName = name.trim();
        const key = cleanName.toLowerCase();
        if (!studentMap[key]) studentMap[key] = { name: cleanName, programmes: [] };
        studentMap[key].programmes.push({
          programmeName: 'Online Hindi',
          programmeCode: 'ONLINE_HINDI',
          classOrGrade: String(grade).trim(),
          board: 'Online',
          agreedFee: fee || 700
        });
      }
    }

    ExcelImportModule.extractedStudents = Object.values(studentMap);
    ExcelImportModule.renderPreview();
  },

  renderPreview: () => {
    const container = document.getElementById('excel-preview-container');
    const tbody = document.getElementById('excel-preview-tbody');
    const countEl = document.getElementById('excel-preview-count');
    const multiCountEl = document.getElementById('excel-preview-multi-count');

    if (!container || !tbody) return;

    const list = ExcelImportModule.extractedStudents;
    const multiCount = list.filter(s => s.programmes.length > 1).length;

    countEl.textContent = `${list.length} Unique Students`;
    multiCountEl.textContent = `${multiCount} Multi-Programme Students`;

    tbody.innerHTML = list.map((s, idx) => {
      const progBadges = s.programmes.map(p => `
        <span class="badge badge-info" style="margin: 2px;">
          ${p.programmeName} (${p.classOrGrade} - ₹${p.agreedFee})
        </span>
      `).join('');

      const totalFee = s.programmes.reduce((sum, p) => sum + p.agreedFee, 0);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${Utils.escapeHtml(s.name)}</strong></td>
          <td>${progBadges}</td>
          <td><strong>${Utils.formatCurrency(totalFee)}</strong> / mo</td>
          <td><span class="badge badge-unpaid">UNPAID (Initial)</span></td>
        </tr>
      `;
    }).join('');

    container.style.display = 'block';
    Utils.renderIcons();
    Utils.showToast("Workbook Parsed", `Extracted ${list.length} students (${multiCount} enrolled in multiple programmes).`, "success");
  },

  // Confirm and Execute Import into Supabase
  confirmImport: async () => {
    const list = ExcelImportModule.extractedStudents;
    if (list.length === 0) {
      Utils.showToast("No Data", "No records to import.", "warning");
      return;
    }

    if (!confirm(`Import ${list.length} students into the database? Initial status will be UNPAID.`)) {
      return;
    }

    try {
      let importedCount = 0;
      const progMap = {};
      (AppState.programmes || []).forEach(p => {
        progMap[p.code] = p.id;
        progMap[p.name.toUpperCase()] = p.id;
      });

      for (const s of list) {
        // Check if student with this name already exists in database
        const existing = AppState.students.find(st => st.name.toLowerCase() === s.name.toLowerCase());
        let studentId = existing?.id;

        if (!existing) {
          const nextCode = Utils.getNextStudentId(AppState.students);
          const studentPayload = {
            student_id: nextCode,
            name: s.name,
            admission_date: new Date().toISOString().slice(0, 10),
            status: 'active',
            notes: 'Imported from Excel workbook',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: newSt, error: stErr } = await supabaseClient
            .from('students')
            .insert([studentPayload])
            .select();

          if (stErr) throw stErr;
          studentId = newSt[0].id;
          AppState.students.push(newSt[0]);
        }

        // Add programme enrolments
        for (const prog of s.programmes) {
          const programmeId = progMap[prog.programmeCode] || progMap['SUBJECT'];
          // Check if enrollment already exists
          const existsEn = existing?.enrollments?.some(e => e.programme_id === programmeId && e.status === 'active');
          if (!existsEn) {
            await supabaseClient.from('enrollments').insert([{
              student_id: studentId,
              programme_id: programmeId,
              class_or_grade: prog.classOrGrade,
              board: prog.board,
              agreed_fee: prog.agreedFee,
              start_date: new Date().toISOString().slice(0, 10),
              status: 'active',
              is_verified: true,
              notes: 'Imported from workbook',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
          }
        }
        importedCount++;
      }

      await AuthModule.logAudit('excel_import', 'students', 'batch', { importedCount });
      Utils.showToast("Import Complete", `Successfully imported ${importedCount} student profiles!`, "success");

      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();
      StudentsModule.renderStudentsTable();

      document.getElementById('excel-preview-container').style.display = 'none';
      window.location.hash = "#students";

    } catch (err) {
      console.error("Import error:", err);
      Utils.showToast("Import Error", err.message || "Failed to import records", "error");
    }
  }
};

window.ExcelImportModule = ExcelImportModule;

