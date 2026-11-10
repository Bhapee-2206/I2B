-- =============================================================================
-- EDUTRACK – Comprehensive Database Schema Repair, Tables, RPCs & RLS Policies
-- PostgreSQL / Supabase
-- =============================================================================

-- 1. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'Administrator',
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'staff')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACADEMIC YEARS TABLE
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_name TEXT UNIQUE NOT NULL, -- e.g. '2026-2027'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default academic years if not present
INSERT INTO public.academic_years (year_name, start_date, end_date, is_active)
VALUES 
    ('2025-2026', '2025-06-01', '2026-05-31', FALSE),
    ('2026-2027', '2026-06-01', '2027-05-31', TRUE),
    ('2027-2028', '2027-06-01', '2028-05-31', FALSE)
ON CONFLICT (year_name) DO UPDATE SET is_active = EXCLUDED.is_active;

-- 3. MASTER CLASSES / GRADES TABLE
CREATE TABLE IF NOT EXISTS public.master_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'school' CHECK (category IN ('school', 'hindi', 'other')),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.master_classes (class_name, category, sort_order)
VALUES 
    ('LKG', 'school', 1),
    ('UKG', 'school', 2),
    ('1st', 'school', 3),
    ('2nd', 'school', 4),
    ('3rd', 'school', 5),
    ('4th', 'school', 6),
    ('5th', 'school', 7),
    ('6th', 'school', 8),
    ('7th', 'school', 9),
    ('8th', 'school', 10),
    ('9th', 'school', 11),
    ('10th', 'school', 12),
    ('11th', 'school', 13),
    ('12th', 'school', 14),
    ('Basic', 'hindi', 15),
    ('school', 'hindi', 16)
ON CONFLICT (class_name) DO NOTHING;

-- 4. MASTER BOARDS TABLE
CREATE TABLE IF NOT EXISTS public.master_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.master_boards (board_name, sort_order)
VALUES 
    ('Matric', 1),
    ('CBSE', 2),
    ('Virtual', 3),
    ('Online', 4)
ON CONFLICT (board_name) DO NOTHING;

-- 5. CLASS PROMOTION HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.class_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    old_class TEXT NOT NULL,
    new_class TEXT NOT NULL,
    old_board TEXT,
    new_board TEXT,
    old_fee NUMERIC(10,2) NOT NULL,
    new_fee NUMERIC(10,2) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    promoted_by TEXT DEFAULT 'Administrator',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SEQUENTIAL RECEIPT & INVOICE NUMBER GENERATORS
CREATE SEQUENCE IF NOT EXISTS public.receipt_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.payment_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START WITH 1001;

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

-- 7. ATOMIC PAYMENT RECORDING RPC TRANSACTION
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
    p_student_id UUID,
    p_payment_date DATE,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_transaction_reference TEXT,
    p_notes TEXT,
    p_invoice_allocations JSONB -- Array of { invoice_id: uuid, amount: numeric }
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
    v_total_allocated NUMERIC := 0;
    v_student_remaining_total NUMERIC := 0;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero.';
    END IF;

    -- Generate payment number
    v_payment_number := 'PAY-' || TO_CHAR(p_payment_date, 'YYYYMM') || '-' || LPAD(nextval('public.payment_seq')::TEXT, 4, '0');

    -- Insert payment record
    INSERT INTO public.payments (
        payment_number, student_id, payment_date, amount,
        payment_method, transaction_reference, notes, status, created_at, updated_at
    ) VALUES (
        v_payment_number, p_student_id, p_payment_date, p_amount,
        p_payment_method, p_transaction_reference, p_notes, 'completed', NOW(), NOW()
    ) RETURNING id INTO v_payment_id;

    -- Process allocations
    FOR v_alloc IN SELECT * FROM jsonb_to_recordset(p_invoice_allocations) AS x(invoice_id UUID, amount NUMERIC)
    LOOP
        IF v_alloc.amount > 0 THEN
            -- Check invoice existence and current balance
            SELECT total_amount, paid_amount, balance_amount
            INTO v_inv_total, v_inv_paid, v_inv_balance
            FROM public.invoices
            WHERE id = v_alloc.invoice_id AND student_id = p_student_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Invoice % not found for student.', v_alloc.invoice_id;
            END IF;

            IF v_alloc.amount > v_inv_balance THEN
                RAISE EXCEPTION 'Allocation of % exceeds outstanding invoice balance of %.', v_alloc.amount, v_inv_balance;
            END IF;

            -- Calculate new balances
            v_new_paid := v_inv_paid + v_alloc.amount;
            v_new_balance := GREATEST(0, v_inv_total - v_new_paid);
            IF v_new_balance = 0 THEN
                v_new_status := 'paid';
            ELSE
                v_new_status := 'partially_paid';
            END IF;

            -- Update invoice
            UPDATE public.invoices
            SET paid_amount = v_new_paid,
                balance_amount = v_new_balance,
                status = v_new_status,
                updated_at = NOW()
            WHERE id = v_alloc.invoice_id;

            -- Insert allocation
            INSERT INTO public.payment_allocations (payment_id, invoice_id, allocated_amount, created_at)
            VALUES (v_payment_id, v_alloc.invoice_id, v_alloc.amount, NOW());

            v_total_allocated := v_total_allocated + v_alloc.amount;
        END IF;
    END LOOP;

    -- Calculate total remaining student balance across all invoices
    SELECT COALESCE(SUM(balance_amount), 0)
    INTO v_student_remaining_total
    FROM public.invoices
    WHERE student_id = p_student_id AND status != 'cancelled';

    -- Generate receipt
    v_receipt_number := public.get_next_receipt_number();
    INSERT INTO public.receipts (
        receipt_number, payment_id, student_id, issue_date,
        amount_paid, remaining_balance, whatsapp_status, is_immutable, created_at
    ) VALUES (
        v_receipt_number, v_payment_id, p_student_id, p_payment_date,
        p_amount, v_student_remaining_total, 'initiated', TRUE, NOW()
    ) RETURNING id INTO v_receipt_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment_id,
        'payment_number', v_payment_number,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'amount_paid', p_amount,
        'remaining_balance', v_student_remaining_total
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 8. ATOMIC STUDENT REGISTRATION RPC
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
    p_programmes JSONB -- Array of { programme_id: uuid, class_or_grade: text, board: text, agreed_fee: numeric, notes: text }
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
    v_due_date DATE;
    v_due_day INTEGER := 10;
