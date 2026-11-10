-- =============================================================================
-- EDUTRACK ATTENDANCE MANAGEMENT MODULE
-- PostgreSQL / Supabase Migration
-- =============================================================================

-- 1. PROGRAMME ATTENDANCE RULES TABLE
CREATE TABLE IF NOT EXISTS public.programme_attendance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID UNIQUE NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    attendance_enabled BOOLEAN DEFAULT TRUE,
    attendance_weekdays SMALLINT[] DEFAULT ARRAY[]::SMALLINT[], -- Sunday=0, Monday=1, ..., Saturday=6
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial programme attendance schedules based on actual programme codes
-- SUBJECT: Mon-Sat [1,2,3,4,5,6]
-- HINDI: Mon,Wed,Fri [1,3,5]
-- WEEKEND HINDI: Sat,Sun [0,6]
-- ONLINE HINDI: attendance_enabled = FALSE, attendance_weekdays = []
DO $$
DECLARE
    v_subject_id UUID;
    v_hindi_id UUID;
    v_weekend_hindi_id UUID;
    v_online_hindi_id UUID;
BEGIN
    SELECT id INTO v_subject_id FROM public.programmes WHERE code = 'SUBJECT' OR LOWER(name) = 'subject' LIMIT 1;
    SELECT id INTO v_hindi_id FROM public.programmes WHERE code = 'HINDI' OR LOWER(name) = 'hindi' LIMIT 1;
    SELECT id INTO v_weekend_hindi_id FROM public.programmes WHERE code = 'WEEKEND_HINDI' OR LOWER(name) = 'weekend hindi' LIMIT 1;
    SELECT id INTO v_online_hindi_id FROM public.programmes WHERE code = 'ONLINE_HINDI' OR LOWER(name) = 'online hindi' LIMIT 1;

    IF v_subject_id IS NOT NULL THEN
        INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays)
        VALUES (v_subject_id, TRUE, ARRAY[1, 2, 3, 4, 5, 6]::SMALLINT[])
        ON CONFLICT (programme_id) DO UPDATE SET 
            attendance_enabled = EXCLUDED.attendance_enabled,
            attendance_weekdays = EXCLUDED.attendance_weekdays,
            updated_at = NOW();
    END IF;

    IF v_hindi_id IS NOT NULL THEN
        INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays)
        VALUES (v_hindi_id, TRUE, ARRAY[1, 3, 5]::SMALLINT[])
        ON CONFLICT (programme_id) DO UPDATE SET 
            attendance_enabled = EXCLUDED.attendance_enabled,
            attendance_weekdays = EXCLUDED.attendance_weekdays,
            updated_at = NOW();
    END IF;

    IF v_weekend_hindi_id IS NOT NULL THEN
        INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays)
        VALUES (v_weekend_hindi_id, TRUE, ARRAY[0, 6]::SMALLINT[])
        ON CONFLICT (programme_id) DO UPDATE SET 
            attendance_enabled = EXCLUDED.attendance_enabled,
            attendance_weekdays = EXCLUDED.attendance_weekdays,
            updated_at = NOW();
    END IF;

    IF v_online_hindi_id IS NOT NULL THEN
        INSERT INTO public.programme_attendance_rules (programme_id, attendance_enabled, attendance_weekdays)
        VALUES (v_online_hindi_id, FALSE, ARRAY[]::SMALLINT[])
        ON CONFLICT (programme_id) DO UPDATE SET 
            attendance_enabled = EXCLUDED.attendance_enabled,
            attendance_weekdays = EXCLUDED.attendance_weekdays,
            updated_at = NOW();
    END IF;
END $$;

-- 2. ATTENDANCE SESSIONS TABLE (Date-only, one register per programme per date)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
    cancellation_reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_programme_attendance_date UNIQUE (programme_id, attendance_date)
);

-- 3. ATTENDANCE RECORDS TABLE (Marked per student enrolment)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
    remarks TEXT,
    marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_session_enrollment UNIQUE (session_id, enrollment_id)
);

