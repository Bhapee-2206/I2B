import json

with open('excel_extracted_data.json') as f:
    d = json.load(f)

subject = d['subject'] # 27
hindi = d['hindi'] # 24
wk_hindi = d['weekend_hindi'] # 20
onl_hindi = d['online_hindi'] # 4
matric_cbse = d['fee_structure_matric_cbse']
virtual_online = d['fee_structure_virtual_online']

sql_lines = []
sql_lines.append("-- ==============================================================================")
sql_lines.append("-- I2B - Seed Data Migration: Programmes, Standard Fees, & Excel Migration Records")
sql_lines.append("-- ==============================================================================\n")

# 1. Institution Settings
sql_lines.append("""
-- 1. Default Institution Settings
INSERT INTO public.institution_settings (
    id, institution_name, subtitle, tagline, logo_url, address, contact_phone, contact_email, whatsapp_number,
    currency_symbol, currency_code, receipt_prefix, invoice_prefix, payment_prefix, student_prefix, default_due_day,
    receipt_footer, whatsapp_mode
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'I2B Educational Institution',
    'Student & Monthly Fee Management',
    'Excellence in Tuition & Language Studies',
    '/logo.jpg',
    '123 Education Lane, Anna Nagar, Chennai, Tamil Nadu 600040',
    '+91 98765 43210',
    'admin@i2b-edu.com',
    '+91 98765 43210',
    '₹',
    'INR',
    'REC',
    'INV',
    'PAY',
    'STU',
    10,
    'Thank you for your prompt payment! This is an official computer-generated receipt.',
    'manual'
) ON CONFLICT (id) DO UPDATE SET
    institution_name = EXCLUDED.institution_name,
    address = EXCLUDED.address,
    updated_at = now();
""")

# 2. Programmes
sql_lines.append("""
-- 2. Default Programmes
INSERT INTO public.programmes (id, code, name, description, is_active, fee_mode, sort_order) VALUES
('b0000000-0000-0000-0000-000000000001', 'SUBJECT', 'Subject', 'Regular tuition covering core academic school curriculum', true, 'matric_cbse', 1),
('b0000000-0000-0000-0000-000000000002', 'HINDI', 'Hindi', 'Regular weekday Hindi language coaching and exam preparation', true, 'virtual_online', 2),
('b0000000-0000-0000-0000-000000000003', 'WEEKEND_HINDI', 'Weekend Hindi', 'Saturday and Sunday intensive Hindi language sessions', true, 'virtual_online', 3),
('b0000000-0000-0000-0000-000000000004', 'ONLINE_HINDI', 'Online Hindi', 'Remote interactive live online Hindi coaching sessions', true, 'virtual_online', 4)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    fee_mode = EXCLUDED.fee_mode,
    sort_order = EXCLUDED.sort_order;
""")

# 3. Standard Fee Structures
sql_lines.append("-- 3. Standard Fee Structures")
# Matric & CBSE
for idx, item in enumerate(matric_cbse, start=1):
    cls = item['class']
    m_val = item['matric']
    c_val = item['cbse']
    if m_val is not None and str(m_val).strip() != '-':
        try:
            m_fee = float(m_val)
            sql_lines.append(f"INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '{cls}', 'Matric', {m_fee}, true);")
        except ValueError:
            pass
    if c_val is not None and str(c_val).strip() != '-':
        try:
            c_fee = float(c_val)
            sql_lines.append(f"INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '{cls}', 'CBSE', {c_fee}, true);")
        except ValueError:
            pass

# Virtual & Online
for item in virtual_online:
    grd = item['grade']
    v_val = item['virtual']
    o_val = item['online']
    if v_val is not None and str(v_val).strip() != '-':
        try:
            v_fee = float(v_val)
            sql_lines.append(f"INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '{grd}', 'Virtual', {v_fee}, true);")
        except ValueError:
            pass
    if o_val is not None and str(o_val).strip() != '-':
        try:
            o_fee = float(o_val)
            sql_lines.append(f"INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '{grd}', 'Online', {o_fee}, true);")
        except ValueError:
            pass

