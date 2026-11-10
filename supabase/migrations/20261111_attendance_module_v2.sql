-- =============================================================================
-- EDUTRACK ATTENDANCE MANAGEMENT MODULE V2 (COMPREHENSIVE REPAIR & SECURITY)
-- PostgreSQL / Supabase Migration
-- =============================================================================

-- 1. Ensure Table Structures & Indexes
CREATE TABLE IF NOT EXISTS public.programme_attendance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID UNIQUE NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    attendance_enabled BOOLEAN DEFAULT TRUE,
    attendance_weekdays SMALLINT[] DEFAULT ARRAY[]::SMALLINT[], -- 0=Sunday, 1=Monday, ..., 6=Saturday
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed / update initial programme rules
DO $$
DECLARE
    v_subject_id UUID;
    v_hindi_id UUID;
    v_weekend_hindi_id UUID;
    v_online_hindi_id UUID;
BEGIN
    SELECT id INTO v_subject_id FROM public.programmes WHERE UPPER(code) = 'SUBJECT' OR LOWER(name) = 'subject' LIMIT 1;
    SELECT id INTO v_hindi_id FROM public.programmes WHERE UPPER(code) = 'HINDI' OR LOWER(name) = 'hindi' LIMIT 1;
    SELECT id INTO v_weekend_hindi_id FROM public.programmes WHERE UPPER(code) = 'WEEKEND_HINDI' OR LOWER(name) = 'weekend hindi' LIMIT 1;
    SELECT id INTO v_online_hindi_id FROM public.programmes WHERE UPPER(code) = 'ONLINE_HINDI' OR LOWER(name) = 'online hindi' LIMIT 1;

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

CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure performance indexes exist
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_programme ON public.attendance_sessions(programme_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_enrollment ON public.attendance_records(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- Enable RLS
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

-- 2. TRANSACTIONAL ATOMIC BULK SAVE RPC FUNCTION (V2 - Strict Server Validation)
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
    v_prog_code TEXT;
    v_prog_name TEXT;
    v_rec RECORD;
    v_existing_record_id UUID;
    v_existing_status TEXT;
    v_records_count INTEGER := 0;
    v_acting_user UUID;
    v_expected_enrolment_ids UUID[];
    v_submitted_enrolment_ids UUID[];
BEGIN
    -- Determine acting user (prefer auth.uid())
    v_acting_user := COALESCE(auth.uid(), p_marked_by);

    -- 1. Reject future dates (strict validation against local calendar)
    IF p_attendance_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance cannot be marked for future dates (%).', p_attendance_date;
    END IF;

    -- 2. Check programme existence and reject Online Hindi
    SELECT code, name INTO v_prog_code, v_prog_name
    FROM public.programmes
    WHERE id = p_programme_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected programme not found (ID: %).', p_programme_id;
    END IF;

    IF UPPER(v_prog_code) LIKE '%ONLINE%' OR UPPER(v_prog_name) LIKE '%ONLINE%' THEN
        RAISE EXCEPTION 'Online Hindi enrolments do not track offline daily attendance.';
    END IF;

    -- 3. Validate programme attendance rule (must exist in database)
    SELECT attendance_enabled, attendance_weekdays
    INTO v_rule_enabled, v_weekdays
    FROM public.programme_attendance_rules
    WHERE programme_id = p_programme_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attendance rule is not configured for programme "%". Please configure schedule.', v_prog_name;
    END IF;

    IF NOT v_rule_enabled THEN
        RAISE EXCEPTION 'Attendance tracking is disabled for programme "%".', v_prog_name;
    END IF;

    -- 4. Validate weekday schedule (0=Sunday, 1=Monday, ..., 6=Saturday)
    v_day_of_week := EXTRACT(DOW FROM p_attendance_date)::SMALLINT;
    IF v_weekdays IS NULL OR array_length(v_weekdays, 1) IS NULL OR NOT (v_day_of_week = ANY(v_weekdays)) THEN
        RAISE EXCEPTION 'Selected date (%) is not a scheduled class day for programme "%".', p_attendance_date, v_prog_name;
    END IF;

    -- 5. Calculate complete eligible roster in database
    SELECT ARRAY_AGG(e.id ORDER BY e.id)
    INTO v_expected_enrolment_ids
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE e.programme_id = p_programme_id
      AND e.status = 'active'
      AND s.status = 'active'
      AND (e.start_date IS NULL OR e.start_date <= p_attendance_date)
      AND (e.end_date IS NULL OR e.end_date >= p_attendance_date);

    IF v_expected_enrolment_ids IS NULL OR array_length(v_expected_enrolment_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No active eligible student enrolments found for % on %.', v_prog_name, p_attendance_date;
    END IF;

    -- 6. Validate submitted records against eligible roster
    IF p_records IS NULL OR jsonb_array_length(p_records) = 0 THEN
        RAISE EXCEPTION 'No attendance records provided in submission.';
    END IF;

    SELECT ARRAY_AGG(enrollment_id ORDER BY enrollment_id)
    INTO v_submitted_enrolment_ids
    FROM (
        SELECT DISTINCT (x->>'enrollment_id')::UUID AS enrollment_id
        FROM jsonb_array_elements(p_records) AS x
    ) sub;

    IF jsonb_array_length(p_records) != array_length(v_submitted_enrolment_ids, 1) THEN
        RAISE EXCEPTION 'Duplicate enrolment records detected in submitted register.';
    END IF;

    IF array_length(v_submitted_enrolment_ids, 1) != array_length(v_expected_enrolment_ids, 1) THEN
        RAISE EXCEPTION 'Roster mismatch: Expected % eligible students, but received % attendance records.', 
            array_length(v_expected_enrolment_ids, 1), array_length(v_submitted_enrolment_ids, 1);
    END IF;

    IF v_submitted_enrolment_ids != v_expected_enrolment_ids THEN
        RAISE EXCEPTION 'Submitted student enrolments do not match the active roster for % on %.', v_prog_name, p_attendance_date;
    END IF;

    -- 7. Upsert attendance session
    INSERT INTO public.attendance_sessions (
        programme_id, attendance_date, status, updated_by, updated_at
    ) VALUES (
        p_programme_id, p_attendance_date, 'completed', v_acting_user, NOW()
    )
    ON CONFLICT (programme_id, attendance_date) DO UPDATE SET
        status = 'completed',
        cancellation_reason = NULL,
        updated_by = v_acting_user,
        updated_at = NOW()
    RETURNING id INTO v_session_id;

    -- 8. Iterate through submitted records and record attendance & audit logs
    FOR v_rec IN SELECT * FROM jsonb_to_recordset(p_records) AS x(enrollment_id UUID, status TEXT, remarks TEXT)
    LOOP
        IF v_rec.status NOT IN ('present', 'absent', 'leave') THEN
            RAISE EXCEPTION 'Invalid attendance status "%". Allowed values: present, absent, leave.', v_rec.status;
        END IF;

        -- Check if an existing record exists to detect changes for audit
        SELECT id, status INTO v_existing_record_id, v_existing_status
        FROM public.attendance_records
        WHERE session_id = v_session_id AND enrollment_id = v_rec.enrollment_id;

        IF v_existing_record_id IS NOT NULL THEN
            UPDATE public.attendance_records
            SET status = v_rec.status,
                remarks = v_rec.remarks,
                marked_by = v_acting_user,
                updated_at = NOW()
            WHERE id = v_existing_record_id;

            IF v_existing_status != v_rec.status THEN
                INSERT INTO public.attendance_audit_logs (
                    attendance_record_id, session_id, old_status, new_status, reason, changed_by, changed_at
                ) VALUES (
                    v_existing_record_id, v_session_id, v_existing_status, v_rec.status, 'Status correction', v_acting_user, NOW()
                );
            END IF;
        ELSE
            INSERT INTO public.attendance_records (
                session_id, enrollment_id, status, remarks, marked_by, created_at, updated_at
            ) VALUES (
                v_session_id, v_rec.enrollment_id, v_rec.status, v_rec.remarks, v_acting_user, NOW(), NOW()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. CLASS CANCELLATION / HOLIDAY RPC FUNCTION (V2)
CREATE OR REPLACE FUNCTION public.cancel_attendance_session(
    p_programme_id UUID,
    p_attendance_date DATE,
    p_reason TEXT,
    p_cancelled_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
    v_acting_user UUID;
    v_prog_code TEXT;
    v_prog_name TEXT;
    v_rule_enabled BOOLEAN;
    v_weekdays SMALLINT[];
    v_day_of_week SMALLINT;
BEGIN
    v_acting_user := COALESCE(auth.uid(), p_cancelled_by);

    -- Reject future dates
    IF p_attendance_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot cancel classes for future dates (%).', p_attendance_date;
    END IF;

    -- Validate programme
    SELECT code, name INTO v_prog_code, v_prog_name
    FROM public.programmes
    WHERE id = p_programme_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Programme not found.';
    END IF;

    IF UPPER(v_prog_code) LIKE '%ONLINE%' OR UPPER(v_prog_name) LIKE '%ONLINE%' THEN
        RAISE EXCEPTION 'Online Hindi enrolments do not track offline daily attendance.';
    END IF;

    -- Validate schedule
    SELECT attendance_enabled, attendance_weekdays
    INTO v_rule_enabled, v_weekdays
    FROM public.programme_attendance_rules
    WHERE programme_id = p_programme_id;

    IF NOT FOUND OR NOT v_rule_enabled THEN
        RAISE EXCEPTION 'Attendance rule is not enabled for this programme.';
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_attendance_date)::SMALLINT;
    IF v_weekdays IS NULL OR NOT (v_day_of_week = ANY(v_weekdays)) THEN
        RAISE EXCEPTION 'Selected date (%) is not a scheduled class day for %.', p_attendance_date, v_prog_name;
    END IF;

    -- Cancel session
    INSERT INTO public.attendance_sessions (
        programme_id, attendance_date, status, cancellation_reason, updated_by, updated_at
    ) VALUES (
        p_programme_id, p_attendance_date, 'cancelled', p_reason, v_acting_user, NOW()
    )
    ON CONFLICT (programme_id, attendance_date) DO UPDATE SET
        status = 'cancelled',
        cancellation_reason = p_reason,
        updated_by = v_acting_user,
        updated_at = NOW()
    RETURNING id INTO v_session_id;

    -- Audit cancellation
    INSERT INTO public.attendance_audit_logs (
        session_id, old_status, new_status, reason, changed_by, changed_at
    ) VALUES (
        v_session_id, 'completed', 'cancelled', COALESCE(p_reason, 'Class Cancelled / Holiday'), v_acting_user, NOW()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'session_id', v_session_id,
        'status', 'cancelled',
        'reason', p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. REOPEN CANCELLED SESSION RPC FUNCTION
CREATE OR REPLACE FUNCTION public.reopen_attendance_session(
    p_programme_id UUID,
    p_attendance_date DATE,
    p_reopened_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
    v_acting_user UUID;
BEGIN
    v_acting_user := COALESCE(auth.uid(), p_reopened_by);

    SELECT id INTO v_session_id
    FROM public.attendance_sessions
    WHERE programme_id = p_programme_id AND attendance_date = p_attendance_date;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attendance session not found for reopening.';
    END IF;

    UPDATE public.attendance_sessions
    SET status = 'open',
        cancellation_reason = NULL,
        updated_by = v_acting_user,
        updated_at = NOW()
    WHERE id = v_session_id;

    INSERT INTO public.attendance_audit_logs (
        session_id, old_status, new_status, reason, changed_by, changed_at
    ) VALUES (
        v_session_id, 'cancelled', 'open', 'Register reopened by administrator', v_acting_user, NOW()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'session_id', v_session_id,
        'status', 'open'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