BEGIN
    IF TRIM(p_name) = '' THEN
        RAISE EXCEPTION 'Student name is required.';
    END IF;
    IF TRIM(p_whatsapp_number) = '' THEN
        RAISE EXCEPTION 'WhatsApp number is required.';
    END IF;

    -- Insert student
    INSERT INTO public.students (
        student_id, name, parent_name, whatsapp_number, alt_phone,
        address, notes, admission_date, status, created_at, updated_at
    ) VALUES (
        p_student_code, TRIM(p_name), TRIM(p_parent_name), TRIM(p_whatsapp_number), TRIM(p_alt_phone),
        TRIM(p_address), TRIM(p_notes), p_admission_date, p_status, NOW(), NOW()
    ) RETURNING id INTO v_student_id;

    -- Insert programme enrolments
    FOR v_prog IN SELECT * FROM jsonb_to_recordset(p_programmes) AS x(
        programme_id UUID, class_or_grade TEXT, board TEXT, agreed_fee NUMERIC, notes TEXT
    )
    LOOP
        INSERT INTO public.enrollments (
            student_id, programme_id, class_or_grade, board, agreed_fee,
            start_date, status, is_verified, notes, created_at, updated_at
        ) VALUES (
            v_student_id, v_prog.programme_id, v_prog.class_or_grade, v_prog.board, v_prog.agreed_fee,
            p_admission_date, 'active', TRUE, v_prog.notes, NOW(), NOW()
        );
        v_total_monthly_fee := v_total_monthly_fee + COALESCE(v_prog.agreed_fee, 0);
    END LOOP;

    -- Create initial monthly invoice with status UNPAID (No payment, no receipt)
    v_billing_month := EXTRACT(MONTH FROM p_admission_date)::INTEGER;
    v_billing_year := EXTRACT(YEAR FROM p_admission_date)::INTEGER;
    
    SELECT COALESCE(default_due_day, 10) INTO v_due_day FROM public.institution_settings LIMIT 1;
    v_due_date := MAKE_DATE(v_billing_year, v_billing_month, LEAST(v_due_day, 28));

    v_invoice_number := 'INV-' || v_billing_year::TEXT || LPAD(v_billing_month::TEXT, 2, '0') || '-' || RIGHT(p_student_code, 4);

    INSERT INTO public.invoices (
        invoice_number, student_id, billing_month, billing_year,
        invoice_date, due_date, total_amount, paid_amount, balance_amount,
        status, notes, created_at, updated_at
    ) VALUES (
        v_invoice_number, v_student_id, v_billing_month, v_billing_year,
        p_admission_date, v_due_date, v_total_monthly_fee, 0.00, v_total_monthly_fee,
        'unpaid', 'Initial tuition invoice on registration', NOW(), NOW()
    ) RETURNING id INTO v_invoice_id;

    -- Insert invoice line items
    FOR v_prog IN SELECT * FROM jsonb_to_recordset(p_programmes) AS x(
        programme_id UUID, class_or_grade TEXT, board TEXT, agreed_fee NUMERIC, notes TEXT
    )
    LOOP
        INSERT INTO public.invoice_items (
            invoice_id, programme_id, class_or_grade, description, amount, created_at
        ) VALUES (
            v_invoice_id, v_prog.programme_id, v_prog.class_or_grade,
            'Tuition fee (' || v_prog.class_or_grade || ')', v_prog.agreed_fee, NOW()
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'student_id', v_student_id,
        'student_code', p_student_code,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'monthly_fee', v_total_monthly_fee,
        'payment_status', 'unpaid'
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies allowing authenticated administrator full access
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS admin_all_policy ON public.%I', tbl);
        EXECUTE format('CREATE POLICY admin_all_policy ON public.%I FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)', tbl);
    END LOOP;
END;
$$;
