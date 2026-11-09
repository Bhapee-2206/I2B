-- ==============================================================================
-- I2B - Seed Data Migration: Programmes, Standard Fees, & Excel Migration Records
-- ==============================================================================


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

-- 3. Standard Fee Structures
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', 'LKG', 'Matric', 500.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', 'LKG', 'CBSE', 600.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', 'UKG', 'Matric', 500.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', 'UKG', 'CBSE', 600.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '1.0', 'Matric', 550.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '1.0', 'CBSE', 600.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '2.0', 'Matric', 600.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '2.0', 'CBSE', 650.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '3.0', 'Matric', 600.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '3.0', 'CBSE', 650.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '4.0', 'Matric', 600.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '4.0', 'CBSE', 650.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '5.0', 'Matric', 650.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '5.0', 'CBSE', 700.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '6.0', 'Matric', 650.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '6.0', 'CBSE', 700.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '7.0', 'Matric', 650.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '7.0', 'CBSE', 750.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '8.0', 'Matric', 800.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '8.0', 'CBSE', 900.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '9.0', 'Matric', 900.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '10.0', 'Matric', 1000.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '11.0', 'Matric', 1100.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000001', '12.0', 'Matric', 1200.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', 'Basic', 'Virtual', 500.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', 'Basic', 'Online', 750.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '1.0', 'Virtual', 500.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '1.0', 'Online', 750.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '2.0', 'Virtual', 600.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '2.0', 'Online', 750.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '3.0', 'Virtual', 700.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '3.0', 'Online', 850.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '4.0', 'Virtual', 800.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '4.0', 'Online', 950.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '5.0', 'Virtual', 900.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '5.0', 'Online', 1050.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '6.0', 'Virtual', 1000.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '6.0', 'Online', 1150.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '7.0', 'Virtual', 1100.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '7.0', 'Online', 1250.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '8.0', 'Virtual', 1200.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '8.0', 'Online', 1350.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000002', '9.0', 'Virtual', 1300.0, true);
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, is_active) VALUES ('b0000000-0000-0000-0000-000000000004', '9.0', 'Online', 1450.0, true);

