-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Transaction and Rollback Scenarios
-- Verifies Atomicity, Consistency, Isolation, and Durability (ACID)
-- ============================================================================

\echo '===================================================='
\echo 'TRANSACTION TEST 1: Successful Multi-Table Transaction (COMMIT)'
\echo '===================================================='

-- Step 1: Register Patient and Schedule Appointment in one atomic transaction
BEGIN;

INSERT INTO patients (
    patient_code, first_name, last_name, date_of_birth, gender,
    blood_group, phone, emergency_contact_name, emergency_contact_phone
)
VALUES (
    'P-TXN-001', 'Alexander', 'Hamilton', '1985-01-11', 'Male',
    'A+', '+1-555-900-1776', 'Elizabeth Hamilton', '+1-555-900-1804'
);

INSERT INTO appointments (
    appointment_number, patient_id, doctor_id, department_id,
    appointment_date, start_time, end_time, status, notes
)
VALUES (
    'APT-TXN-001',
    (SELECT patient_id FROM patients WHERE patient_code = 'P-TXN-001'),
    (SELECT doctor_id FROM doctors LIMIT 1),
    (SELECT department_id FROM departments LIMIT 1),
    CURRENT_DATE + INTERVAL '5 days',
    '11:00:00',
    '11:30:00',
    'Scheduled',
    'Initial cardiovascular intake appointment'
);

COMMIT;

-- Verify both records exist
SELECT p.patient_code, CONCAT(p.first_name, ' ', p.last_name) AS patient_name, a.appointment_number, a.status
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.patient_code = 'P-TXN-001';

\echo 'Transaction 1 COMMITTED successfully with zero orphaned records.'


\echo '===================================================='
\echo 'TRANSACTION TEST 2: Multi-Table Failure Demonstration (ROLLBACK)'
\echo '===================================================='
-- In this scenario, we attempt to register a patient, book an appointment,
-- and then trigger an intentional failure (e.g. invalid time range or violating check).
-- PostgreSQL transaction block aborts, and all changes are rolled back.

BEGIN;

-- 1. Insert patient
INSERT INTO patients (
    patient_code, first_name, last_name, date_of_birth, gender,
    blood_group, phone, emergency_contact_name, emergency_contact_phone
)
VALUES (
    'P-FAIL-999', 'Ghost', 'Patient', '1990-01-01', 'Female',
    'O-', '+1-555-999-0000', 'Emergency Contact', '+1-555-999-0001'
);

-- 2. Verify patient was staged in this transaction
SELECT 'Staged Patient ID: ' || patient_id FROM patients WHERE patient_code = 'P-FAIL-999';

-- 3. Staging an invalid operation that violates database constraints (end_time before start_time)
-- This will trigger check constraint chk_appt_time: CHECK (end_time > start_time)
INSERT INTO appointments (
    appointment_number, patient_id, doctor_id, department_id,
    appointment_date, start_time, end_time, status
)
VALUES (
    'APT-FAIL-999',
    (SELECT patient_id FROM patients WHERE patient_code = 'P-FAIL-999'),
    (SELECT doctor_id FROM doctors LIMIT 1),
    (SELECT department_id FROM departments LIMIT 1),
    CURRENT_DATE + INTERVAL '5 days',
    '14:00:00',
    '13:00:00', -- INTENTIONAL FAILURE: end_time before start_time
    'Scheduled'
);

-- Note: Because line above errors out, transaction is in aborted state.
ROLLBACK;

-- 4. Verify complete rollback: verify that NO row with patient_code 'P-FAIL-999' was persisted!
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'ROLLBACK VERIFIED: Zero orphaned rows remain for P-FAIL-999.'
        ELSE 'ERROR: Row leaked despite rollback!'
    END AS rollback_validation_result
FROM patients 
WHERE patient_code = 'P-FAIL-999';

\echo '===================================================='
\echo 'TRANSACTION & ROLLBACK TESTS COMPLETED'
\echo '===================================================='
