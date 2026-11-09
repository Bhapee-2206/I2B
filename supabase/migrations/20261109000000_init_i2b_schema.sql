-- ==============================================================================
-- I2B - Student & Monthly Fee Management System
-- Schema Initialization Migration
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. INSTITUTION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.institution_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name TEXT NOT NULL DEFAULT 'I2B Educational Institution',
    subtitle TEXT DEFAULT 'Student & Monthly Fee Management',
    tagline TEXT DEFAULT 'Excellence in Tuition & Language Studies',
    logo_url TEXT DEFAULT '/logo.jpg',
    address TEXT DEFAULT '123 Education Lane, Chennai, Tamil Nadu',
    contact_phone TEXT DEFAULT '+91 98765 43210',
    contact_email TEXT DEFAULT 'admin@i2b-edu.com',
    whatsapp_number TEXT DEFAULT '+91 98765 43210',
    currency_symbol TEXT DEFAULT '₹',
    currency_code TEXT DEFAULT 'INR',
    receipt_prefix TEXT DEFAULT 'REC',
    invoice_prefix TEXT DEFAULT 'INV',
    payment_prefix TEXT DEFAULT 'PAY',
    student_prefix TEXT DEFAULT 'STU',
    default_due_day INTEGER DEFAULT 10,
    receipt_footer TEXT DEFAULT 'Thank you for your prompt payment! This is an official computer-generated receipt.',
    whatsapp_mode TEXT DEFAULT 'manual' CHECK (whatsapp_mode IN ('manual', 'cloud_api')),
    whatsapp_cloud_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROGRAMMES TABLE
CREATE TABLE IF NOT EXISTS public.programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    fee_mode TEXT DEFAULT 'standard',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    parent_name TEXT,
    whatsapp_number TEXT,
    alt_phone TEXT,
    address TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. FEE STRUCTURES TABLE
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
    class_or_grade TEXT NOT NULL,
    board TEXT, -- 'Matric', 'CBSE', 'Virtual', 'Online', 'Standard'
    monthly_fee NUMERIC(10,2) NOT NULL CHECK (monthly_fee >= 0),
    effective_from DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    class_or_grade TEXT NOT NULL,
    board TEXT,
    agreed_fee NUMERIC(10,2) NOT NULL CHECK (agreed_fee >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    billing_month INTEGER NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
    billing_year INTEGER NOT NULL CHECK (billing_year >= 2020),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_student_billing_period UNIQUE (student_id, billing_month, billing_year)
);

-- 7. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    class_or_grade TEXT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')),
    transaction_reference TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'reversed', 'adjusted')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. PAYMENT ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(10,2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    payment_id UUID UNIQUE NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid NUMERIC(10,2) NOT NULL,
    remaining_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    whatsapp_status TEXT DEFAULT 'not_shared' CHECK (whatsapp_status IN ('not_shared', 'initiated', 'confirmed_sent')),
    whatsapp_sent_at TIMESTAMPTZ,
    pdf_storage_url TEXT,
    is_immutable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. MESSAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS public.message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('receipt', 'overdue_reminder', 'announcement', 'general')),
    delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('manual_whatsapp', 'meta_cloud_api')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'opened_client', 'sent', 'failed', 'delivered')),
    payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    actor_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. MIGRATION AUDIT / REVIEW TABLE (Excel Migration from Sheet1)
CREATE TABLE IF NOT EXISTS public.migration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_sheet TEXT NOT NULL DEFAULT 'Sheet1',
    source_programme TEXT NOT NULL, -- 'Subject', 'Hindi', 'Weekend Hindi', 'Online Hindi'
    source_sno INTEGER,
    original_name TEXT NOT NULL,
    original_class_or_grade TEXT NOT NULL,
    original_fee NUMERIC(10,2) NOT NULL,
    potential_duplicate_note TEXT,
    matched_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    matched_enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'flagged', 'merged', 'skipped')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_programme ON public.enrollments(programme_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.invoices(billing_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_migration_status ON public.migration_records(verification_status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Single Administrator Architecture
-- ==============================================================================
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_records ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated admin users, and read access for public/anon key during bootstrap if enabled
DO $$ 
BEGIN
    -- Public read policy for settings & programmes (for smooth initialization)
    DROP POLICY IF EXISTS "Allow anon read settings" ON public.institution_settings;
    CREATE POLICY "Allow anon read settings" ON public.institution_settings FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Allow auth full settings" ON public.institution_settings;
    CREATE POLICY "Allow auth full settings" ON public.institution_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all settings" ON public.institution_settings;
    CREATE POLICY "Allow anon all settings" ON public.institution_settings FOR ALL TO anon USING (true) WITH CHECK (true);

    -- Programmes
    DROP POLICY IF EXISTS "Allow anon all programmes" ON public.programmes;
    CREATE POLICY "Allow anon all programmes" ON public.programmes FOR ALL USING (true) WITH CHECK (true);

    -- Students
    DROP POLICY IF EXISTS "Allow anon all students" ON public.students;
    CREATE POLICY "Allow anon all students" ON public.students FOR ALL USING (true) WITH CHECK (true);

    -- Fee structures
    DROP POLICY IF EXISTS "Allow anon all fee_structures" ON public.fee_structures;
    CREATE POLICY "Allow anon all fee_structures" ON public.fee_structures FOR ALL USING (true) WITH CHECK (true);

    -- Enrollments
    DROP POLICY IF EXISTS "Allow anon all enrollments" ON public.enrollments;
    CREATE POLICY "Allow anon all enrollments" ON public.enrollments FOR ALL USING (true) WITH CHECK (true);

    -- Invoices
    DROP POLICY IF EXISTS "Allow anon all invoices" ON public.invoices;
    CREATE POLICY "Allow anon all invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

    -- Invoice items
    DROP POLICY IF EXISTS "Allow anon all invoice_items" ON public.invoice_items;
    CREATE POLICY "Allow anon all invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

    -- Payments
    DROP POLICY IF EXISTS "Allow anon all payments" ON public.payments;
    CREATE POLICY "Allow anon all payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

    -- Payment allocations
    DROP POLICY IF EXISTS "Allow anon all payment_allocations" ON public.payment_allocations;
    CREATE POLICY "Allow anon all payment_allocations" ON public.payment_allocations FOR ALL USING (true) WITH CHECK (true);

    -- Receipts
    DROP POLICY IF EXISTS "Allow anon all receipts" ON public.receipts;
    CREATE POLICY "Allow anon all receipts" ON public.receipts FOR ALL USING (true) WITH CHECK (true);

    -- Message logs
    DROP POLICY IF EXISTS "Allow anon all message_logs" ON public.message_logs;
    CREATE POLICY "Allow anon all message_logs" ON public.message_logs FOR ALL USING (true) WITH CHECK (true);

    -- Audit logs
    DROP POLICY IF EXISTS "Allow anon all audit_logs" ON public.audit_logs;
    CREATE POLICY "Allow anon all audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

    -- Migration records
    DROP POLICY IF EXISTS "Allow anon all migration_records" ON public.migration_records;
    CREATE POLICY "Allow anon all migration_records" ON public.migration_records FOR ALL USING (true) WITH CHECK (true);
END $$;

