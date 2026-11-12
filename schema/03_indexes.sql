-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- DDL Script 03: Performance Indexes (B-Tree, Composite, and Partial Indexes)
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FOREIGN KEY & JOIN PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- Staff & Doctors
CREATE INDEX idx_staff_department ON staff(department_id);
CREATE INDEX idx_doctors_department ON doctors(department_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_schedules_doctor_day ON doctor_schedules(doctor_id, day_of_week);

-- Patients & Appointments
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_department ON appointments(department_id);
CREATE INDEX idx_appointments_date_status ON appointments(appointment_date, status);

-- Consultations & Medical History
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);

-- Inpatient Admissions & Bed Assignments
CREATE INDEX idx_rooms_ward ON rooms(ward_id);
CREATE INDEX idx_beds_room ON beds(room_id);
CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_doctor ON admissions(admitting_doctor_id);
CREATE INDEX idx_admissions_status_date ON admissions(status, admission_date);
CREATE INDEX idx_bed_assign_admission ON bed_assignments(admission_id);
CREATE INDEX idx_bed_assign_bed ON bed_assignments(bed_id);

-- Laboratory
CREATE INDEX idx_lab_tests_category ON lab_tests(category_id);
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_doctor ON lab_orders(doctor_id);
CREATE INDEX idx_lab_orders_status_date ON lab_orders(status, order_date);
CREATE INDEX idx_lab_order_items_order ON lab_order_items(order_id);
CREATE INDEX idx_lab_order_items_test ON lab_order_items(test_id);
CREATE INDEX idx_lab_results_item ON lab_results(order_item_id);

-- Pharmacy & Inventory
CREATE INDEX idx_medicines_category ON medicines(category_id);
CREATE INDEX idx_medicines_generic ON medicines(generic_name);
CREATE INDEX idx_batches_medicine ON medicine_batches(medicine_id);
CREATE INDEX idx_batches_expiry ON medicine_batches(expiry_date);
CREATE INDEX idx_inv_txn_batch ON inventory_transactions(batch_id);
CREATE INDEX idx_inv_txn_medicine ON inventory_transactions(medicine_id);
CREATE INDEX idx_inv_txn_date ON inventory_transactions(transaction_date);

-- Prescriptions & Dispensing
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_rx_items_prescription ON prescription_items(prescription_id);
CREATE INDEX idx_rx_items_medicine ON prescription_items(medicine_id);
CREATE INDEX idx_dispensing_rx ON medicine_dispensing(prescription_id);
CREATE INDEX idx_dispensing_patient ON medicine_dispensing(patient_id);
CREATE INDEX idx_disp_items_dispensing ON medicine_dispensing_items(dispensing_id);

-- Invoices & Billing
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status_date ON invoices(status, issue_date);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_patient ON payments(patient_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Audit Trail
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(changed_at DESC);

-- ----------------------------------------------------------------------------
-- 2. PARTIAL INDEXES (High Value PostgreSQL Feature for Viva Demonstration)
-- ----------------------------------------------------------------------------

-- Index only available beds for instantaneous bed allocation queries
CREATE INDEX idx_beds_available 
    ON beds(bed_id, room_id) 
    WHERE status = 'Available' AND is_active = TRUE;

-- Index only currently occupied bed assignments
CREATE INDEX idx_bed_assign_active 
    ON bed_assignments(bed_id, admission_id) 
    WHERE is_current = TRUE;

-- Index only active inpatient stays
CREATE INDEX idx_admissions_active_stays 
    ON admissions(patient_id, admission_date) 
    WHERE status = 'Admitted';

-- Index outstanding balances for debt recovery & cashier views
CREATE INDEX idx_invoices_outstanding 
    ON invoices(patient_id, balance_due) 
    WHERE status IN ('Unpaid', 'Partially Paid') AND balance_due > 0;

-- Index medicine batches nearing expiration with remaining inventory
CREATE INDEX idx_batches_active_stock 
    ON medicine_batches(medicine_id, expiry_date, current_quantity) 
    WHERE current_quantity > 0 AND is_active = TRUE;
