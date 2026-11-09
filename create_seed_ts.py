import json

with open('excel_extracted_data.json') as f:
    d = json.load(f)

subject = d['subject']
hindi = d['hindi']
wk_hindi = d['weekend_hindi']
onl_hindi = d['online_hindi']
matric_cbse = d['fee_structure_matric_cbse']
virtual_online = d['fee_structure_virtual_online']

fees_list = []
fee_idx = 1
for item in matric_cbse:
    cls = item['class']
    m = item['matric']
    c = item['cbse']
    if m is not None and str(m).strip() != '-':
        try:
            m_fee = float(m)
            fees_list.append({
                'id': f'f0000000-0000-0000-0000-{fee_idx:012d}',
                'programme_id': 'b0000000-0000-0000-0000-000000000001',
                'class_or_grade': cls,
                'board': 'Matric',
                'monthly_fee': m_fee,
                'is_active': True,
                'effective_from': '2026-01-01'
            })
            fee_idx += 1
        except: pass
    if c is not None and str(c).strip() != '-':
        try:
            c_fee = float(c)
            fees_list.append({
                'id': f'f0000000-0000-0000-0000-{fee_idx:012d}',
                'programme_id': 'b0000000-0000-0000-0000-000000000001',
                'class_or_grade': cls,
                'board': 'CBSE',
                'monthly_fee': c_fee,
                'is_active': True,
                'effective_from': '2026-01-01'
            })
            fee_idx += 1
        except: pass

for item in virtual_online:
    grd = item['grade']
    v = item['virtual']
    o = item['online']
    if v is not None and str(v).strip() != '-':
        try:
            v_fee = float(v)
            fees_list.append({
                'id': f'f0000000-0000-0000-0000-{fee_idx:012d}',
                'programme_id': 'b0000000-0000-0000-0000-000000000002',
                'class_or_grade': grd,
                'board': 'Virtual',
                'monthly_fee': v_fee,
                'is_active': True,
                'effective_from': '2026-01-01'
            })
            fee_idx += 1
        except: pass
    if o is not None and str(o).strip() != '-':
        try:
            o_fee = float(o)
            fees_list.append({
                'id': f'f0000000-0000-0000-0000-{fee_idx:012d}',
                'programme_id': 'b0000000-0000-0000-0000-000000000004',
                'class_or_grade': grd,
                'board': 'Online',
                'monthly_fee': o_fee,
                'is_active': True,
                'effective_from': '2026-01-01'
            })
            fee_idx += 1
        except: pass

duplicate_notes_map = {
    'monish': 'Duplicate name warning: Monish appears 4 times across Subject (7th ₹900 & ₹700), Hindi (1st ₹500), and Weekend Hindi (1st ₹500). Administrator must verify if separate students.',
    'nikitha': 'Multiple enrolment note: Nikitha appears in Subject (6th ₹700), Hindi (Basic ₹500 & 1st ₹500), and Weekend Hindi (school ₹500). Verify identity.',
    'nishitha': 'Multiple enrolment note: Nishitha appears in Subject (5th ₹600), Hindi (1st ₹500 twice), and Online Hindi (10th ₹1000). Verify identity.',
    'udhaya sree': 'Cross-programme note: Appears in Subject (3rd ₹650) and Hindi (Basic ₹500).',
    'harishankar': 'Cross-programme note: Appears in Subject (6th ₹650) and Weekend Hindi (2nd ₹600).',
    'harshitha': 'Cross-programme note: Appears in Hindi (8th ₹900) and Weekend Hindi (basic ₹500).',
    'bhairavi': 'Spelling variation warning: Likely matches Bairavi in Hindi (Basic ₹500).',
    'bairavi': 'Spelling variation warning: Likely matches Bhairavi in Subject (3rd ₹550).',
    'maha sri': 'Spelling variation warning: Likely matches Maha sree in Hindi (Basic ₹500).',
    'maha sree': 'Spelling variation warning: Likely matches Maha sri in Subject (6th ₹700).',
    'avinash': 'Name similarity warning: Compare with Sai avinash in Hindi (Basic ₹500).'
}

all_entries = []
for r in subject:
    all_entries.append(('Subject', 'b0000000-0000-0000-0000-000000000001', r['sno'], r['name'], r['class'], r['fee']))
for r in hindi:
    all_entries.append(('Hindi', 'b0000000-0000-0000-0000-000000000002', r['sno'], r['name'], r['grade'], r['fee']))
for r in wk_hindi:
    all_entries.append(('Weekend Hindi', 'b0000000-0000-0000-0000-000000000003', r['sno'], r['name'], r['grade'], r['fee']))
for r in onl_hindi:
    all_entries.append(('Online Hindi', 'b0000000-0000-0000-0000-000000000004', r['sno'], r['name'], r['grade'], r['fee']))

students = []
enrollments = []
migration_records = []