-- 4. Excel Migration Records (Exact 75 entries from Sheet1)

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000001', 'I2B-STU-001', 'Aryan', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'LKG', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000001', 'Sheet1', 'Subject', 1, 'Aryan', 'LKG', 500.00, NULL, 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000002', 'I2B-STU-002', 'Mohit', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '1st', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000002', 'Sheet1', 'Subject', 2, 'Mohit', '1st', 600.00, NULL, 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000003', 'I2B-STU-003', 'Udhaya sree', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '3rd', 650.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000003', 'Sheet1', 'Subject', 3, 'Udhaya sree', '3rd', 650.00, 'Cross-programme note: Appears in Subject (3rd ₹650) and Hindi (Basic ₹500).', 'd0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000004', 'I2B-STU-004', 'Bhairavi', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', '3rd', 550.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000004', 'Sheet1', 'Subject', 4, 'Bhairavi', '3rd', 550.00, 'Spelling variation warning: Likely matches "Bairavi" in Hindi (Basic ₹500).', 'd0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000005', 'I2B-STU-005', 'Manoj', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', '5th', 800.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000005', 'Sheet1', 'Subject', 5, 'Manoj', '5th', 800.00, NULL, 'd0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000006', 'I2B-STU-006', 'Nishitha', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', '5th', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000006', 'Sheet1', 'Subject', 6, 'Nishitha', '5th', 600.00, 'Multiple enrolment note: Nishitha appears in Subject (5th ₹600), Hindi (1st ₹500 twice), and Online Hindi (10th ₹1000). Verify identity.', 'd0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000007', 'I2B-STU-007', 'Jaiwanth', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', '5th', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000007', 'Sheet1', 'Subject', 7, 'Jaiwanth', '5th', 500.00, NULL, 'd0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000007', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000008', 'I2B-STU-008', 'Nikitha', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', '6th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000008', 'Sheet1', 'Subject', 8, 'Nikitha', '6th', 700.00, 'Multiple enrolment note: Nikitha appears in Subject (6th ₹700), Hindi (Basic ₹500 & 1st ₹500), and Weekend Hindi (school ₹500). Verify identity.', 'd0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000008', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000009', 'I2B-STU-009', 'Harishankar', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', '6th', 650.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000009', 'Sheet1', 'Subject', 9, 'Harishankar', '6th', 650.00, 'Cross-programme note: Appears in Subject (6th ₹650) and Weekend Hindi (2nd ₹600).', 'd0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000009', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000010', 'I2B-STU-010', 'Maha sri', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', '6th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000010', 'Sheet1', 'Subject', 10, 'Maha sri', '6th', 700.00, 'Spelling variation warning: Likely matches "Maha sree" in Hindi (Basic ₹500).', 'd0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000010', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000011', 'I2B-STU-011', 'Riswanth', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001', '7th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000011', 'Sheet1', 'Subject', 11, 'Riswanth', '7th', 700.00, NULL, 'd0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000011', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000012', 'I2B-STU-012', 'Monish', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001', '7th', 900.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000012', 'Sheet1', 'Subject', 12, 'Monish', '7th', 900.00, 'Duplicate name warning: Monish appears 4 times across Subject (7th ₹900 & ₹700), Hindi (1st ₹500), and Weekend Hindi (1st ₹500). Administrator must verify if separate students.', 'd0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000012', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000013', 'I2B-STU-013', 'Monish', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001', '7th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000013', 'Sheet1', 'Subject', 13, 'Monish', '7th', 700.00, 'Duplicate name warning: Monish appears 4 times across Subject (7th ₹900 & ₹700), Hindi (1st ₹500), and Weekend Hindi (1st ₹500). Administrator must verify if separate students.', 'd0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000013', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000014', 'I2B-STU-014', 'Akshaya', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000001', '7th', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000014', 'Sheet1', 'Subject', 14, 'Akshaya', '7th', 600.00, NULL, 'd0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000014', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000015', 'I2B-STU-015', 'Ashwin', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000001', '9th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000015', 'Sheet1', 'Subject', 15, 'Ashwin', '9th', 700.00, NULL, 'd0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000015', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000016', 'I2B-STU-016', 'Rishitha', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000001', '9th', 800.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000016', 'Sheet1', 'Subject', 16, 'Rishitha', '9th', 800.00, NULL, 'd0000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000016', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000017', 'I2B-STU-017', 'Partha sarathy', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000017', 'd0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000001', '9th', 650.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000017', 'Sheet1', 'Subject', 17, 'Partha sarathy', '9th', 650.00, NULL, 'd0000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000017', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000018', 'I2B-STU-018', 'Sarika', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000018', 'd0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000001', '10th', 1000.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000018', 'Sheet1', 'Subject', 18, 'Sarika', '10th', 1000.00, NULL, 'd0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000018', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000019', 'I2B-STU-019', 'Sadana', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000019', 'd0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000001', '10th', 1000.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000019', 'Sheet1', 'Subject', 19, 'Sadana', '10th', 1000.00, NULL, 'd0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000019', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000020', 'I2B-STU-020', 'Habitha', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000020', 'd0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000001', '10th', 1000.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000020', 'Sheet1', 'Subject', 20, 'Habitha', '10th', 1000.00, NULL, 'd0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000020', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000021', 'I2B-STU-021', 'Avinash', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000001', '11th', 1100.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000021', 'Sheet1', 'Subject', 21, 'Avinash', '11th', 1100.00, 'Name similarity warning: Compare with "Sai avinash" in Hindi (Basic ₹500).', 'd0000000-0000-0000-0000-000000000021', 'e0000000-0000-0000-0000-000000000021', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000022', 'I2B-STU-022', 'Jerico', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000001', '11th', 1000.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000022', 'Sheet1', 'Subject', 22, 'Jerico', '11th', 1000.00, NULL, 'd0000000-0000-0000-0000-000000000022', 'e0000000-0000-0000-0000-000000000022', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000023', 'I2B-STU-023', 'Shyam', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000001', '11th', 1000.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000023', 'Sheet1', 'Subject', 23, 'Shyam', '11th', 1000.00, NULL, 'd0000000-0000-0000-0000-000000000023', 'e0000000-0000-0000-0000-000000000023', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000024', 'I2B-STU-024', 'Thulasi', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000024', 'd0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000001', '12th', 1200.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000024', 'Sheet1', 'Subject', 24, 'Thulasi', '12th', 1200.00, NULL, 'd0000000-0000-0000-0000-000000000024', 'e0000000-0000-0000-0000-000000000024', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000025', 'I2B-STU-025', 'Kavya', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000025', 'd0000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000001', '12th', 1200.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000025', 'Sheet1', 'Subject', 25, 'Kavya', '12th', 1200.00, NULL, 'd0000000-0000-0000-0000-000000000025', 'e0000000-0000-0000-0000-000000000025', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000026', 'I2B-STU-026', 'Gopika', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000026', 'd0000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000001', '12th', 800.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000026', 'Sheet1', 'Subject', 26, 'Gopika', '12th', 800.00, NULL, 'd0000000-0000-0000-0000-000000000026', 'e0000000-0000-0000-0000-000000000026', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000027', 'I2B-STU-027', 'karthigai Lakshmi', CURRENT_DATE, 'active', 'Imported from Subject Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000027', 'd0000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000001', '12th', 800.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000027', 'Sheet1', 'Subject', 27, 'karthigai Lakshmi', '12th', 800.00, NULL, 'd0000000-0000-0000-0000-000000000027', 'e0000000-0000-0000-0000-000000000027', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000028', 'I2B-STU-028', 'Maha sree', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000028', 'd0000000-0000-0000-0000-000000000028', 'b0000000-0000-0000-0000-000000000002', 'Basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000028', 'Sheet1', 'Hindi', 1, 'Maha sree', 'Basic', 500.00, 'Spelling variation warning: Likely matches "Maha sri" in Subject (6th ₹700).', 'd0000000-0000-0000-0000-000000000028', 'e0000000-0000-0000-0000-000000000028', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000029', 'I2B-STU-029', 'Meha sree', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000029', 'd0000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000002', 'Basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000029', 'Sheet1', 'Hindi', 2, 'Meha sree', 'Basic', 500.00, NULL, 'd0000000-0000-0000-0000-000000000029', 'e0000000-0000-0000-0000-000000000029', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000030', 'I2B-STU-030', 'Udhaya sree', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000030', 'd0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000002', 'Basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000030', 'Sheet1', 'Hindi', 3, 'Udhaya sree', 'Basic', 500.00, 'Cross-programme note: Appears in Subject (3rd ₹650) and Hindi (Basic ₹500).', 'd0000000-0000-0000-0000-000000000030', 'e0000000-0000-0000-0000-000000000030', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000031', 'I2B-STU-031', 'Sharan', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000031', 'd0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000002', 'Basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000031', 'Sheet1', 'Hindi', 4, 'Sharan', 'Basic', 500.00, NULL, 'd0000000-0000-0000-0000-000000000031', 'e0000000-0000-0000-0000-000000000031', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000032', 'I2B-STU-032', 'Nikitha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000032', 'd0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000002', 'Basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000032', 'Sheet1', 'Hindi', 5, 'Nikitha', 'Basic', 500.00, 'Multiple enrolment note: Nikitha appears in Subject (6th ₹700), Hindi (Basic ₹500 & 1st ₹500), and Weekend Hindi (school ₹500). Verify identity.', 'd0000000-0000-0000-0000-000000000032', 'e0000000-0000-0000-0000-000000000032', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000033', 'I2B-STU-033', 'Sai avinash', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000033', 'd0000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000002', 'Basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000033', 'Sheet1', 'Hindi', 6, 'Sai avinash', 'Basic', 500.00, NULL, 'd0000000-0000-0000-0000-000000000033', 'e0000000-0000-0000-0000-000000000033', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000034', 'I2B-STU-034', 'Bairavi', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000034', 'd0000000-0000-0000-0000-000000000034', 'b0000000-0000-0000-0000-000000000002', 'Basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000034', 'Sheet1', 'Hindi', 7, 'Bairavi', 'Basic', 500.00, 'Spelling variation warning: Likely matches "Bhairavi" in Subject (3rd ₹550).', 'd0000000-0000-0000-0000-000000000034', 'e0000000-0000-0000-0000-000000000034', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000035', 'I2B-STU-035', 'Nishitha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000035', 'd0000000-0000-0000-0000-000000000035', 'b0000000-0000-0000-0000-000000000002', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000035', 'Sheet1', 'Hindi', 8, 'Nishitha', '1st', 500.00, 'Multiple enrolment note: Nishitha appears in Subject (5th ₹600), Hindi (1st ₹500 twice), and Online Hindi (10th ₹1000). Verify identity.', 'd0000000-0000-0000-0000-000000000035', 'e0000000-0000-0000-0000-000000000035', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000036', 'I2B-STU-036', 'Nikitha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000036', 'd0000000-0000-0000-0000-000000000036', 'b0000000-0000-0000-0000-000000000002', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000036', 'Sheet1', 'Hindi', 9, 'Nikitha', '1st', 500.00, 'Multiple enrolment note: Nikitha appears in Subject (6th ₹700), Hindi (Basic ₹500 & 1st ₹500), and Weekend Hindi (school ₹500). Verify identity.', 'd0000000-0000-0000-0000-000000000036', 'e0000000-0000-0000-0000-000000000036', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000037', 'I2B-STU-037', 'Nishitha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000037', 'd0000000-0000-0000-0000-000000000037', 'b0000000-0000-0000-0000-000000000002', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000037', 'Sheet1', 'Hindi', 10, 'Nishitha', '1st', 500.00, 'Multiple enrolment note: Nishitha appears in Subject (5th ₹600), Hindi (1st ₹500 twice), and Online Hindi (10th ₹1000). Verify identity.', 'd0000000-0000-0000-0000-000000000037', 'e0000000-0000-0000-0000-000000000037', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000038', 'I2B-STU-038', 'Monish', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000038', 'd0000000-0000-0000-0000-000000000038', 'b0000000-0000-0000-0000-000000000002', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000038', 'Sheet1', 'Hindi', 11, 'Monish', '1st', 500.00, 'Duplicate name warning: Monish appears 4 times across Subject (7th ₹900 & ₹700), Hindi (1st ₹500), and Weekend Hindi (1st ₹500). Administrator must verify if separate students.', 'd0000000-0000-0000-0000-000000000038', 'e0000000-0000-0000-0000-000000000038', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000039', 'I2B-STU-039', 'Mithran', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000039', 'd0000000-0000-0000-0000-000000000039', 'b0000000-0000-0000-0000-000000000002', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000039', 'Sheet1', 'Hindi', 12, 'Mithran', '1st', 500.00, NULL, 'd0000000-0000-0000-0000-000000000039', 'e0000000-0000-0000-0000-000000000039', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000040', 'I2B-STU-040', 'Krisha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000040', 'd0000000-0000-0000-0000-000000000040', 'b0000000-0000-0000-0000-000000000002', '2nd', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000040', 'Sheet1', 'Hindi', 13, 'Krisha', '2nd', 600.00, NULL, 'd0000000-0000-0000-0000-000000000040', 'e0000000-0000-0000-0000-000000000040', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000041', 'I2B-STU-041', 'Dhanushigan', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000041', 'd0000000-0000-0000-0000-000000000041', 'b0000000-0000-0000-0000-000000000002', '3rd', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000041', 'Sheet1', 'Hindi', 14, 'Dhanushigan', '3rd', 700.00, NULL, 'd0000000-0000-0000-0000-000000000041', 'e0000000-0000-0000-0000-000000000041', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000042', 'I2B-STU-042', 'Raja Guru', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000042', 'd0000000-0000-0000-0000-000000000042', 'b0000000-0000-0000-0000-000000000002', '3rd', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000042', 'Sheet1', 'Hindi', 15, 'Raja Guru', '3rd', 700.00, NULL, 'd0000000-0000-0000-0000-000000000042', 'e0000000-0000-0000-0000-000000000042', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000043', 'I2B-STU-043', 'Krishna moorthy', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000043', 'd0000000-0000-0000-0000-000000000043', 'b0000000-0000-0000-0000-000000000002', '3rd', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000043', 'Sheet1', 'Hindi', 16, 'Krishna moorthy', '3rd', 600.00, NULL, 'd0000000-0000-0000-0000-000000000043', 'e0000000-0000-0000-0000-000000000043', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000044', 'I2B-STU-044', 'Pranitha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000044', 'd0000000-0000-0000-0000-000000000044', 'b0000000-0000-0000-0000-000000000002', '3rd', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000044', 'Sheet1', 'Hindi', 17, 'Pranitha', '3rd', 600.00, NULL, 'd0000000-0000-0000-0000-000000000044', 'e0000000-0000-0000-0000-000000000044', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000045', 'I2B-STU-045', 'Pradhumnan', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000045', 'd0000000-0000-0000-0000-000000000045', 'b0000000-0000-0000-0000-000000000002', '3rd', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000045', 'Sheet1', 'Hindi', 18, 'Pradhumnan', '3rd', 600.00, NULL, 'd0000000-0000-0000-0000-000000000045', 'e0000000-0000-0000-0000-000000000045', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000046', 'I2B-STU-046', 'Yuva sree', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000046', 'd0000000-0000-0000-0000-000000000046', 'b0000000-0000-0000-0000-000000000002', '4th', 800.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000046', 'Sheet1', 'Hindi', 19, 'Yuva sree', '4th', 800.00, NULL, 'd0000000-0000-0000-0000-000000000046', 'e0000000-0000-0000-0000-000000000046', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000047', 'I2B-STU-047', 'Thenmozhi', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000047', 'd0000000-0000-0000-0000-000000000047', 'b0000000-0000-0000-0000-000000000002', '4th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000047', 'Sheet1', 'Hindi', 20, 'Thenmozhi', '4th', 700.00, NULL, 'd0000000-0000-0000-0000-000000000047', 'e0000000-0000-0000-0000-000000000047', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000048', 'I2B-STU-048', 'Theshmitha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000048', 'd0000000-0000-0000-0000-000000000048', 'b0000000-0000-0000-0000-000000000002', '4th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000048', 'Sheet1', 'Hindi', 21, 'Theshmitha', '4th', 700.00, NULL, 'd0000000-0000-0000-0000-000000000048', 'e0000000-0000-0000-0000-000000000048', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000049', 'I2B-STU-049', 'Vijesh', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000049', 'd0000000-0000-0000-0000-000000000049', 'b0000000-0000-0000-0000-000000000002', '5th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000049', 'Sheet1', 'Hindi', 22, 'Vijesh', '5th', 700.00, NULL, 'd0000000-0000-0000-0000-000000000049', 'e0000000-0000-0000-0000-000000000049', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000050', 'I2B-STU-050', 'keerthiga', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000050', 'd0000000-0000-0000-0000-000000000050', 'b0000000-0000-0000-0000-000000000002', '5th', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000050', 'Sheet1', 'Hindi', 23, 'keerthiga', '5th', 700.00, NULL, 'd0000000-0000-0000-0000-000000000050', 'e0000000-0000-0000-0000-000000000050', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000051', 'I2B-STU-051', 'Harshitha', CURRENT_DATE, 'active', 'Imported from Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000051', 'd0000000-0000-0000-0000-000000000051', 'b0000000-0000-0000-0000-000000000002', '8th', 900.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000051', 'Sheet1', 'Hindi', 24, 'Harshitha', '8th', 900.00, 'Cross-programme note: Appears in Hindi (8th ₹900) and Weekend Hindi (basic ₹500).', 'd0000000-0000-0000-0000-000000000051', 'e0000000-0000-0000-0000-000000000051', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000052', 'I2B-STU-052', 'Yoga Mithran', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000052', 'd0000000-0000-0000-0000-000000000052', 'b0000000-0000-0000-0000-000000000003', 'basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000052', 'Sheet1', 'Weekend Hindi', 1, 'Yoga Mithran', 'basic', 500.00, NULL, 'd0000000-0000-0000-0000-000000000052', 'e0000000-0000-0000-0000-000000000052', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000053', 'I2B-STU-053', 'Harshitha', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000053', 'd0000000-0000-0000-0000-000000000053', 'b0000000-0000-0000-0000-000000000003', 'basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000053', 'Sheet1', 'Weekend Hindi', 2, 'Harshitha', 'basic', 500.00, 'Cross-programme note: Appears in Hindi (8th ₹900) and Weekend Hindi (basic ₹500).', 'd0000000-0000-0000-0000-000000000053', 'e0000000-0000-0000-0000-000000000053', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000054', 'I2B-STU-054', 'Pranav Sai', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000054', 'd0000000-0000-0000-0000-000000000054', 'b0000000-0000-0000-0000-000000000003', 'basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000054', 'Sheet1', 'Weekend Hindi', 3, 'Pranav Sai', 'basic', 500.00, NULL, 'd0000000-0000-0000-0000-000000000054', 'e0000000-0000-0000-0000-000000000054', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000055', 'I2B-STU-055', 'Sri Harish', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000055', 'd0000000-0000-0000-0000-000000000055', 'b0000000-0000-0000-0000-000000000003', 'basic', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000055', 'Sheet1', 'Weekend Hindi', 4, 'Sri Harish', 'basic', 500.00, NULL, 'd0000000-0000-0000-0000-000000000055', 'e0000000-0000-0000-0000-000000000055', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000056', 'I2B-STU-056', 'Yadhhunandhan', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000056', 'd0000000-0000-0000-0000-000000000056', 'b0000000-0000-0000-0000-000000000003', 'school', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000056', 'Sheet1', 'Weekend Hindi', 5, 'Yadhhunandhan', 'school', 500.00, NULL, 'd0000000-0000-0000-0000-000000000056', 'e0000000-0000-0000-0000-000000000056', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000057', 'I2B-STU-057', 'Nikitha', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000057', 'd0000000-0000-0000-0000-000000000057', 'b0000000-0000-0000-0000-000000000003', 'school', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000057', 'Sheet1', 'Weekend Hindi', 6, 'Nikitha', 'school', 500.00, 'Multiple enrolment note: Nikitha appears in Subject (6th ₹700), Hindi (Basic ₹500 & 1st ₹500), and Weekend Hindi (school ₹500). Verify identity.', 'd0000000-0000-0000-0000-000000000057', 'e0000000-0000-0000-0000-000000000057', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000058', 'I2B-STU-058', 'aadharsh kumaran', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000058', 'd0000000-0000-0000-0000-000000000058', 'b0000000-0000-0000-0000-000000000003', 'school', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000058', 'Sheet1', 'Weekend Hindi', 7, 'aadharsh kumaran', 'school', 500.00, NULL, 'd0000000-0000-0000-0000-000000000058', 'e0000000-0000-0000-0000-000000000058', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000059', 'I2B-STU-059', 'Lekshana', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000059', 'd0000000-0000-0000-0000-000000000059', 'b0000000-0000-0000-0000-000000000003', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000059', 'Sheet1', 'Weekend Hindi', 8, 'Lekshana', '1st', 500.00, NULL, 'd0000000-0000-0000-0000-000000000059', 'e0000000-0000-0000-0000-000000000059', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000060', 'I2B-STU-060', 'Gopesh Nandhan', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000060', 'd0000000-0000-0000-0000-000000000060', 'b0000000-0000-0000-0000-000000000003', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000060', 'Sheet1', 'Weekend Hindi', 9, 'Gopesh Nandhan', '1st', 500.00, NULL, 'd0000000-0000-0000-0000-000000000060', 'e0000000-0000-0000-0000-000000000060', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000061', 'I2B-STU-061', 'Monish', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000061', 'd0000000-0000-0000-0000-000000000061', 'b0000000-0000-0000-0000-000000000003', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000061', 'Sheet1', 'Weekend Hindi', 10, 'Monish', '1st', 500.00, 'Duplicate name warning: Monish appears 4 times across Subject (7th ₹900 & ₹700), Hindi (1st ₹500), and Weekend Hindi (1st ₹500). Administrator must verify if separate students.', 'd0000000-0000-0000-0000-000000000061', 'e0000000-0000-0000-0000-000000000061', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000062', 'I2B-STU-062', 'Roshit', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000062', 'd0000000-0000-0000-0000-000000000062', 'b0000000-0000-0000-0000-000000000003', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000062', 'Sheet1', 'Weekend Hindi', 11, 'Roshit', '1st', 500.00, NULL, 'd0000000-0000-0000-0000-000000000062', 'e0000000-0000-0000-0000-000000000062', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000063', 'I2B-STU-063', 'Tharika', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000063', 'd0000000-0000-0000-0000-000000000063', 'b0000000-0000-0000-0000-000000000003', '1st', 500.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000063', 'Sheet1', 'Weekend Hindi', 12, 'Tharika', '1st', 500.00, NULL, 'd0000000-0000-0000-0000-000000000063', 'e0000000-0000-0000-0000-000000000063', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000064', 'I2B-STU-064', 'Vedish', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000064', 'd0000000-0000-0000-0000-000000000064', 'b0000000-0000-0000-0000-000000000003', '2nd', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000064', 'Sheet1', 'Weekend Hindi', 13, 'Vedish', '2nd', 600.00, NULL, 'd0000000-0000-0000-0000-000000000064', 'e0000000-0000-0000-0000-000000000064', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000065', 'I2B-STU-065', 'Harishankar', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000065', 'd0000000-0000-0000-0000-000000000065', 'b0000000-0000-0000-0000-000000000003', '2nd', 600.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000065', 'Sheet1', 'Weekend Hindi', 14, 'Harishankar', '2nd', 600.00, 'Cross-programme note: Appears in Subject (6th ₹650) and Weekend Hindi (2nd ₹600).', 'd0000000-0000-0000-0000-000000000065', 'e0000000-0000-0000-0000-000000000065', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000066', 'I2B-STU-066', 'Sehsanth', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000066', 'd0000000-0000-0000-0000-000000000066', 'b0000000-0000-0000-0000-000000000003', '3rd', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000066', 'Sheet1', 'Weekend Hindi', 15, 'Sehsanth', '3rd', 700.00, NULL, 'd0000000-0000-0000-0000-000000000066', 'e0000000-0000-0000-0000-000000000066', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000067', 'I2B-STU-067', 'Kanishka', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000067', 'd0000000-0000-0000-0000-000000000067', 'b0000000-0000-0000-0000-000000000003', '3rd', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000067', 'Sheet1', 'Weekend Hindi', 16, 'Kanishka', '3rd', 700.00, NULL, 'd0000000-0000-0000-0000-000000000067', 'e0000000-0000-0000-0000-000000000067', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000068', 'I2B-STU-068', 'Nimal Kirthik', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000068', 'd0000000-0000-0000-0000-000000000068', 'b0000000-0000-0000-0000-000000000003', '3rd', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000068', 'Sheet1', 'Weekend Hindi', 17, 'Nimal Kirthik', '3rd', 700.00, NULL, 'd0000000-0000-0000-0000-000000000068', 'e0000000-0000-0000-0000-000000000068', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000069', 'I2B-STU-069', 'Mithra', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000069', 'd0000000-0000-0000-0000-000000000069', 'b0000000-0000-0000-0000-000000000003', '4th', 800.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000069', 'Sheet1', 'Weekend Hindi', 18, 'Mithra', '4th', 800.00, NULL, 'd0000000-0000-0000-0000-000000000069', 'e0000000-0000-0000-0000-000000000069', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000070', 'I2B-STU-070', 'Hasini', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000070', 'd0000000-0000-0000-0000-000000000070', 'b0000000-0000-0000-0000-000000000003', '4th', 800.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000070', 'Sheet1', 'Weekend Hindi', 19, 'Hasini', '4th', 800.00, NULL, 'd0000000-0000-0000-0000-000000000070', 'e0000000-0000-0000-0000-000000000070', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000071', 'I2B-STU-071', 'Shivani', CURRENT_DATE, 'active', 'Imported from Weekend Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000071', 'd0000000-0000-0000-0000-000000000071', 'b0000000-0000-0000-0000-000000000003', '6th', 1100.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000071', 'Sheet1', 'Weekend Hindi', 20, 'Shivani', '6th', 1100.00, NULL, 'd0000000-0000-0000-0000-000000000071', 'e0000000-0000-0000-0000-000000000071', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000072', 'I2B-STU-072', 'Dakshika', CURRENT_DATE, 'active', 'Imported from Online Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000072', 'd0000000-0000-0000-0000-000000000072', 'b0000000-0000-0000-0000-000000000004', '1st', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000072', 'Sheet1', 'Online Hindi', 1, 'Dakshika', '1st', 700.00, NULL, 'd0000000-0000-0000-0000-000000000072', 'e0000000-0000-0000-0000-000000000072', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000073', 'I2B-STU-073', 'Jeevitha', CURRENT_DATE, 'active', 'Imported from Online Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000073', 'd0000000-0000-0000-0000-000000000073', 'b0000000-0000-0000-0000-000000000004', '1st', 700.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000073', 'Sheet1', 'Online Hindi', 2, 'Jeevitha', '1st', 700.00, NULL, 'd0000000-0000-0000-0000-000000000073', 'e0000000-0000-0000-0000-000000000073', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000074', 'I2B-STU-074', 'Ananthi', CURRENT_DATE, 'active', 'Imported from Online Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000074', 'd0000000-0000-0000-0000-000000000074', 'b0000000-0000-0000-0000-000000000004', '2nd', 750.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000074', 'Sheet1', 'Online Hindi', 3, 'Ananthi', '2nd', 750.00, NULL, 'd0000000-0000-0000-0000-000000000074', 'e0000000-0000-0000-0000-000000000074', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, student_id, name, admission_date, status, notes)
VALUES ('d0000000-0000-0000-0000-000000000075', 'I2B-STU-075', 'Nishitha', CURRENT_DATE, 'active', 'Imported from Online Hindi Excel migration')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO public.enrollments (id, student_id, programme_id, class_or_grade, agreed_fee, start_date, status, is_verified, notes)
VALUES ('e0000000-0000-0000-0000-000000000075', 'd0000000-0000-0000-0000-000000000075', 'b0000000-0000-0000-0000-000000000004', '10th', 1000.00, CURRENT_DATE, 'active', false, 'Proposed fee imported from Excel migration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.migration_records (id, source_sheet, source_programme, source_sno, original_name, original_class_or_grade, original_fee, potential_duplicate_note, matched_student_id, matched_enrollment_id, verification_status)
VALUES ('c0000000-0000-0000-0000-000000000075', 'Sheet1', 'Online Hindi', 4, 'Nishitha', '10th', 1000.00, 'Multiple enrolment note: Nishitha appears in Subject (5th ₹600), Hindi (1st ₹500 twice), and Online Hindi (10th ₹1000). Verify identity.', 'd0000000-0000-0000-0000-000000000075', 'e0000000-0000-0000-0000-000000000075', 'pending')
ON CONFLICT (id) DO NOTHING;