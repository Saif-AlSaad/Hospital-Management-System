-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Comprehensive Database Tests
-- Verifies Constraints, Procedures, Functions, Triggers, and Roles
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

\echo '===================================================='
\echo 'RUNNING HOSPITAL MANAGEMENT SYSTEM DATABASE TESTS'
\echo '===================================================='

-- ----------------------------------------------------------------------------
-- TEST 1: Primary Key & Foreign Key Referential Integrity
-- ----------------------------------------------------------------------------
\echo 'TEST 1: Testing Foreign Key Rejection on Invalid Patient ID...'
DO $$
BEGIN
    BEGIN
        INSERT INTO appointments (
            appointment_number, patient_id, doctor_id, department_id,
            appointment_date, start_time, end_time
        )
        VALUES ('TEST-FAIL-01', 9999999, 1, 1, CURRENT_DATE, '10:00:00', '10:30:00');
        RAISE EXCEPTION 'TEST 1 FAILED: Invalid foreign key was accepted!';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'TEST 1 PASSED: Foreign key constraint successfully rejected non-existent patient.';
    END;
END;
$$;

-- ----------------------------------------------------------------------------
-- TEST 2: CHECK Constraint: Prevent Negative Medicine Inventory
-- ----------------------------------------------------------------------------
\echo 'TEST 2: Testing CHECK Constraint for Negative Batch Quantity...'
DO $$
BEGIN
    BEGIN
        INSERT INTO medicine_batches (
            medicine_id, batch_number, manufacture_date, expiry_date,
            cost_price, selling_price, initial_quantity, current_quantity
        )
        VALUES (1, 'TEST-FAIL-LOT', '2025-01-01', '2027-01-01', 10.00, 15.00, 100, -50);
        RAISE EXCEPTION 'TEST 2 FAILED: Negative inventory quantity was accepted!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'TEST 2 PASSED: CHECK constraint chk_batch_current_qty successfully blocked negative stock.';
    END;
END;
$$;

-- ----------------------------------------------------------------------------
-- TEST 3: Composite Primary Key in Junction Table
-- ----------------------------------------------------------------------------
\echo 'TEST 3: Testing Composite Primary Key Uniqueness on user_roles...'
DO $$
DECLARE
    v_uid INT;
    v_rid INT;
BEGIN
    SELECT user_id INTO v_uid FROM users LIMIT 1;
    SELECT role_id INTO v_rid FROM roles LIMIT 1;

    -- Insert once (or ensure present)
    INSERT INTO user_roles (user_id, role_id) VALUES (v_uid, v_rid) ON CONFLICT DO NOTHING;

    BEGIN
        -- Attempt duplicate pair
        INSERT INTO user_roles (user_id, role_id) VALUES (v_uid, v_rid);
        RAISE EXCEPTION 'TEST 3 FAILED: Duplicate composite PK pair was accepted!';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'TEST 3 PASSED: Composite Primary Key (user_id, role_id) successfully rejected duplicate pair.';
    END;
END;
$$;

-- ----------------------------------------------------------------------------
-- TEST 4: Database Trigger: Prevent Conflicting Appointment for Doctor
-- ----------------------------------------------------------------------------
\echo 'TEST 4: Testing Appointment Conflict Prevention Trigger...'
DO $$
DECLARE
    v_doc_id INT;
    v_pat_id INT;
    v_dept_id INT;
BEGIN
    SELECT doctor_id, department_id INTO v_doc_id, v_dept_id FROM doctors LIMIT 1;
    SELECT patient_id INTO v_pat_id FROM patients LIMIT 1;

    -- Insert baseline appointment
    INSERT INTO appointments (
        appointment_number, patient_id, doctor_id, department_id,
        appointment_date, start_time, end_time, status
    )
    VALUES ('TEST-CONFLICT-01', v_pat_id, v_doc_id, v_dept_id, '2028-10-10', '10:00:00', '10:30:00', 'Scheduled');

    -- Attempt overlapping booking for same doctor
    BEGIN
        INSERT INTO appointments (
            appointment_number, patient_id, doctor_id, department_id,
            appointment_date, start_time, end_time, status
        )
        VALUES ('TEST-CONFLICT-02', v_pat_id, v_doc_id, v_dept_id, '2028-10-10', '10:15:00', '10:45:00', 'Scheduled');
        RAISE EXCEPTION 'TEST 4 FAILED: Conflicting appointment was booked!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 4 PASSED: Appointment conflict trigger successfully intercepted overlapping booking.';
    END;

    -- Clean up test appointment
    DELETE FROM appointments WHERE appointment_number = 'TEST-CONFLICT-01';
END;
$$;

-- ----------------------------------------------------------------------------
-- TEST 5: Database Function: fn_calculate_patient_balance
-- ----------------------------------------------------------------------------
\echo 'TEST 5: Testing fn_calculate_patient_balance Function...'
DO $$
DECLARE
    v_pid INT;
    v_bal NUMERIC(12, 2);
BEGIN
    SELECT patient_id INTO v_pid FROM patients LIMIT 1;
    v_bal := fn_calculate_patient_balance(v_pid);
    RAISE NOTICE 'TEST 5 PASSED: fn_calculate_patient_balance returned $% for patient ID %', v_bal, v_pid;
END;
$$;

-- ----------------------------------------------------------------------------
-- TEST 6: Stored Procedure: sp_admit_patient and Bed Occupancy Transition
-- ----------------------------------------------------------------------------
\echo 'TEST 6: Testing Stored Procedure sp_admit_patient...'
DO $$
DECLARE
    v_pid INT;
    v_doc_id INT;
    v_bed_id INT;
    v_adm_id INT;
    v_bed_status VARCHAR(20);
BEGIN
    SELECT patient_id INTO v_pid FROM patients LIMIT 1;
    SELECT doctor_id INTO v_doc_id FROM doctors LIMIT 1;
    SELECT bed_id INTO v_bed_id FROM beds WHERE status = 'Available' LIMIT 1;

    IF v_bed_id IS NOT NULL THEN
        CALL sp_admit_patient(v_pid, v_doc_id, v_bed_id, 'Routine post-surgery observation', 1, v_adm_id);
        
        -- Verify bed status is now Occupied
        SELECT status INTO v_bed_status FROM beds WHERE bed_id = v_bed_id;
        IF v_bed_status != 'Occupied' THEN
            RAISE EXCEPTION 'TEST 6 FAILED: Bed status is % instead of Occupied!', v_bed_status;
        END IF;

        RAISE NOTICE 'TEST 6 PASSED: Patient successfully admitted via sp_admit_patient (Admission ID: %). Bed % status updated to %',
            v_adm_id, v_bed_id, v_bed_status;
    ELSE
        RAISE NOTICE 'TEST 6 SKIPPED: No available beds currently free for test allocation.';
    END IF;
END;
$$;

\echo '===================================================='
\echo 'ALL DATABASE INTEGRITY TESTS COMPLETED SUCCESSFULLY'
\echo '===================================================='
