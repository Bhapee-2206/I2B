import { Programme } from '../types';

export const SUBJECT_CLASSES = [
  'LKG',
  'UKG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th'
];

export const HINDI_GRADES = [
  'Basic',
  'School',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th'
];

export function normalizeClassOrGrade(c?: string | null): string {
  if (!c) return '';
  let s = c.toString().trim().toLowerCase();
  if (s.endsWith('.0')) {
    s = s.slice(0, -2);
  }
  if (s.endsWith('st') || s.endsWith('nd') || s.endsWith('rd') || s.endsWith('th')) {
    const prefix = s.slice(0, -2);
    if (!isNaN(Number(prefix)) && prefix.length > 0) {
      s = prefix;
    }
  }
  return s;
}

export function findMatchingFee(
  feeStructures: Array<{ programme_id: string; class_or_grade: string; board?: string | null; monthly_fee: number }>,
  programmeId: string,
  classOrGrade: string,
  board?: string | null
): number | null {
  if (!programmeId || !classOrGrade) return null;
  const targetNorm = normalizeClassOrGrade(classOrGrade);
  const targetBoard = (board || '').trim().toLowerCase();

  // 1. Exact match on normalized class + matching board
  const exact = feeStructures.find(f => {
    if (f.programme_id !== programmeId) return false;
    const fNorm = normalizeClassOrGrade(f.class_or_grade);
    if (fNorm !== targetNorm) return false;
    const fBoard = (f.board || '').trim().toLowerCase();
    if (targetBoard && fBoard && targetBoard !== fBoard) return false;
    return true;
  });

  if (exact) return exact.monthly_fee;

  // 2. Match on normalized class regardless of board
  const classOnly = feeStructures.find(f => {
    if (f.programme_id !== programmeId) return false;
    return normalizeClassOrGrade(f.class_or_grade) === targetNorm;
  });

  return classOnly ? classOnly.monthly_fee : null;
}

/**
 * Returns the next promoted class in progression.
 * E.g., LKG -> UKG -> 1st -> 2nd ... -> 12th
 * Basic -> 1st -> 2nd ... -> 9th
 */
export function getNextPromotedClass(currentClass: string, programme?: Programme): string | null {
  const norm = normalizeClassOrGrade(currentClass);
  const isSubject = !programme || programme.code === 'SUBJECT';

  if (isSubject) {
    if (norm === 'lkg') return 'UKG';
    if (norm === 'ukg') return '1st';
    const num = parseInt(norm, 10);
    if (!isNaN(num) && num >= 1 && num < 12) {
      const nextNum = num + 1;
      const suffix = nextNum === 2 ? 'nd' : nextNum === 3 ? 'rd' : 'th';
      return `${nextNum}${suffix}`;
    }
    return null; // Already at 12th
  } else {
    // Hindi progression
    if (norm === 'basic' || norm === 'school') return '1st';
    const num = parseInt(norm, 10);
    if (!isNaN(num) && num >= 1 && num < 9) {
      const nextNum = num + 1;
      const suffix = nextNum === 2 ? 'nd' : nextNum === 3 ? 'rd' : 'th';
      return `${nextNum}${suffix}`;
    }
    return null; // Already at 9th
  }
}
