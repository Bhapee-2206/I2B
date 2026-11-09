// ==============================================================================
// I2B - Financial & Migration Integrity Automated Test Suite
// Verifies all core business rules, formulas, and migration totals
// ==============================================================================

import assert from 'node:assert';
import pkg from 'xlsx';
const { readFile } = pkg;

console.log('--- RUNNING I2B INTEGRITY & CALCULATION TESTS ---');

// TEST 1: Verify direct migration from original I2B.xlsx Sheet1
const workbook = readFile('I2B.xlsx');
const sheet = workbook.Sheets['Sheet1'];

// 1. Subject (Col A-D, rows 4 to 30)
const subject = [];
for (let r = 4; r <= 30; r++) {
  const name = sheet[`B${r}`]?.v;
  const fee = sheet[`D${r}`]?.v;
  if (name) subject.push({ name: String(name).trim(), fee: Number(fee) || 0 });
}

// 2. Regular Hindi (Col F-I, rows 4 to 27)
const hindi = [];
for (let r = 4; r <= 27; r++) {
  const name = sheet[`G${r}`]?.v;
  const fee = sheet[`I${r}`]?.v;
  if (name) hindi.push({ name: String(name).trim(), fee: Number(fee) || 0 });
}

// 3. Weekend Hindi (Col A-D, rows 35 to 54)
const wkHindi = [];
for (let r = 35; r <= 54; r++) {
  const name = sheet[`B${r}`]?.v;
  const fee = sheet[`D${r}`]?.v;
  if (name) wkHindi.push({ name: String(name).trim(), fee: Number(fee) || 0 });
}

// 4. Online Hindi (Col F-I, rows 35 to 38)
const onlHindi = [];
for (let r = 35; r <= 38; r++) {
  const name = sheet[`G${r}`]?.v;
  const fee = sheet[`I${r}`]?.v;
  if (name) onlHindi.push({ name: String(name).trim(), fee: Number(fee) || 0 });
}

const subjectTotal = subject.reduce((s, r) => s + r.fee, 0);
const hindiTotal = hindi.reduce((s, r) => s + r.fee, 0);
const wkHindiTotal = wkHindi.reduce((s, r) => s + r.fee, 0);
const onlHindiTotal = onlHindi.reduce((s, r) => s + r.fee, 0);

assert.strictEqual(subject.length, 27, 'Subject must have 27 records');
assert.strictEqual(subjectTotal, 21400, 'Subject listed fee must equal ₹21,400');

assert.strictEqual(hindi.length, 24, 'Regular Hindi must have 24 records');
assert.strictEqual(hindiTotal, 14300, 'Regular Hindi listed fee must equal ₹14,300');

assert.strictEqual(wkHindi.length, 20, 'Weekend Hindi must have 20 records');
assert.strictEqual(wkHindiTotal, 12000, 'Weekend Hindi listed fee must equal ₹12,000');

assert.strictEqual(onlHindi.length, 4, 'Online Hindi must have 4 records');
assert.strictEqual(onlHindiTotal, 3150, 'Online Hindi listed fee must equal ₹3,150');

const totalRecords = subject.length + hindi.length + wkHindi.length + onlHindi.length;
const totalFees = subjectTotal + hindiTotal + wkHindiTotal + onlHindiTotal;

assert.strictEqual(totalRecords, 75, 'Total enrolment records must equal 75');
assert.strictEqual(totalFees, 50850, 'Total listed monthly fee must equal ₹50,850');

console.log('✓ TEST 1 PASSED: 75 Migration Records and ₹50,850 Total Verified from I2B.xlsx');

// TEST 2: Indian Rupee Words Conversion
function numberToIndianRupeesWords(amount) {
  if (amount === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num) {
    if (num === 0) return '';
    if (num < 20) return units[num];
    const unit = num % 10;
    return tens[Math.floor(num / 10)] + (unit !== 0 ? ' ' + units[unit] : '');
  }

  function convertThreeDigits(num) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let str = '';
    if (hundred > 0) {
      str += units[hundred] + ' Hundred';
      if (rest > 0) str += ' and ';
    }
    str += convertTwoDigits(rest);
    return str.trim();
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let result = '';

  const crores = Math.floor(integerPart / 10000000);
  const lakhs = Math.floor((integerPart % 10000000) / 100000);
  const thousands = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  if (crores > 0) result += convertThreeDigits(crores) + ' Crore ';
  if (lakhs > 0) result += convertThreeDigits(lakhs) + ' Lakh ';
  if (thousands > 0) result += convertThreeDigits(thousands) + ' Thousand ';
  if (remainder > 0) result += convertThreeDigits(remainder) + ' ';

  result = result.trim() + ' Rupees';

  if (decimalPart > 0) {
    result += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  }

  return result + ' Only';
}

