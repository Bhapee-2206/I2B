-- Ensure all student child tables have ON DELETE CASCADE so foreign key checks never block student deletion

DO $$
BEGIN
  -- 1. payments -> students
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
  ALTER TABLE public.payments ADD CONSTRAINT payments_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

  -- 2. receipts -> payments
  ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_payment_id_fkey;
  ALTER TABLE public.receipts ADD CONSTRAINT receipts_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

  -- 3. invoices -> students
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_student_id_fkey;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

  -- 4. invoice_items -> invoices
  ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
  ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

  -- 5. payment_allocations -> payments & invoices
  ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_payment_id_fkey;
  ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

  ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_invoice_id_fkey;
  ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

  -- 6. enrollments -> students
  ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;
  ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

  -- 7. class_history -> students
  ALTER TABLE public.class_history DROP CONSTRAINT IF EXISTS class_history_student_id_fkey;
  ALTER TABLE public.class_history ADD CONSTRAINT class_history_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

