-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Database Routines: Stored Procedures (PL/pgSQL)
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROCEDURE: Admit Patient & Allocate Bed (Multi-Table Transaction)
-- Atomically creates admission, assigns bed, and transitions bed to 'Occupied'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_admit_patient(
    p_patient_id INT,
    p_doctor_id INT,
    p_bed_id INT,
    p_reason TEXT,
    p_assigned_by INT,
    INOUT p_admission_id INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_adm_code VARCHAR(25);
    v_bed_status VARCHAR(20);
    v_bed_active_assign INT;
BEGIN
    -- Verify patient exists and is active
    IF NOT EXISTS (SELECT 1 FROM patients WHERE patient_id = p_patient_id AND is_active = TRUE) THEN
        RAISE EXCEPTION 'Patient with ID % does not exist or is inactive.', p_patient_id;
    END IF;

    -- Verify bed is available
    SELECT status INTO v_bed_status FROM beds WHERE bed_id = p_bed_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bed ID % does not exist.', p_bed_id;
    ELSIF v_bed_status != 'Available' THEN
        RAISE EXCEPTION 'Bed ID % is not available (Current Status: %).', p_bed_id, v_bed_status;
    END IF;

    SELECT COUNT(*) INTO v_bed_active_assign 
    FROM bed_assignments 
    WHERE bed_id = p_bed_id AND is_current = TRUE;

    IF v_bed_active_assign > 0 THEN
        RAISE EXCEPTION 'Bed ID % already has an active occupant.', p_bed_id;
    END IF;

    -- Generate human readable admission code
    v_adm_code := 'ADM-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Insert into admissions
    INSERT INTO admissions (
        admission_number, patient_id, admitting_doctor_id, admission_date,
        admission_reason, status, created_at, updated_at
    )
    VALUES (
        v_adm_code, p_patient_id, p_doctor_id, CURRENT_TIMESTAMP,
        p_reason, 'Admitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING admission_id INTO p_admission_id;

    -- Insert into bed_assignments (Trigger will automatically sync beds.status to 'Occupied')
    INSERT INTO bed_assignments (
        admission_id, bed_id, assigned_at, is_current, assigned_by, notes
    )
    VALUES (
        p_admission_id, p_bed_id, CURRENT_TIMESTAMP, TRUE, p_assigned_by, 'Initial admission allocation'
    );

    -- Ensure bed status is explicitly Occupied
    UPDATE beds SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE bed_id = p_bed_id;

    RAISE NOTICE 'Patient % successfully admitted under Admission % in Bed %', 
        p_patient_id, v_adm_code, p_bed_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- 2. PROCEDURE: Discharge Patient & Finalize Inpatient Billing
-- Atomically completes admission, vacates bed, calculates bed charges, and generates invoice.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_discharge_patient(
    p_admission_id INT,
    p_discharge_summary TEXT,
    p_user_id INT,
    INOUT p_invoice_id INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_patient_id INT;
    v_admission_date TIMESTAMPTZ;
    v_bed_id INT;
    v_daily_rate NUMERIC(10, 2);
    v_days_stayed NUMERIC(10, 2);
    v_bed_charges NUMERIC(12, 2);
    v_inv_number VARCHAR(25);
    v_tax_amount NUMERIC(10, 2);
    v_total_amount NUMERIC(12, 2);
BEGIN
    -- Validate admission status
    SELECT patient_id, admission_date 
    INTO v_patient_id, v_admission_date
    FROM admissions
    WHERE admission_id = p_admission_id AND status = 'Admitted'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active admission ID % not found.', p_admission_id;
    END IF;

    -- Fetch current bed and rate
    SELECT ba.bed_id, b.daily_rate
    INTO v_bed_id, v_daily_rate
    FROM bed_assignments ba
    JOIN beds b ON ba.bed_id = b.bed_id
    WHERE ba.admission_id = p_admission_id AND ba.is_current = TRUE
    FOR UPDATE OF ba, b;

    -- Release bed assignment
    IF v_bed_id IS NOT NULL THEN
        UPDATE bed_assignments
        SET is_current = FALSE,
            released_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes, '') || ' | Vacated upon discharge'
        WHERE admission_id = p_admission_id AND is_current = TRUE;

        -- Make bed available again
        UPDATE beds
        SET status = 'Available',
            updated_at = CURRENT_TIMESTAMP
        WHERE bed_id = v_bed_id;
    END IF;

    -- Mark admission discharged
    UPDATE admissions
    SET discharge_date = CURRENT_TIMESTAMP,
        discharge_summary = p_discharge_summary,
        status = 'Discharged',
        updated_at = CURRENT_TIMESTAMP
    WHERE admission_id = p_admission_id;

    -- Calculate bed occupancy duration (Minimum 1 billable day)
    v_days_stayed := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_admission_date)) / 86400));
    v_bed_charges := ROUND(v_days_stayed * COALESCE(v_daily_rate, 100.00), 2);
    v_tax_amount := ROUND(v_bed_charges * 0.05, 2);
    v_total_amount := v_bed_charges + v_tax_amount;

    -- Generate unique invoice number
    v_inv_number := 'INV-ADM-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Create finalized invoice
    INSERT INTO invoices (
        invoice_number, patient_id, admission_id, issue_date, due_date,
        subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_due,
        status, notes, created_by, created_at, updated_at
    )
    VALUES (
        v_inv_number, v_patient_id, p_admission_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days',
        v_bed_charges, 0.00, v_tax_amount, v_total_amount, 0.00, v_total_amount,
        'Unpaid', 'Final inpatient discharge bill for stay duration ' || v_days_stayed || ' days.',
        p_user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING invoice_id INTO p_invoice_id;

    -- Create invoice line item for bed stay
    INSERT INTO invoice_items (
        invoice_id, item_description, quantity, unit_price, discount, total_price,
        reference_type, reference_id, created_at
    )
    VALUES (
        p_invoice_id, 'Inpatient Bed Charges (' || v_days_stayed || ' days @ $' || v_daily_rate || '/day)',
        v_days_stayed::INT, v_daily_rate, 0.00, v_bed_charges,
        'BedDay', v_bed_id, CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Admission % discharged. Bed % released. Invoice % created for $% (Balance: $%)',
        p_admission_id, v_bed_id, v_inv_number, v_total_amount, v_total_amount;
END;
$$;


-- ----------------------------------------------------------------------------
-- 3. PROCEDURE: Process Payment & Update Invoices (Transaction Demonstration)
-- Validates payment, adds receipt, and updates balances.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_process_payment(
    p_invoice_id INT,
    p_amount NUMERIC,
    p_payment_method VARCHAR,
    p_transaction_ref VARCHAR,
    p_received_by INT,
    INOUT p_payment_id INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_patient_id INT;
    v_balance NUMERIC(12, 2);
    v_invoice_status VARCHAR(20);
    v_pay_num VARCHAR(25);
BEGIN
    -- Validate invoice
    SELECT patient_id, balance_due, status
    INTO v_patient_id, v_balance, v_invoice_status
    FROM invoices
    WHERE invoice_id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice ID % does not exist.', p_invoice_id;
    END IF;

    IF v_invoice_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Cannot accept payments for a Cancelled invoice.';
    ELSIF v_invoice_status = 'Paid' AND v_balance <= 0 THEN
        RAISE EXCEPTION 'Invoice ID % is already fully paid.', p_invoice_id;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero. Received: %', p_amount;
    END IF;

    IF p_amount > v_balance THEN
        RAISE EXCEPTION 'Payment of $% exceeds outstanding balance of $%.', p_amount, v_balance;
    END IF;

    v_pay_num := 'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Insert payment record (Trigger trg_recalculate_invoice_balance will auto-balance invoice)
    INSERT INTO payments (
        payment_number, invoice_id, patient_id, payment_date,
        amount, payment_method, transaction_reference, received_by,
        notes, created_at
    )
    VALUES (
        v_pay_num, p_invoice_id, v_patient_id, CURRENT_TIMESTAMP,
        p_amount, p_payment_method, p_transaction_ref, p_received_by,
        'Payment processed via ' || p_payment_method, CURRENT_TIMESTAMP
    )
    RETURNING payment_id INTO p_payment_id;

    RAISE NOTICE 'Payment % processed successfully for Invoice %: Amount $%', 
        v_pay_num, p_invoice_id, p_amount;
END;
$$;


-- ----------------------------------------------------------------------------
-- 4. PROCEDURE: Bulk Monthly Performance Report Processing (Batch/Bulk Operation)
-- Performs bulk data consolidation across all hospital modules and refreshes analytics.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_generate_monthly_hospital_report(
    p_target_month DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_total_appts INT;
    v_total_admits INT;
    v_total_revenue NUMERIC(12, 2);
BEGIN
    v_start_date := DATE_TRUNC('month', p_target_month)::DATE;
    v_end_date := (DATE_TRUNC('month', p_target_month) + INTERVAL '1 month - 1 day')::DATE;

    -- Aggregate totals for bulk check
    SELECT COUNT(*) INTO v_total_appts 
    FROM appointments 
    WHERE appointment_date BETWEEN v_start_date AND v_end_date;

    SELECT COUNT(*) INTO v_total_admits 
    FROM admissions 
    WHERE admission_date::DATE BETWEEN v_start_date AND v_end_date;

    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_revenue 
    FROM payments 
    WHERE payment_date::DATE BETWEEN v_start_date AND v_end_date;

    -- Concurrently refresh materialized performance view
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_hospital_performance;

    -- Record system setting / audit milestone
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_at)
    VALUES (
        'mv_monthly_hospital_performance', 
        TO_CHAR(v_start_date, 'YYYY-MM'),
        'UPDATE',
        jsonb_build_object(
            'month', TO_CHAR(v_start_date, 'YYYY-MM'),
            'total_appointments', v_total_appts,
            'total_admissions', v_total_admits,
            'total_revenue', v_total_revenue,
            'refreshed_at', CURRENT_TIMESTAMP
        ),
        CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Monthly report for % refreshed: Appointments=%, Admissions=%, Revenue=$%',
        TO_CHAR(v_start_date, 'YYYY-MM'), v_total_appts, v_total_admits, v_total_revenue;
END;
$$;
