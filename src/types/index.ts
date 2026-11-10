// ==============================================================================
// I2B - Types & Data Models
// ==============================================================================

export type StudentStatus = 'active' | 'inactive' | 'archived';
export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
export type PaymentStatus = 'completed' | 'reversed' | 'adjusted';
export type WhatsAppStatus = 'not_shared' | 'initiated' | 'confirmed_sent';
export type MigrationStatus = 'pending' | 'verified' | 'flagged' | 'merged' | 'skipped';

export interface Student {
  id: string;
  student_id: string;
  name: string;
  parent_name?: string | null;
  whatsapp_number?: string | null;
  alt_phone?: string | null;
  address?: string | null;
  admission_date: string;
  status: StudentStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Programme {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  fee_mode: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FeeStructure {
  id: string;
  programme_id: string;
  class_or_grade: string;
  board?: string | null; // 'Matric', 'CBSE', 'Virtual', 'Online'
  monthly_fee: number;
  effective_from?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  programme_id: string;
  class_or_grade: string;
  board?: string | null;
  agreed_fee: number;
  start_date: string;
  end_date?: string | null;
  status: EnrollmentStatus;
  is_verified: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  student?: Student;
  programme?: Programme;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  enrollment_id?: string | null;
  programme_id?: string | null;
  description: string;
  class_or_grade?: string | null;
  amount: number;
  created_at?: string;
  programme?: Programme;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  billing_month: number;
  billing_year: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: InvoiceStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  student?: Student;
  items?: InvoiceItem[];
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
  created_at?: string;
  invoice?: Invoice;
}

export interface Payment {
  id: string;
  payment_number: string;
  student_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_reference?: string | null;
  notes?: string | null;
  status: PaymentStatus;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  student?: Student;
  allocations?: PaymentAllocation[];
  receipt?: Receipt;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  student_id: string;
  issue_date: string;
  amount_paid: number;
  remaining_balance: number;
  whatsapp_status: WhatsAppStatus;
  whatsapp_sent_at?: string | null;
  pdf_storage_url?: string | null;
  is_immutable: boolean;
  created_at?: string;
  // Joined fields
  student?: Student;
  payment?: Payment;
}

export interface MigrationRecord {
  id: string;
  source_sheet: string;
  source_programme: string;
  source_sno?: number | null;
  original_name: string;
  original_class_or_grade: string;
  original_fee: number;
  potential_duplicate_note?: string | null;
  matched_student_id?: string | null;
  matched_enrollment_id?: string | null;
  verification_status: MigrationStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MessageLog {
  id: string;
  student_id?: string | null;
  recipient_phone: string;
  message_type: 'receipt' | 'overdue_reminder' | 'announcement' | 'general';
  delivery_mode: 'manual_whatsapp' | 'meta_cloud_api';
  status: 'draft' | 'opened_client' | 'sent' | 'failed' | 'delivered';
  payload?: any;
  error_message?: string | null;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: any;
  actor_email?: string | null;
  created_at?: string;
}

export interface AcademicYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
}

export interface ClassPromotionRecord {
  id: string;
  student_id: string;
  enrollment_id: string;
  programme_id?: string;
  academic_year: string;
  old_class: string;
  new_class: string;
  old_board?: string | null;
  new_board?: string | null;
  old_fee: number;
  new_fee: number;
  effective_date: string;
  promotion_type: 'promoted' | 'repeated' | 'custom' | 'board_change' | 'held';
  notes?: string | null;
  performed_by?: string | null;
  created_at?: string;
  // Joined
  student?: Student;
  programme?: Programme;
}

export interface InstitutionSettings {
  id: string;
  institution_name: string;
  subtitle: string;
  tagline: string;
  logo_url: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  whatsapp_number: string;
  currency_symbol: string;
  currency_code: string;
  receipt_prefix: string;
  invoice_prefix: string;
  payment_prefix: string;
  student_prefix: string;
  default_due_day: number;
  receipt_footer: string;
  whatsapp_mode: 'manual' | 'cloud_api';
  whatsapp_cloud_config?: {
    phone_number_id?: string;
    waba_id?: string;
    access_token?: string;
    template_name?: string;
  };
  created_at?: string;
  updated_at?: string;
}

