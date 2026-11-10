-- ============================================================================
-- I2B EDUCATIONAL INSTITUTION (EDUTRACK)
-- COMPLETE SINGLE MASTER DATABASE SCHEMA & STORED PROCEDURES
-- ============================================================================
-- Everything required to initialize and run the EduTrack database in Supabase:
-- 1. PostgreSQL Extensions
-- 2. Core Sequences
-- 3. Core Tables with Cascading Constraints & Foreign Keys
-- 4. Attendance Management Tables & Timetable Rules
-- 5. Performance Indexes
-- 6. Row Level Security (RLS) & Permissive Web Client Policies
-- 7. Atomic Database Stored Procedures (RPCs)
-- 8. Default System Seed Data
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CORE SEQUENCES
CREATE SEQUENCE IF NOT EXISTS public.receipt_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.payment_seq START WITH 1 INCREMENT BY 1;

-- 3. CORE TABLES

-- A. INSTITUTION SETTINGS
CREATE TABLE IF NOT EXISTS public.institution_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name TEXT NOT NULL DEFAULT 'I2B Educational Institution',
    contact_phone TEXT DEFAULT '+91 6385577966',
    contact_phone_alt TEXT DEFAULT '+91 9345999260',
    contact_email TEXT DEFAULT 'i2btutioncentre@gmail.com',
    address TEXT DEFAULT '123 Education Lane, Knowledge Park, Tamil Nadu',
    invoice_prefix TEXT DEFAULT 'INV',
    receipt_prefix TEXT DEFAULT 'REC',
    student_id_prefix TEXT DEFAULT 'I2B-STU',
    default_due_day INTEGER DEFAULT 10 CHECK (default_due_day BETWEEN 1 AND 28),
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. PROGRAMMES
CREATE TABLE IF NOT EXISTS public.programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('academic', 'language', 'test_prep', 'other')),
    delivery_mode TEXT CHECK (delivery_mode IN ('offline', 'online', 'hybrid')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. CLASSES / STANDARDS / LEVELS
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    sequence_order INTEGER NOT NULL,
    category TEXT CHECK (category IN ('primary', 'middle', 'secondary', 'higher_secondary', 'language_level')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. FEE STRUCTURES
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    class_or_grade TEXT NOT NULL,
    board TEXT,
    monthly_fee NUMERIC(10,2) NOT NULL CHECK (monthly_fee >= 0),
    admission_fee NUMERIC(10,2) DEFAULT 0.00 CHECK (admission_fee >= 0),
    is_active BOOLEAN DEFAULT true,
    course_level TEXT,
    delivery_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. STUDENTS DIRECTORY
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    parent_name TEXT,
    whatsapp_number TEXT NOT NULL,
    alt_phone TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    admission_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. STUDENT PROGRAMME ENROLMENTS
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    class_or_grade TEXT NOT NULL,
    board TEXT,
    agreed_fee NUMERIC(10,2) NOT NULL CHECK (agreed_fee >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled', 'discontinued')),
    is_verified BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- H. STUDENT PROMOTIONS HISTORY
CREATE TABLE IF NOT EXISTS public.student_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_class TEXT NOT NULL,
    to_class TEXT NOT NULL,
    promotion_date DATE DEFAULT CURRENT_DATE,
    promoted_by TEXT DEFAULT 'Administrator',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- I. MONTHLY FEE INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    billing_month INTEGER NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
    billing_year INTEGER NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_monthly_invoice UNIQUE (student_id, billing_month, billing_year)
);

-- J. INVOICE LINE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    class_or_grade TEXT,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- K. PAYMENTS (FEE COLLECTIONS)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other')),
    transaction_reference TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'reversed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- L. INVOICE ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.invoice_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- M. PAYMENT RECEIPTS
CREATE TABLE IF NOT EXISTS public.payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_data JSONB NOT NULL,
    is_cancelled BOOLEAN DEFAULT false,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- N. ATTENDANCE PROGRAMME TIMETABLE RULES
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

-- O. DAILY ATTENDANCE SESSIONS (Registers)
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

-- P. DAILY ATTENDANCE RECORDS (Per Student Enrolment)
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

-- Q. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    record_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_programme ON public.enrollments(programme_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.invoices(billing_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.invoice_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_invoice ON public.invoice_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.payment_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student ON public.payment_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_prog ON public.attendance_sessions(programme_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_enrol ON public.attendance_records(enrollment_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'allow_all_' || tbl, tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', 'allow_all_' || tbl, tbl);
    END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 7. ATOMIC STORED PROCEDURES (RPCS)

-- Receipt Number Generator Function
CREATE OR REPLACE FUNCTION public.get_next_receipt_number()
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    cur_year TEXT;
    cur_month TEXT;
    prefix TEXT := 'REC';
BEGIN
    SELECT COALESCE(receipt_prefix, 'REC') INTO prefix FROM public.institution_settings LIMIT 1;
    cur_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    cur_month := TO_CHAR(CURRENT_DATE, 'MM');
    next_val := nextval('public.receipt_seq');
    RETURN prefix || '-' || cur_year || cur_month || '-' || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Payment Number Generator Function
CREATE OR REPLACE FUNCTION public.get_next_payment_number()
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    cur_year TEXT;
    cur_month TEXT;
BEGIN
    cur_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    cur_month := TO_CHAR(CURRENT_DATE, 'MM');
    next_val := nextval('public.payment_seq');
    RETURN 'PAY-' || cur_year || cur_month || '-' || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ATOMIC PAYMENT RECORDING TRANSACTION
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
    p_student_id UUID,
    p_payment_date DATE,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_transaction_reference TEXT,
    p_notes TEXT,
    p_invoice_allocations JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_payment_id UUID;
    v_payment_number TEXT;
    v_receipt_id UUID;
    v_receipt_number TEXT;
    v_alloc RECORD;
    v_inv_balance NUMERIC;
    v_inv_paid NUMERIC;
    v_inv_total NUMERIC;
    v_new_paid NUMERIC;
    v_new_balance NUMERIC;
    v_new_status TEXT;
    v_student RECORD;
    v_inst RECORD;
    v_receipt_data JSONB;
    v_allocated_total NUMERIC := 0;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found with ID %', p_student_id;
    END IF;

    SELECT * INTO v_inst FROM public.institution_settings LIMIT 1;
    v_payment_number := public.get_next_payment_number();

    INSERT INTO public.payments (
        payment_number, student_id, payment_date, amount,
        payment_method, transaction_reference, notes, status
    ) VALUES (
        v_payment_number, p_student_id, p_payment_date, p_amount,
        p_payment_method, p_transaction_reference, p_notes, 'completed'
    ) RETURNING id INTO v_payment_id;

    FOR v_alloc IN SELECT * FROM jsonb_to_recordset(p_invoice_allocations) AS x(invoice_id UUID, amount NUMERIC)
    LOOP
        IF v_alloc.amount > 0 THEN
            SELECT total_amount, paid_amount, balance_amount
            INTO v_inv_total, v_inv_paid, v_inv_balance
            FROM public.invoices WHERE id = v_alloc.invoice_id FOR UPDATE;

            IF FOUND THEN
                v_new_paid := v_inv_paid + v_alloc.amount;
                v_new_balance := GREATEST(0.00, v_inv_total - v_new_paid);

                IF v_new_balance = 0.00 THEN
                    v_new_status := 'paid';
                ELSE
                    v_new_status := 'partially_paid';
                END IF;

                UPDATE public.invoices
                SET paid_amount = v_new_paid,
                    balance_amount = v_new_balance,
                    status = v_new_status,
                    updated_at = NOW()
                WHERE id = v_alloc.invoice_id;

                INSERT INTO public.invoice_allocations (
                    payment_id, invoice_id, amount
                ) VALUES (
                    v_payment_id, v_alloc.invoice_id, v_alloc.amount
                );

                v_allocated_total := v_allocated_total + v_alloc.amount;
            END IF;
        END IF;
    END LOOP;

    v_receipt_number := public.get_next_receipt_number();
    v_receipt_data := jsonb_build_object(
        'receipt_number', v_receipt_number,
        'payment_number', v_payment_number,
        'issue_date', p_payment_date,
        'student', jsonb_build_object(
            'id', v_student.id,
            'student_id', v_student.student_id,
            'name', v_student.name,
            'parent_name', v_student.parent_name,
            'whatsapp_number', v_student.whatsapp_number
        ),
        'payment', jsonb_build_object(
            'amount', p_amount,
            'payment_method', p_payment_method,
            'transaction_reference', p_transaction_reference,
            'notes', p_notes
        ),
        'institution', jsonb_build_object(
            'name', COALESCE(v_inst.institution_name, 'I2B Educational Institution'),
            'contact_phone', COALESCE(v_inst.contact_phone, '+91 6385577966'),
            'contact_phone_alt', COALESCE(v_inst.contact_phone_alt, '+91 9345999260'),
            'contact_email', COALESCE(v_inst.contact_email, 'i2btutioncentre@gmail.com')
        ),
        'allocations', p_invoice_allocations
    );

    INSERT INTO public.payment_receipts (
        receipt_number, payment_id, student_id, issue_date, receipt_data
    ) VALUES (
        v_receipt_number, v_payment_id, p_student_id, p_payment_date, v_receipt_data
    ) RETURNING id INTO v_receipt_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'payment_number', v_payment_number,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'allocated_total', v_allocated_total
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ATOMIC NEW STUDENT REGISTRATION TRANSACTION
CREATE OR REPLACE FUNCTION public.register_student_transaction(
    p_student_code TEXT,
    p_name TEXT,
    p_parent_name TEXT,
    p_whatsapp_number TEXT,
    p_alt_phone TEXT,
    p_address TEXT,
    p_notes TEXT,
    p_admission_date DATE,
    p_status TEXT,
    p_programmes JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_student_id UUID;
    v_prog RECORD;
    v_total_monthly_fee NUMERIC := 0;
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_billing_month INTEGER;
    v_billing_year INTEGER;
    v_default_due_day INTEGER := 10;
    v_due_date DATE;
    v_enrolment_id UUID;
BEGIN
    SELECT COALESCE(default_due_day, 10) INTO v_default_due_day FROM public.institution_settings LIMIT 1;
    v_billing_month := EXTRACT(MONTH FROM p_admission_date)::INTEGER;
    v_billing_year := EXTRACT(YEAR FROM p_admission_date)::INTEGER;
    v_due_date := (v_billing_year || '-' || LPAD(v_billing_month::TEXT, 2, '0') || '-' || LPAD(LEAST(v_default_due_day, 28)::TEXT, 2, '0'))::DATE;

    INSERT INTO public.students (
        student_id, name, parent_name, whatsapp_number,
        alt_phone, address, notes, status, admission_date
    ) VALUES (
        p_student_code, p_name, p_parent_name, p_whatsapp_number,
        p_alt_phone, p_address, p_notes, COALESCE(p_status, 'active'), p_admission_date
    ) RETURNING id INTO v_student_id;

    FOR v_prog IN SELECT * FROM jsonb_to_recordset(p_programmes) AS x(
        programme_id UUID, class_or_grade TEXT, board TEXT, agreed_fee NUMERIC, notes TEXT
    )
    LOOP
        INSERT INTO public.enrollments (
            student_id, programme_id, class_or_grade, board,
            agreed_fee, start_date, status, is_verified, notes
        ) VALUES (
            v_student_id, v_prog.programme_id, v_prog.class_or_grade, v_prog.board,
            v_prog.agreed_fee, p_admission_date, 'active', true, v_prog.notes
        );
        v_total_monthly_fee := v_total_monthly_fee + v_prog.agreed_fee;
    END LOOP;

    IF v_total_monthly_fee > 0 THEN
        v_invoice_number := 'INV-' || v_billing_year || LPAD(v_billing_month::TEXT, 2, '0') || '-' || RIGHT(p_student_code, 4);

        INSERT INTO public.invoices (
            invoice_number, student_id, billing_month, billing_year,
            invoice_date, due_date, total_amount, paid_amount, balance_amount, status, notes
        ) VALUES (
            v_invoice_number, v_student_id, v_billing_month, v_billing_year,
            p_admission_date, v_due_date, v_total_monthly_fee, 0.00, v_total_monthly_fee,
            'unpaid', 'Initial monthly tuition invoice on registration'
        ) RETURNING id INTO v_invoice_id;

        FOR v_prog IN SELECT * FROM jsonb_to_recordset(p_programmes) AS x(
            programme_id UUID, class_or_grade TEXT, board TEXT, agreed_fee NUMERIC, notes TEXT
        )
        LOOP
            INSERT INTO public.invoice_items (
                invoice_id, programme_id, class_or_grade, description, amount
            ) VALUES (
                v_invoice_id, v_prog.programme_id, v_prog.class_or_grade,
                'Tuition fee (' || v_prog.class_or_grade || ')', v_prog.agreed_fee
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'student_id', v_student_id,
        'student_code', p_student_code,
        'monthly_fee', v_total_monthly_fee,
        'initial_invoice_id', v_invoice_id
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ATOMIC DAILY ATTENDANCE REGISTER RPC
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
    v_rule RECORD;
BEGIN
    IF p_attendance_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance cannot be recorded for future dates.';
    END IF;

    FOR v_rec IN SELECT * FROM jsonb_to_recordset(p_records) AS x(enrollment_id UUID, status TEXT, notes TEXT)
    LOOP
        v_total := v_total + 1;
        IF v_rec.status = 'present' THEN
            v_present := v_present + 1;
        ELSIF v_rec.status = 'absent' THEN
            v_absent := v_absent + 1;
        ELSIF v_rec.status = 'leave' THEN
            v_leave := v_leave + 1;
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

-- CANCEL ATTENDANCE SESSION RPC
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
$$ LANGUAGE plpgsql VOLATILE;

-- 8. DEFAULT SYSTEM SEED DATA

-- Institution Settings
INSERT INTO public.institution_settings (
    institution_name, contact_phone, contact_phone_alt, contact_email, address
) VALUES (
    'I2B Educational Institution',
    '+91 6385577966',
    '+91 9345999260',
    'i2btutioncentre@gmail.com',
    '123 Education Lane, Knowledge Park, Tamil Nadu'
) ON CONFLICT DO NOTHING;

-- Academic Years
INSERT INTO public.academic_years (name, start_date, end_date, is_current) VALUES
('2026-2027', '2026-06-01', '2027-05-31', true),
('2025-2026', '2025-06-01', '2026-05-31', false)
ON CONFLICT (name) DO NOTHING;

-- Programmes
INSERT INTO public.programmes (code, name, description, category, delivery_mode) VALUES
('SUBJECT', 'Subject', 'Regular academic school subjects (Mon-Sat)', 'academic', 'offline'),
('HINDI', 'Hindi', 'Hindi language coaching (Mon, Wed, Fri)', 'language', 'offline'),
('WEEKEND_HINDI', 'Weekend Hindi', 'Hindi classes on weekends (Sat, Sun)', 'language', 'offline'),
('ONLINE_HINDI', 'Online Hindi', 'Online Hindi remote sessions (No physical attendance)', 'language', 'online')
ON CONFLICT (code) DO NOTHING;

-- Programme Attendance Rules
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

-- Standard Classes
INSERT INTO public.classes (name, code, sequence_order, category) VALUES
('1st Standard', '1ST', 1, 'primary'),
('2nd Standard', '2ND', 2, 'primary'),
('3rd Standard', '3RD', 3, 'primary'),
('4th Standard', '4TH', 4, 'primary'),
('5th Standard', '5TH', 5, 'primary'),
('6th Standard', '6TH', 6, 'middle'),
('7th Standard', '7TH', 7, 'middle'),
('8th Standard', '8TH', 8, 'middle'),
('9th Standard', '9TH', 9, 'secondary'),
('10th Standard', '10TH', 10, 'secondary'),
('11th Standard', '11TH', 11, 'higher_secondary'),
('12th Standard', '12TH', 12, 'higher_secondary')
ON CONFLICT (code) DO NOTHING;

-- Standard Subject Fee Structures
INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, admission_fee)
SELECT p.id, '1st Standard', 'State', 500.00, 0.00 FROM public.programmes p WHERE p.code = 'SUBJECT'
ON CONFLICT DO NOTHING;

INSERT INTO public.fee_structures (programme_id, class_or_grade, board, monthly_fee, admission_fee)
SELECT p.id, '10th Standard', 'Matric', 1000.00, 0.00 FROM public.programmes p WHERE p.code = 'SUBJECT'
ON CONFLICT DO NOTHING;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- END OF SINGLE MASTER DATABASE SCRIPT
-- ============================================================================