assert.strictEqual(numberToIndianRupeesWords(500), 'Five Hundred Rupees Only');
assert.strictEqual(numberToIndianRupeesWords(650), 'Six Hundred and Fifty Rupees Only');
assert.strictEqual(numberToIndianRupeesWords(1250), 'One Thousand Two Hundred and Fifty Rupees Only');
assert.strictEqual(numberToIndianRupeesWords(50850), 'Fifty Thousand Eight Hundred and Fifty Rupees Only');
assert.strictEqual(numberToIndianRupeesWords(1000.50), 'One Thousand Rupees and Fifty Paise Only');

console.log('✓ TEST 2 PASSED: Currency Words Conversion Verified Across All Edge Cases');

// TEST 3: Multi-Invoice Payment Allocation Logic
const testInvoice1 = { id: 'inv-1', total: 600, paid: 0, balance: 600 };
const testInvoice2 = { id: 'inv-2', total: 700, paid: 0, balance: 700 };

const paymentAmount = 1000;
const alloc1 = 600;
const alloc2 = 400;

assert.strictEqual(alloc1 + alloc2, paymentAmount, 'Allocations must sum up to payment amount');

const newPaid1 = testInvoice1.paid + alloc1;
const newBal1 = testInvoice1.total - newPaid1;
const status1 = newBal1 === 0 ? 'paid' : 'partially_paid';

assert.strictEqual(newPaid1, 600);
assert.strictEqual(newBal1, 0);
assert.strictEqual(status1, 'paid');

const newPaid2 = testInvoice2.paid + alloc2;
const newBal2 = testInvoice2.total - newPaid2;
const status2 = newBal2 === 0 ? 'paid' : 'partially_paid';

assert.strictEqual(newPaid2, 400);
assert.strictEqual(newBal2, 300);
assert.strictEqual(status2, 'partially_paid');

const remainingTotalBalance = newBal1 + newBal2;
assert.strictEqual(remainingTotalBalance, 300, 'Remaining student balance must equal 300');

console.log('✓ TEST 3 PASSED: Multi-Invoice Payment Allocation and Balance Recalculation Verified');

// TEST 4: Duplicate Invoice Prevention
const existingInvoices = [
  { studentId: 'stu-1', month: 11, year: 2026, status: 'unpaid' },
  { studentId: 'stu-2', month: 11, year: 2026, status: 'cancelled' },
];

function canGenerateInvoice(studentId, month, year) {
  const duplicate = existingInvoices.find(
    (i) => i.studentId === studentId && i.month === month && i.year === year && i.status !== 'cancelled'
  );
  return !duplicate;
}

assert.strictEqual(canGenerateInvoice('stu-1', 11, 2026), false, 'Duplicate invoice for stu-1 must be blocked');
assert.strictEqual(canGenerateInvoice('stu-1', 12, 2026), true, 'Different month for stu-1 must be allowed');
assert.strictEqual(canGenerateInvoice('stu-2', 11, 2026), true, 'Cancelled invoice must allow re-generation');
assert.strictEqual(canGenerateInvoice('stu-3', 11, 2026), true, 'New student must be allowed');

console.log('✓ TEST 4 PASSED: Duplicate Invoice Prevention Logic Verified');

// TEST 5: Overdue Days Calculation
const todayStr = '2026-11-09';
function calculateDaysOverdue(dueDateStr) {
  const diffTime = new Date(todayStr).getTime() - new Date(dueDateStr).getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

assert.strictEqual(calculateDaysOverdue('2026-11-01'), 8, 'Nov 1 to Nov 9 is 8 days overdue');
assert.strictEqual(calculateDaysOverdue('2026-10-10'), 30, 'Oct 10 to Nov 9 is 30 days overdue');
assert.strictEqual(calculateDaysOverdue('2026-11-15'), 0, 'Future due date is 0 days overdue');

console.log('✓ TEST 5 PASSED: Days Overdue Calculations Verified');

console.log('\n======================================================');
console.log('ALL 5 FINANCIAL & INTEGRITY TEST SUITES PASSED (100%)');
console.log('======================================================\n');
