-- Expand enrollments_status_check to accept both 'discontinued' and 'cancelled'
DO $$
BEGIN
  ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
  ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_status_check 
    CHECK (status IN ('active', 'inactive', 'discontinued', 'completed', 'cancelled'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
