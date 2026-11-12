-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- DDL Script 02: Foreign Keys & Integrity Constraints
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FOREIGN KEY CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Authentication & Organization
ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT;

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_head FOREIGN KEY (head_doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE staff
    ADD CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_staff_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT;

ALTER TABLE doctors
    ADD CONSTRAINT fk_doctors_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_doctors_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT;

ALTER TABLE doctor_schedules
    ADD CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE;

-- Patients & Clinical Core
ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_appointments_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_appointments_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE consultations
    ADD CONSTRAINT fk_consultations_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_consultations_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_consultations_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT;

ALTER TABLE consultation_diagnoses
    ADD CONSTRAINT fk_con_diag_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_con_diag_diagnosis FOREIGN KEY (diagnosis_id) REFERENCES diagnoses(diagnosis_id) ON DELETE RESTRICT;

ALTER TABLE medical_records
    ADD CONSTRAINT fk_medical_records_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_medical_records_user FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT;

-- Inpatient Management
ALTER TABLE wards
    ADD CONSTRAINT fk_wards_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT;

ALTER TABLE rooms
    ADD CONSTRAINT fk_rooms_ward FOREIGN KEY (ward_id) REFERENCES wards(ward_id) ON DELETE CASCADE;

ALTER TABLE beds
    ADD CONSTRAINT fk_beds_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE;

ALTER TABLE admissions
    ADD CONSTRAINT fk_admissions_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_admissions_doctor FOREIGN KEY (admitting_doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT;

ALTER TABLE bed_assignments
    ADD CONSTRAINT fk_bed_assign_admission FOREIGN KEY (admission_id) REFERENCES admissions(admission_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_bed_assign_bed FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_bed_assign_user FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE RESTRICT;

-- Laboratory
ALTER TABLE lab_tests
    ADD CONSTRAINT fk_lab_tests_category FOREIGN KEY (category_id) REFERENCES lab_test_categories(category_id) ON DELETE RESTRICT;

ALTER TABLE lab_orders
    ADD CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_lab_orders_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_lab_orders_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE SET NULL;

ALTER TABLE lab_order_items
    ADD CONSTRAINT fk_lab_items_order FOREIGN KEY (order_id) REFERENCES lab_orders(order_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_lab_items_test FOREIGN KEY (test_id) REFERENCES lab_tests(test_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_lab_items_tech FOREIGN KEY (performed_by) REFERENCES staff(staff_id) ON DELETE SET NULL;

ALTER TABLE lab_results
    ADD CONSTRAINT fk_lab_results_item FOREIGN KEY (order_item_id) REFERENCES lab_order_items(order_item_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_lab_results_tech FOREIGN KEY (technician_id) REFERENCES staff(staff_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_lab_results_doctor FOREIGN KEY (verified_by) REFERENCES doctors(doctor_id) ON DELETE SET NULL;

-- Pharmacy & Inventory
ALTER TABLE medicines
    ADD CONSTRAINT fk_medicines_category FOREIGN KEY (category_id) REFERENCES medicine_categories(category_id) ON DELETE RESTRICT;

ALTER TABLE medicine_batches
    ADD CONSTRAINT fk_batches_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE RESTRICT;

ALTER TABLE inventory_transactions
    ADD CONSTRAINT fk_inv_txn_batch FOREIGN KEY (batch_id) REFERENCES medicine_batches(batch_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_inv_txn_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_inv_txn_user FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE RESTRICT;

ALTER TABLE prescriptions
    ADD CONSTRAINT fk_prescriptions_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT;

ALTER TABLE prescription_items
    ADD CONSTRAINT fk_rx_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_rx_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE RESTRICT;

ALTER TABLE medicine_dispensing
    ADD CONSTRAINT fk_dispensing_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_dispensing_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_dispensing_pharmacist FOREIGN KEY (pharmacist_id) REFERENCES staff(staff_id) ON DELETE RESTRICT;

ALTER TABLE medicine_dispensing_items
    ADD CONSTRAINT fk_disp_items_dispensing FOREIGN KEY (dispensing_id) REFERENCES medicine_dispensing(dispensing_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_disp_items_rx_item FOREIGN KEY (prescription_item_id) REFERENCES prescription_items(item_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_disp_items_batch FOREIGN KEY (batch_id) REFERENCES medicine_batches(batch_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_disp_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE RESTRICT;

-- Billing & Payments
ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_invoices_admission FOREIGN KEY (admission_id) REFERENCES admissions(admission_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_invoices_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_invoices_user FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT;

ALTER TABLE invoice_items
    ADD CONSTRAINT fk_inv_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_inv_items_service FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE SET NULL;

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_payments_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_payments_user FOREIGN KEY (received_by) REFERENCES users(user_id) ON DELETE RESTRICT;

ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 2. DOMAIN & VALUE CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Gender & Demographics
ALTER TABLE staff
    ADD CONSTRAINT chk_staff_gender CHECK (gender IN ('Male', 'Female', 'Other')),
    ADD CONSTRAINT chk_staff_status CHECK (employment_status IN ('Active', 'On Leave', 'Suspended', 'Terminated'));

ALTER TABLE patients
    ADD CONSTRAINT chk_patient_gender CHECK (gender IN ('Male', 'Female', 'Other')),
    ADD CONSTRAINT chk_patient_blood_group CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

-- Schedules & Times
ALTER TABLE doctor_schedules
    ADD CONSTRAINT chk_schedule_day CHECK (day_of_week BETWEEN 0 AND 6),
    ADD CONSTRAINT chk_schedule_time CHECK (end_time > start_time),
    ADD CONSTRAINT chk_schedule_slot CHECK (slot_duration_minutes > 0),
    ADD CONSTRAINT chk_schedule_max_patients CHECK (max_patients > 0);

-- Appointments & Consultations
ALTER TABLE appointments
    ADD CONSTRAINT chk_appt_time CHECK (end_time > start_time),
    ADD CONSTRAINT chk_appt_type CHECK (appointment_type IN ('New', 'Follow-up', 'Routine', 'Emergency')),
    ADD CONSTRAINT chk_appt_status CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'));

ALTER TABLE consultation_diagnoses
    ADD CONSTRAINT chk_diag_type CHECK (diagnosis_type IN ('Primary', 'Secondary', 'Differential'));

-- Inpatient Wards & Beds
ALTER TABLE wards
    ADD CONSTRAINT chk_ward_gender CHECK (gender_preference IN ('Any', 'Male', 'Female'));

ALTER TABLE beds
    ADD CONSTRAINT chk_bed_status CHECK (status IN ('Available', 'Occupied', 'Maintenance', 'Reserved')),
    ADD CONSTRAINT chk_bed_rate CHECK (daily_rate >= 0);

ALTER TABLE admissions
    ADD CONSTRAINT chk_adm_dates CHECK (discharge_date IS NULL OR discharge_date >= admission_date),
    ADD CONSTRAINT chk_adm_status CHECK (status IN ('Admitted', 'Discharged', 'Transferred', 'Cancelled'));

-- Laboratory
ALTER TABLE lab_orders
    ADD CONSTRAINT chk_lab_order_status CHECK (status IN ('Ordered', 'In Progress', 'Completed', 'Cancelled')),
    ADD CONSTRAINT chk_lab_order_priority CHECK (priority IN ('Routine', 'Urgent', 'Emergency'));

ALTER TABLE lab_order_items
    ADD CONSTRAINT chk_lab_item_status CHECK (status IN ('Pending', 'Sample Collected', 'Testing', 'Completed', 'Cancelled')),
    ADD CONSTRAINT chk_lab_item_fee CHECK (item_fee >= 0);

-- Pharmacy & Inventory Rules
ALTER TABLE medicine_batches
    ADD CONSTRAINT chk_batch_dates CHECK (expiry_date > manufacture_date),
    ADD CONSTRAINT chk_batch_cost CHECK (cost_price >= 0),
    ADD CONSTRAINT chk_batch_selling CHECK (selling_price >= cost_price),
    ADD CONSTRAINT chk_batch_initial_qty CHECK (initial_quantity >= 0),
    ADD CONSTRAINT chk_batch_current_qty CHECK (current_quantity >= 0); -- Strictly prevents negative inventory!

ALTER TABLE inventory_transactions
    ADD CONSTRAINT chk_inv_txn_type CHECK (transaction_type IN ('Purchase', 'Dispense', 'Adjustment', 'Return', 'Disposal')),
    ADD CONSTRAINT chk_inv_txn_price CHECK (unit_price >= 0);

ALTER TABLE prescriptions
    ADD CONSTRAINT chk_rx_status CHECK (status IN ('Active', 'Partially Dispensed', 'Dispensed', 'Cancelled'));

ALTER TABLE prescription_items
    ADD CONSTRAINT chk_rx_item_duration CHECK (duration_days > 0),
    ADD CONSTRAINT chk_rx_item_prescribed_qty CHECK (prescribed_quantity > 0),
    ADD CONSTRAINT chk_rx_item_dispensed_qty CHECK (dispensed_quantity >= 0 AND dispensed_quantity <= prescribed_quantity);

ALTER TABLE medicine_dispensing_items
    ADD CONSTRAINT chk_disp_item_qty CHECK (quantity > 0),
    ADD CONSTRAINT chk_disp_item_price CHECK (unit_price >= 0),
    ADD CONSTRAINT chk_disp_item_subtotal CHECK (subtotal >= 0);

-- Billing & Invoicing
ALTER TABLE invoices
    ADD CONSTRAINT chk_inv_subtotal CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_inv_discount CHECK (discount_amount >= 0),
    ADD CONSTRAINT chk_inv_tax CHECK (tax_amount >= 0),
    ADD CONSTRAINT chk_inv_total CHECK (total_amount >= 0),
    ADD CONSTRAINT chk_inv_paid CHECK (paid_amount >= 0),
    ADD CONSTRAINT chk_inv_status CHECK (status IN ('Unpaid', 'Partially Paid', 'Paid', 'Cancelled'));

ALTER TABLE invoice_items
    ADD CONSTRAINT chk_inv_item_qty CHECK (quantity > 0),
    ADD CONSTRAINT chk_inv_item_price CHECK (unit_price >= 0),
    ADD CONSTRAINT chk_inv_item_discount CHECK (discount >= 0),
    ADD CONSTRAINT chk_inv_item_total CHECK (total_price >= 0);

ALTER TABLE payments
    ADD CONSTRAINT chk_payment_amount CHECK (amount > 0),
    ADD CONSTRAINT chk_payment_method CHECK (payment_method IN ('Cash', 'Credit Card', 'Debit Card', 'MFS/bKash', 'Bank Transfer', 'Insurance'));

ALTER TABLE audit_logs
    ADD CONSTRAINT chk_audit_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'));