for i, (prog_name, prog_id, sno, name, grade, fee) in enumerate(all_entries, start=1):
    rec_uuid = f'c0000000-0000-0000-0000-{i:012d}'
    stu_uuid = f'd0000000-0000-0000-0000-{i:012d}'
    enr_uuid = f'e0000000-0000-0000-0000-{i:012d}'
    stu_code = f'I2B-STU-{i:03d}'
    clean_name = name.strip()
    dup_note = duplicate_notes_map.get(clean_name.lower())

    students.append({
        'id': stu_uuid,
        'student_id': stu_code,
        'name': clean_name,
        'parent_name': None,
        'whatsapp_number': f'+91 98765 {i:05d}',
        'alt_phone': None,
        'address': 'Chennai, Tamil Nadu',
        'admission_date': '2026-01-01',
        'status': 'active',
        'notes': f'Imported from {prog_name} Excel migration record #{sno}',
        'created_at': '2026-11-09T00:00:00Z',
        'updated_at': '2026-11-09T00:00:00Z'
    })

    enrollments.append({
        'id': enr_uuid,
        'student_id': stu_uuid,
        'programme_id': prog_id,
        'class_or_grade': grade.strip(),
        'board': 'Matric' if 'th' in grade or 'rd' in grade or 'st' in grade or 'nd' in grade else 'Standard',
        'agreed_fee': fee,
        'start_date': '2026-01-01',
        'end_date': None,
        'status': 'active',
        'is_verified': False,
        'notes': f'Proposed monthly fee imported from {prog_name} Sheet1',
        'created_at': '2026-11-09T00:00:00Z',
        'updated_at': '2026-11-09T00:00:00Z'
    })

    migration_records.append({
        'id': rec_uuid,
        'source_sheet': 'Sheet1',
        'source_programme': prog_name,
        'source_sno': sno,
        'original_name': clean_name,
        'original_class_or_grade': grade.strip(),
        'original_fee': fee,
        'potential_duplicate_note': dup_note,
        'matched_student_id': stu_uuid,
        'matched_enrollment_id': enr_uuid,
        'verification_status': 'flagged' if dup_note else 'pending',
        'notes': 'Pending administrator verification before billing activation',
        'created_at': '2026-11-09T00:00:00Z',
        'updated_at': '2026-11-09T00:00:00Z'
    })

header = """// ==============================================================================
// I2B - Seed Data extracted directly from I2B.xlsx Sheet1
// Exact 75 enrolment records, standard fee matrices, and default configuration
// ==============================================================================

import { Programme, FeeStructure, Student, Enrollment, MigrationRecord, InstitutionSettings } from '../types';

export const DEFAULT_SETTINGS: InstitutionSettings = {
  id: 'a0000000-0000-0000-0000-000000000001',
  institution_name: 'I2B Educational Institution',
  subtitle: 'Student & Monthly Fee Management',
  tagline: 'Excellence in Tuition & Language Studies',
  logo_url: '/logo.jpg',
  address: '123 Education Lane, Anna Nagar, Chennai, Tamil Nadu 600040',
  contact_phone: '+91 98765 43210',
  contact_email: 'admin@i2b-edu.com',
  whatsapp_number: '+91 98765 43210',
  currency_symbol: '₹',
  currency_code: 'INR',
  receipt_prefix: 'REC',
  invoice_prefix: 'INV',
  payment_prefix: 'PAY',
  student_prefix: 'STU',
  default_due_day: 10,
  receipt_footer: 'Thank you for your prompt payment! This is an official computer-generated receipt.',
  whatsapp_mode: 'manual',
  created_at: '2026-11-09T00:00:00Z',
  updated_at: '2026-11-09T00:00:00Z'
};

export const DEFAULT_PROGRAMMES: Programme[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    code: 'SUBJECT',
    name: 'Subject',
    description: 'Regular tuition covering core academic school curriculum',
    is_active: true,
    fee_mode: 'matric_cbse',
    sort_order: 1,
    created_at: '2026-11-09T00:00:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    code: 'HINDI',
    name: 'Hindi',
    description: 'Regular weekday Hindi language coaching and exam preparation',
    is_active: true,
    fee_mode: 'virtual_online',
    sort_order: 2,
    created_at: '2026-11-09T00:00:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    code: 'WEEKEND_HINDI',
    name: 'Weekend Hindi',
    description: 'Saturday and Sunday intensive Hindi language sessions',
    is_active: true,
    fee_mode: 'virtual_online',
    sort_order: 3,
    created_at: '2026-11-09T00:00:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    code: 'ONLINE_HINDI',
    name: 'Online Hindi',
    description: 'Remote interactive live online Hindi coaching sessions',
    is_active: true,
    fee_mode: 'virtual_online',
    sort_order: 4,
    created_at: '2026-11-09T00:00:00Z'
  }
];
"""

with open('src/services/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(header)
    f.write(f"\nexport const DEFAULT_FEE_STRUCTURES: FeeStructure[] = {json.dumps(fees_list, indent=2)};\n")
    f.write(f"\nexport const DEFAULT_STUDENTS: Student[] = {json.dumps(students, indent=2)};\n")
    f.write(f"\nexport const DEFAULT_ENROLLMENTS: Enrollment[] = {json.dumps(enrollments, indent=2)};\n")
    f.write(f"\nexport const DEFAULT_MIGRATION_RECORDS: MigrationRecord[] = {json.dumps(migration_records, indent=2)};\n")

print("src/services/seedData.ts generated!")
