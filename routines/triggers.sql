-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Database Routines: Triggers & Trigger Functions
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIGGER: Generic updated_at Timestamp Synchronizer (BEFORE UPDATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to key master and transactional tables
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();

DROP TRIGGER IF EXISTS trg_staff_updated_at ON staff;
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();

DROP TRIGGER IF EXISTS trg_doctors_updated_at ON doctors;
CREATE TRIGGER trg_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();

DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();

DROP TRIGGER IF EXISTS trg_admissions_updated_at ON admissions;
CREATE TRIGGER trg_admissions_updated_at BEFORE UPDATE ON admissions FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();


-- ----------------------------------------------------------------------------
-- 2. TRIGGER: Prevent Conflicting Appointments for Same Doctor (BEFORE INSERT/UPDATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_check_appointment_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    -- Only check for active appointments (ignore Cancelled or No-Show)
    IF NEW.status NOT IN ('Cancelled', 'No-Show') THEN
        SELECT COUNT(*)
        INTO v_conflict_count
        FROM appointments
        WHERE doctor_id = NEW.doctor_id
          AND appointment_date = NEW.appointment_date
          AND appointment_id != COALESCE(NEW.appointment_id, -1)
          AND status NOT IN ('Cancelled', 'No-Show')
          AND (
              (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
              (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
              (NEW.start_time <= start_time AND NEW.end_time >= end_time)
          );

        IF v_conflict_count > 0 THEN
            RAISE EXCEPTION 'Scheduling Conflict: Doctor % is already booked during % to % on %',
                NEW.doctor_id, NEW.start_time, NEW.end_time, NEW.appointment_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_appointment_conflict ON appointments;
CREATE TRIGGER trg_check_appointment_conflict
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION fn_trigger_check_appointment_conflict();


-- ----------------------------------------------------------------------------
-- 3. TRIGGER: Enforce Single Bed Assignment & Bed Status Synchronization
-- (BEFORE INSERT/UPDATE on bed_assignments & AFTER INSERT/UPDATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_validate_bed_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_bed_status VARCHAR(20);
    v_existing_active INT;
BEGIN
    IF NEW.is_current = TRUE THEN
        -- Check if bed is already actively assigned to another patient
        SELECT COUNT(*)
        INTO v_existing_active
        FROM bed_assignments
        WHERE bed_id = NEW.bed_id
          AND is_current = TRUE
          AND assignment_id != COALESCE(NEW.assignment_id, -1);

        IF v_existing_active > 0 THEN
            RAISE EXCEPTION 'Bed Assignment Error: Bed ID % is currently occupied by another active admission.', NEW.bed_id;
        END IF;

        -- Verify bed status is not in maintenance
        SELECT status INTO v_bed_status FROM beds WHERE bed_id = NEW.bed_id;
        IF v_bed_status = 'Maintenance' THEN
            RAISE EXCEPTION 'Bed Assignment Error: Bed ID % is currently under Maintenance.', NEW.bed_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_bed_assignment ON bed_assignments;
CREATE TRIGGER trg_validate_bed_assignment
    BEFORE INSERT OR UPDATE ON bed_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_trigger_validate_bed_assignment();

-- Synchronize bed status after assignment change
CREATE OR REPLACE FUNCTION fn_trigger_sync_bed_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.is_current = TRUE THEN
            UPDATE beds SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE bed_id = NEW.bed_id;
        ELSE
            -- If released, mark available
            UPDATE beds SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE bed_id = NEW.bed_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_bed_status ON bed_assignments;
CREATE TRIGGER trg_sync_bed_status
    AFTER INSERT OR UPDATE ON bed_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_trigger_sync_bed_status();


-- ----------------------------------------------------------------------------
-- 4. TRIGGER: Inventory Stock Enforcement (BEFORE INSERT on inventory_transactions)
-- Strictly updates medicine_batches current_quantity and prevents negative stock.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_inventory_stock_control()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INT;
BEGIN
    SELECT current_quantity INTO v_current_stock
    FROM medicine_batches
    WHERE batch_id = NEW.batch_id
    FOR UPDATE; -- Lock batch row for concurrency safety

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory Error: Batch ID % does not exist.', NEW.batch_id;
    END IF;

    IF NEW.transaction_type IN ('Dispense', 'Disposal') THEN
        IF v_current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Insufficient Inventory: Requested % units, but Batch ID % only has % units in stock.',
                NEW.quantity, NEW.batch_id, v_current_stock;
        END IF;

        UPDATE medicine_batches
        SET current_quantity = current_quantity - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = NEW.batch_id;

    ELSIF NEW.transaction_type IN ('Purchase', 'Return') THEN
        UPDATE medicine_batches
        SET current_quantity = current_quantity + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = NEW.batch_id;

    ELSIF NEW.transaction_type = 'Adjustment' THEN
        -- Adjustment sets quantity directly or adds delta
        UPDATE medicine_batches
        SET current_quantity = NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = NEW.batch_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_stock_control ON inventory_transactions;
CREATE TRIGGER trg_inventory_stock_control
    BEFORE INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION fn_trigger_inventory_stock_control();


-- ----------------------------------------------------------------------------
-- 5. TRIGGER: Automatic Invoice Balance & Status Recalculation on Payment (AFTER INSERT/UPDATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_recalculate_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(12, 2);
    v_invoice_total NUMERIC(12, 2);
    v_new_balance NUMERIC(12, 2);
    v_new_status VARCHAR(20);
BEGIN
    -- Sum all payments for this invoice
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id;

    -- Fetch invoice total
    SELECT total_amount
    INTO v_invoice_total
    FROM invoices
    WHERE invoice_id = NEW.invoice_id;

    v_new_balance := GREATEST(0.00, v_invoice_total - v_total_paid);

    IF v_new_balance = 0.00 AND v_invoice_total > 0.00 THEN
        v_new_status := 'Paid';
    ELSIF v_total_paid > 0.00 AND v_new_balance > 0.00 THEN
        v_new_status := 'Partially Paid';
    ELSE
        v_new_status := 'Unpaid';
    END IF;

    UPDATE invoices
    SET paid_amount = v_total_paid,
        balance_due = v_new_balance,
        status = v_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE invoice_id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_invoice_balance ON payments;
CREATE TRIGGER trg_recalculate_invoice_balance
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION fn_trigger_recalculate_invoice_balance();


-- ----------------------------------------------------------------------------
-- 6. TRIGGER: Comprehensive Audit Logging (AFTER INSERT/UPDATE/DELETE)
-- Records before and after values into audit_logs table as JSONB snapshots.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id VARCHAR(50);
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_action VARCHAR(10);
    v_user_id INT := NULL;
BEGIN
    -- Attempt to read current session app user if configured
    BEGIN
        v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_new_data := to_jsonb(NEW);
        IF TG_TABLE_NAME = 'patients' THEN v_record_id := NEW.patient_id::TEXT;
        ELSIF TG_TABLE_NAME = 'appointments' THEN v_record_id := NEW.appointment_id::TEXT;
        ELSIF TG_TABLE_NAME = 'admissions' THEN v_record_id := NEW.admission_id::TEXT;
        ELSIF TG_TABLE_NAME = 'invoices' THEN v_record_id := NEW.invoice_id::TEXT;
        ELSIF TG_TABLE_NAME = 'payments' THEN v_record_id := NEW.payment_id::TEXT;
        ELSIF TG_TABLE_NAME = 'prescriptions' THEN v_record_id := NEW.prescription_id::TEXT;
        ELSE v_record_id := 'N/A';
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        IF TG_TABLE_NAME = 'patients' THEN v_record_id := NEW.patient_id::TEXT;
        ELSIF TG_TABLE_NAME = 'appointments' THEN v_record_id := NEW.appointment_id::TEXT;
        ELSIF TG_TABLE_NAME = 'admissions' THEN v_record_id := NEW.admission_id::TEXT;
        ELSIF TG_TABLE_NAME = 'invoices' THEN v_record_id := NEW.invoice_id::TEXT;
        ELSIF TG_TABLE_NAME = 'payments' THEN v_record_id := NEW.payment_id::TEXT;
        ELSIF TG_TABLE_NAME = 'prescriptions' THEN v_record_id := NEW.prescription_id::TEXT;
        ELSE v_record_id := 'N/A';
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old_data := to_jsonb(OLD);
        IF TG_TABLE_NAME = 'patients' THEN v_record_id := OLD.patient_id::TEXT;
        ELSIF TG_TABLE_NAME = 'appointments' THEN v_record_id := OLD.appointment_id::TEXT;
        ELSIF TG_TABLE_NAME = 'admissions' THEN v_record_id := OLD.admission_id::TEXT;
        ELSIF TG_TABLE_NAME = 'invoices' THEN v_record_id := OLD.invoice_id::TEXT;
        ELSIF TG_TABLE_NAME = 'payments' THEN v_record_id := OLD.payment_id::TEXT;
        ELSIF TG_TABLE_NAME = 'prescriptions' THEN v_record_id := OLD.prescription_id::TEXT;
        ELSE v_record_id := 'N/A';
        END IF;
    END IF;

    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by, changed_at, ip_address)
    VALUES (TG_TABLE_NAME, v_record_id, v_action, v_old_data, v_new_data, v_user_id, CURRENT_TIMESTAMP, inet_client_addr()::TEXT);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach audit triggers to vital core tables
DROP TRIGGER IF EXISTS trg_audit_patients ON patients;
CREATE TRIGGER trg_audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION fn_trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_appointments ON appointments;
CREATE TRIGGER trg_audit_appointments AFTER INSERT OR UPDATE OR DELETE ON appointments FOR EACH ROW EXECUTE FUNCTION fn_trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_admissions ON admissions;
CREATE TRIGGER trg_audit_admissions AFTER INSERT OR UPDATE OR DELETE ON admissions FOR EACH ROW EXECUTE FUNCTION fn_trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_invoices ON invoices;
CREATE TRIGGER trg_audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION fn_trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_prescriptions ON prescriptions;
CREATE TRIGGER trg_audit_prescriptions AFTER INSERT OR UPDATE OR DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION fn_trigger_audit_log();