-- 4. ATTENDANCE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_programme ON public.attendance_sessions(programme_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_enrollment ON public.attendance_records(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- 6. ROW LEVEL SECURITY
ALTER TABLE public.programme_attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS admin_all_rules ON public.programme_attendance_rules;
    CREATE POLICY admin_all_rules ON public.programme_attendance_rules FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS admin_all_sessions ON public.attendance_sessions;
    CREATE POLICY admin_all_sessions ON public.attendance_sessions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS admin_all_records ON public.attendance_records;
    CREATE POLICY admin_all_records ON public.attendance_records FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS admin_all_audit ON public.attendance_audit_logs;
    CREATE POLICY admin_all_audit ON public.attendance_audit_logs FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
END $$;

-- 7. TRANSACTIONAL ATOMIC BULK SAVE RPC FUNCTION
CREATE OR REPLACE FUNCTION public.save_attendance_register(
    p_programme_id UUID,
    p_attendance_date DATE,
    p_records JSONB, -- Array of { enrollment_id: UUID, status: TEXT, remarks: TEXT }
    p_marked_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
    v_rule_enabled BOOLEAN;
    v_weekdays SMALLINT[];
    v_day_of_week SMALLINT;
    v_rec RECORD;
    v_existing_record_id UUID;
    v_existing_status TEXT;
    v_records_count INTEGER := 0;
BEGIN
    -- 1. Reject future dates
    IF p_attendance_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance cannot be marked for future dates (%).', p_attendance_date;
    END IF;

    -- 2. Validate programme attendance rule
    SELECT attendance_enabled, attendance_weekdays
    INTO v_rule_enabled, v_weekdays
    FROM public.programme_attendance_rules
    WHERE programme_id = p_programme_id;

    IF NOT FOUND THEN
        -- Default to check if programme exists
        v_rule_enabled := TRUE;
    ELSIF NOT v_rule_enabled THEN
        RAISE EXCEPTION 'Attendance tracking is disabled for this programme.';
    END IF;

    -- 3. Validate weekday schedule
    -- In PostgreSQL: EXTRACT(DOW FROM date) returns 0=Sunday, 1=Monday ... 6=Saturday
    v_day_of_week := EXTRACT(DOW FROM p_attendance_date)::SMALLINT;
    IF v_weekdays IS NOT NULL AND array_length(v_weekdays, 1) > 0 THEN
        IF NOT (v_day_of_week = ANY(v_weekdays)) THEN
            RAISE EXCEPTION 'Selected date (%) is not a scheduled attendance day for this programme.', p_attendance_date;
        END IF;
    END IF;

    -- 4. Create or update attendance session
    INSERT INTO public.attendance_sessions (
        programme_id, attendance_date, status, updated_by, updated_at
    ) VALUES (
        p_programme_id, p_attendance_date, 'completed', p_marked_by, NOW()
    )
    ON CONFLICT (programme_id, attendance_date) DO UPDATE SET
        status = 'completed',
        cancellation_reason = NULL,
        updated_by = p_marked_by,
        updated_at = NOW()
    RETURNING id INTO v_session_id;

    -- 5. Iterate through and upsert student enrolment records
    FOR v_rec IN SELECT * FROM jsonb_to_recordset(p_records) AS x(enrollment_id UUID, status TEXT, remarks TEXT)
    LOOP
        IF v_rec.status NOT IN ('present', 'absent', 'leave') THEN
            RAISE EXCEPTION 'Invalid attendance status: %. Must be present, absent, or leave.', v_rec.status;
        END IF;

        -- Check existing record to audit status changes
        SELECT id, status INTO v_existing_record_id, v_existing_status
        FROM public.attendance_records
        WHERE session_id = v_session_id AND enrollment_id = v_rec.enrollment_id;

        IF v_existing_record_id IS NOT NULL THEN
            -- Update record
            UPDATE public.attendance_records
            SET status = v_rec.status,
                remarks = v_rec.remarks,
                marked_by = p_marked_by,
                updated_at = NOW()
            WHERE id = v_existing_record_id;

            -- Log audit if status changed
            IF v_existing_status != v_rec.status THEN
                INSERT INTO public.attendance_audit_logs (
                    attendance_record_id, old_status, new_status, reason, changed_by, changed_at
                ) VALUES (
                    v_existing_record_id, v_existing_status, v_rec.status, 'Attendance correction', p_marked_by, NOW()
                );
            END IF;
        ELSE
            -- Insert new record
            INSERT INTO public.attendance_records (
                session_id, enrollment_id, status, remarks, marked_by, created_at, updated_at
            ) VALUES (
                v_session_id, v_rec.enrollment_id, v_rec.status, v_rec.remarks, p_marked_by, NOW(), NOW()
            );
        END IF;

        v_records_count := v_records_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'session_id', v_session_id,
        'records_count', v_records_count,
        'attendance_date', p_attendance_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CLASS CANCELLATION / HOLIDAY RPC FUNCTION
CREATE OR REPLACE FUNCTION public.cancel_attendance_session(
    p_programme_id UUID,
    p_attendance_date DATE,
    p_reason TEXT,
    p_cancelled_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO public.attendance_sessions (
        programme_id, attendance_date, status, cancellation_reason, updated_by, updated_at
    ) VALUES (
        p_programme_id, p_attendance_date, 'cancelled', p_reason, p_cancelled_by, NOW()
    )
    ON CONFLICT (programme_id, attendance_date) DO UPDATE SET
        status = 'cancelled',
        cancellation_reason = p_reason,
        updated_by = p_cancelled_by,
        updated_at = NOW()
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'session_id', v_session_id,
        'status', 'cancelled',
        'reason', p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

