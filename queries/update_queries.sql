-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Explicit SQL Queries: UPDATE Operations
-- Parameterized queries and Multi-Table atomic transactions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Update Patient Information
-- ----------------------------------------------------------------------------
UPDATE patients
SET first_name = $1,
    last_name = $2,
    phone = $3,
    email = $4,
    address = $5,
    emergency_contact_name = $6,
    emergency_contact_phone = $7,
    updated_at = CURRENT_TIMESTAMP
WHERE patient_id = $8;

-- ----------------------------------------------------------------------------
-- 2. Reschedule Appointment
-- ----------------------------------------------------------------------------
UPDATE appointments
SET appointment_date = $1,
    start_time = $2,
    end_time = $3,
    notes = COALESCE($4, notes),
    status = 'Scheduled',
    updated_at = CURRENT_TIMESTAMP
WHERE appointment_id = $5;

-- ----------------------------------------------------------------------------
-- 3. Multi-Table Action 1: Inpatient Bed Transfer Workflow
-- Atomically transfers patient from Bed A to Bed B:
-- Updates bed_assignments (releases old bed), marks old bed Available,
-- inserts new bed_assignment, and marks new bed Occupied.
-- ----------------------------------------------------------------------------
-- BEGIN;
-- -- 1. Release active assignment
-- UPDATE bed_assignments
-- SET is_current = FALSE,
--     released_at = CURRENT_TIMESTAMP,
--     notes = COALESCE(notes, '') || ' | Transferred to new bed'
-- WHERE admission_id = $1 AND is_current = TRUE
-- RETURNING bed_id INTO v_old_bed_id;
--
-- -- 2. Mark previous bed as Available
-- UPDATE beds SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE bed_id = v_old_bed_id;
--
-- -- 3. Assign new bed
-- INSERT INTO bed_assignments (admission_id, bed_id, assigned_at, is_current, assigned_by, notes)
-- VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE, $3, 'Bed transfer');
--
-- -- 4. Mark new bed as Occupied
-- UPDATE beds SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE bed_id = $2;
-- COMMIT;

-- ----------------------------------------------------------------------------
-- 4. Multi-Table Action 2: Controlled Medicine Dispensing Fulfillment
-- Updates prescription_items dispensed quantity, inserts dispensing transaction,
-- and updates medicine_batches stock atomically.
-- ----------------------------------------------------------------------------
-- BEGIN;
-- -- Update prescription item progress
-- UPDATE prescription_items
-- SET dispensed_quantity = dispensed_quantity + $1
-- WHERE item_id = $2;
--
-- -- Insert double-entry inventory ledger (Trigger automatically updates medicine_batches current_quantity)
-- INSERT INTO inventory_transactions (
--     batch_id, medicine_id, transaction_type, quantity, unit_price,
--     total_amount, reference_type, reference_id, performed_by, notes
-- )
-- VALUES (
--     $3, $4, 'Dispense', $1, $5,
--     ($1 * $5), 'Prescription', $6, $7, 'Prescription fulfillment'
-- );
-- COMMIT;

-- ----------------------------------------------------------------------------
-- 5. Update Doctor Profile & Schedule
-- ----------------------------------------------------------------------------
UPDATE doctors
SET specialization = $1,
    consultation_fee = $2,
    bio = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE doctor_id = $4;
