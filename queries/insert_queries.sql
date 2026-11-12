-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Explicit SQL Queries: INSERT Operations
-- Parameterized format ($1, $2, ...) and Transactional Workflows
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Patient Registration
-- ----------------------------------------------------------------------------
INSERT INTO patients (
    patient_code, first_name, last_name, date_of_birth, gender,
    blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone
)
VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10, $11
)
RETURNING patient_id, patient_code, first_name, last_name;


-- ----------------------------------------------------------------------------
-- 2. Doctor Registration (Multi-table insert: staff + doctor profile)
-- ----------------------------------------------------------------------------
-- Step A: Insert into staff
-- INSERT INTO staff (user_id, department_id, first_name, last_name, gender, date_of_birth, phone, email, hire_date)
-- VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING staff_id;
-- Step B: Insert into doctors referencing staff_id
-- INSERT INTO doctors (staff_id, department_id, specialization, license_number, consultation_fee, bio)
-- VALUES ($1, $2, $3, $4, $5, $6) RETURNING doctor_id;


-- ----------------------------------------------------------------------------
-- 3. Appointment Booking
-- ----------------------------------------------------------------------------
INSERT INTO appointments (
    appointment_number, patient_id, doctor_id, department_id,
    appointment_date, start_time, end_time, appointment_type, status, notes, created_by
)
VALUES (
    $1, $2, $3, $4,
    $5, $6, $7, $8, 'Scheduled', $9, $10
)
RETURNING appointment_id, appointment_number, appointment_date, start_time;


-- ----------------------------------------------------------------------------
-- 4. Multi-Table Action 1: Complete Clinical Consultation Workflow
-- Inserts into 4 related tables atomically:
--   a) consultations
--   b) consultation_diagnoses
--   c) prescriptions
--   d) prescription_items
-- ----------------------------------------------------------------------------
-- BEGIN;
-- -- a) Record consultation encounter
-- INSERT INTO consultations (
--     consultation_number, appointment_id, patient_id, doctor_id,
--     consultation_date, symptoms, clinical_notes, treatment_plan, follow_up_date, vitals
-- )
-- VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9)
-- RETURNING consultation_id;
--
-- -- b) Record diagnosis
-- INSERT INTO consultation_diagnoses (consultation_id, diagnosis_id, diagnosis_type, notes)
-- VALUES ($1, $2, $3, $4);
--
-- -- c) Create prescription header
-- INSERT INTO prescriptions (prescription_number, consultation_id, patient_id, doctor_id, issue_date, status, notes)
-- VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Active', $5)
-- RETURNING prescription_id;
--
-- -- d) Insert prescription medicine items
-- INSERT INTO prescription_items (prescription_id, medicine_id, dosage, frequency, duration_days, prescribed_quantity, instructions)
-- VALUES ($1, $2, $3, $4, $5, $6, $7);
--
-- -- Update appointment status to 'Completed'
-- UPDATE appointments SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE appointment_id = $1;
-- COMMIT;


-- ----------------------------------------------------------------------------
-- 5. Multi-Table Action 2: Laboratory Order Placement Workflow
-- Atomically inserts requisition and line items:
--   a) lab_orders
--   b) lab_order_items (multiple)
-- ----------------------------------------------------------------------------
-- BEGIN;
-- INSERT INTO lab_orders (order_number, patient_id, doctor_id, consultation_id, priority, status)
-- VALUES ($1, $2, $3, $4, $5, 'Ordered')
-- RETURNING order_id;
--
-- INSERT INTO lab_order_items (order_id, test_id, item_fee, status)
-- VALUES ($1, $2, (SELECT standard_fee FROM lab_tests WHERE test_id = $2), 'Pending');
-- COMMIT;


-- ----------------------------------------------------------------------------
-- 6. Payment Recording
-- ----------------------------------------------------------------------------
INSERT INTO payments (
    payment_number, invoice_id, patient_id, payment_date,
    amount, payment_method, transaction_reference, received_by, notes
)
VALUES (
    $1, $2, $3, CURRENT_TIMESTAMP,
    $4, $5, $6, $7, $8
)
RETURNING payment_id, payment_number, amount, payment_date;
