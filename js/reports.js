/**
 * EDUTRACK REPORTS & EXPORT MODULE
 * Summary Analytics, SheetJS Excel Export, CSV & Printable Reports
 */

const ReportsModule = {
  init: async () => {
    ReportsModule.renderReports();
  },

  // Render Reports Summary
  renderReports: () => {
    const students = AppState.students || [];
    const activeStudents = students.filter(s => s.status === 'active');
    const payments = AppState.payments || [];
    const invoices = AppState.invoices || [];

    // Summary counts
    const totalCollected = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalPending = students.reduce((sum, s) => sum + StudentsModule.calculateOutstandingBalance(s), 0);

    const statCol = document.getElementById('report-stat-collected');
    const statPen = document.getElementById('report-stat-pending');
    const statStudents = document.getElementById('report-stat-students');

    if (statCol) statCol.textContent = Utils.formatCurrency(totalCollected);
    if (statPen) statPen.textContent = Utils.formatCurrency(totalPending);
    if (statStudents) statStudents.textContent = activeStudents.length;

    // Render Student-Wise Report Table
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2rem;">No data available for reports.</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const monthlyFee = StudentsModule.calculateMonthlyFee(s);
      const pendingBal = StudentsModule.calculateOutstandingBalance(s);
      const paid = (s.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const progs = (s.enrollments || []).filter(e => e.status === 'active').map(e => e.programmes?.name).join(', ') || 'None';

      return `
        <tr>
          <td><strong>${Utils.escapeHtml(s.student_id)}</strong></td>
          <td>${Utils.escapeHtml(s.name)}</td>
          <td>${Utils.escapeHtml(s.parent_name || '—')}</td>
          <td>${Utils.escapeHtml(progs)}</td>
          <td>${Utils.formatCurrency(monthlyFee)}</td>
          <td><span style="color: var(--success); font-weight: 600;">${Utils.formatCurrency(paid)}</span></td>
          <td><strong style="color: ${pendingBal > 0 ? 'var(--danger)' : 'var(--success)'};">${Utils.formatCurrency(pendingBal)}</strong></td>
        </tr>
      `;
    }).join('');

    Utils.renderIcons();
  },

  // Export Table to Excel using SheetJS
  exportToExcel: () => {
    if (typeof XLSX === 'undefined') {
      alert("SheetJS library is loading. Please try again.");
      return;
    }

    const students = AppState.students || [];
    const rows = students.map((s, idx) => {
      const activeEn = (s.enrollments || []).filter(e => e.status === 'active');
      const progs = activeEn.map(e => `${e.programmes?.name || ''} (${e.class_or_grade})`).join('; ');
      const monthlyFee = StudentsModule.calculateMonthlyFee(s);
      const pending = StudentsModule.calculateOutstandingBalance(s);
      const paid = (s.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      return {
        "S.No": idx + 1,
        "Student ID": s.student_id,
        "Student Name": s.name,
        "Parent Name": s.parent_name || '',
        "WhatsApp Number": s.whatsapp_number || '',
        "Programmes": progs,
        "Monthly Fee (INR)": monthlyFee,
        "Total Paid (INR)": paid,
        "Pending Balance (INR)": pending,
        "Status": s.status
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Fee Report");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `EduTrack_Student_Report_${dateStr}.xlsx`);
    Utils.showToast("Export Complete", "Student Fee Report exported to Excel", "success");
  },

  // Export to CSV
  exportToCSV: () => {
    if (typeof XLSX === 'undefined') {
      alert("SheetJS library is loading. Please try again.");
      return;
    }

    const students = AppState.students || [];
    const rows = students.map((s, idx) => ({
      "S.No": idx + 1,
      "Student ID": s.student_id,
      "Student Name": s.name,
      "WhatsApp Number": s.whatsapp_number || '',
      "Monthly Fee": StudentsModule.calculateMonthlyFee(s),
      "Pending Balance": StudentsModule.calculateOutstandingBalance(s),
      "Status": s.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `EduTrack_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    Utils.showToast("Export Complete", "Student Report exported to CSV", "success");
  }
};

window.ReportsModule = ReportsModule;