# 4. Excel Migration Records & Seed Students / Enrolments
sql_lines.append("\n-- 4. Excel Migration Records (Exact 75 entries from Sheet1)")
all_entries = []
for r in subject:
    all_entries.append(('Subject', 'b0000000-0000-0000-0000-000000000001', r['sno'], r['name'], r['class'], r['fee']))
for r in hindi:
    all_entries.append(('Hindi', 'b0000000-0000-0000-0000-000000000002', r['sno'], r['name'], r['grade'], r['fee']))
for r in wk_hindi:
    all_entries.append(('Weekend Hindi', 'b0000000-0000-0000-0000-000000000003', r['sno'], r['name'], r['grade'], r['fee']))
for r in onl_hindi:
    all_entries.append(('Online Hindi', 'b0000000-0000-0000-0000-000000000004', r['sno'], r['name'], r['grade'], r['fee']))

duplicate_notes_map = {
    'monish': 'Duplicate name warning: Monish appears 4 times across Subject (7th ₹900 & ₹700), Hindi (1st ₹500), and Weekend Hindi (1st ₹500). Administrator must verify if separate students.',
    'nikitha': 'Multiple enrolment note: Nikitha appears in Subject (6th ₹700), Hindi (Basic ₹500 & 1st ₹500), and Weekend Hindi (school ₹500). Verify identity.',
    'nishitha': 'Multiple enrolment note: Nishitha appears in Subject (5th ₹600), Hindi (1st ₹500 twice), and Online Hindi (10th ₹1000). Verify identity.',
    'udhaya sree': 'Cross-programme note: Appears in Subject (3rd ₹650) and Hindi (Basic ₹500).',
    'harishankar': 'Cross-programme note: Appears in Subject (6th ₹650) and Weekend Hindi (2nd ₹600).',
    'harshitha': 'Cross-programme note: Appears in Hindi (8th ₹900) and Weekend Hindi (basic ₹500).',
    'bhairavi': 'Spelling variation warning: Likely matches "Bairavi" in Hindi (Basic ₹500).',
    'bairavi': 'Spelling variation warning: Likely matches "Bhairavi" in Subject (3rd ₹550).',
    'maha sri': 'Spelling variation warning: Likely matches "Maha sree" in Hindi (Basic ₹500).',
    'maha sree': 'Spelling variation warning: Likely matches "Maha sri" in Subject (6th ₹700).',
    'avinash': 'Name similarity warning: Compare with "Sai avinash" in Hindi (Basic ₹500).'
}

for i, (prog_name, prog_id, sno, name, grade, fee) in enumerate(all_entries, start=1):
    rec_uuid = f"c0000000-0000-0000-0000-{i:012d}"
    stu_uuid = f"d0000000-0000-0000-0000-{i:012d}"
    enr_uuid = f"e0000000-0000-0000-0000-{i:012d}"
    stu_code = f"I2B-STU-{i:03d}"
    
    clean_name = name.strip()
    safe_name = clean_name.replace("'", "''")
    safe_grade = grade.strip().replace("'", "''")
    
    dup_note = duplicate_notes_map.get(clean_name.lower(), '')
    clean_dup = dup_note.replace("'", "''")
    dup_note_escaped = f"'{clean_dup}'" if dup_note else "NULL"
    
    # 1. Insert Student profile
    sql_lines.append(f"""
INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('{stu_uuid}', '{stu_code}', '{safe_name}', CURRENT_DATE, 'active', 'Imported from {prog_name} Excel migration')
ON CONFLICT (student_id) DO NOTHING;""")

    # 2. Insert Enrollment record
    sql_lines.append(f"""
INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('{enr_uuid}', '{stu_uuid}', '{prog_id}', '{safe_grade}', {fee:.2f}, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;""")

    # 3. Insert Migration Audit Record
    sql_lines.append(f"""
INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('{rec_uuid}', 'Sheet1', '{prog_name}', {sno}, '{safe_name}', '{safe_grade}', {fee:.2f}, {dup_note_escaped}, '{stu_uuid}', '{enr_uuid}', 'pending')
ON CONFLICT (id) DO NOTHING;""")

with open('supabase/migrations/20261109000001_seed_i2b_data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print("Generated supabase/migrations/20261109000001_seed_i2b_data.sql with all 75 records and fee structures!")
