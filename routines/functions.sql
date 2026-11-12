-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Database Routines: Functions (PL/pgSQL & SQL)
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCTION: Calculate Outstanding Patient Balance
-- Returns total outstanding monetary balance for a given patient.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_patient_balance(p_patient_id INT)
RETURNS NUMERIC(12, 2) AS $$
DECLARE
    v_outstanding NUMERIC(12, 2);
BEGIN
    SELECT COALESCE(SUM(balance_due), 0.00)
    INTO v_outstanding
    FROM invoices
    WHERE patient_id = p_patient_id
      AND status IN ('Unpaid', 'Partially Paid');

    RETURN v_outstanding;
END;
$$ LANGUAGE plpgsql STABLE;


-- ----------------------------------------------------------------------------
-- 2. FUNCTION: Get Available Beds (Optionally Filtered by Ward)
-- Returns table of unreserved, non-maintenance, available beds with pricing.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_available_beds(p_ward_id INT DEFAULT NULL)
RETURNS TABLE (
    bed_id INT,
    bed_number VARCHAR(20),
    daily_rate NUMERIC(10, 2),
    room_id INT,
    room_number VARCHAR(20),
    room_type VARCHAR(30),
    ward_id INT,
    ward_name VARCHAR(100),
    ward_type VARCHAR(30)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.bed_id,
        b.bed_number,
        b.daily_rate,
        r.room_id,
        r.room_number,
        r.room_type,
        w.ward_id,
        w.ward_name,
        w.ward_type
    FROM beds b
    JOIN rooms r ON b.room_id = r.room_id
    JOIN wards w ON r.ward_id = w.ward_id
    WHERE b.status = 'Available'
      AND b.is_active = TRUE
      AND w.is_active = TRUE
      AND (p_ward_id IS NULL OR w.ward_id = p_ward_id)
      AND NOT EXISTS (
          SELECT 1 
          FROM bed_assignments ba 
          WHERE ba.bed_id = b.bed_id 
            AND ba.is_current = TRUE
      )
    ORDER BY w.ward_name, r.room_number, b.bed_number;
END;
$$ LANGUAGE plpgsql STABLE;


-- ----------------------------------------------------------------------------
-- 3. FUNCTION: Calculate Dynamic Invoice Totals
-- Returns subtotal, item discount sum, standard tax (5%), and net invoice total.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_invoice_total(p_invoice_id INT)
RETURNS TABLE (
    calc_subtotal NUMERIC(12, 2),
    calc_discount NUMERIC(10, 2),
    calc_tax NUMERIC(10, 2),
    calc_total NUMERIC(12, 2)
) AS $$
DECLARE
    v_subtotal NUMERIC(12, 2) := 0.00;
    v_discount NUMERIC(10, 2) := 0.00;
    v_tax NUMERIC(10, 2) := 0.00;
    v_total NUMERIC(12, 2) := 0.00;
BEGIN
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0.00),
        COALESCE(SUM(discount), 0.00)
    INTO v_subtotal, v_discount
    FROM invoice_items
    WHERE invoice_id = p_invoice_id;

    -- Calculate standard 5% tax on taxable subtotal after discounts
    v_tax := ROUND(GREATEST(0.00, v_subtotal - v_discount) * 0.05, 2);
    v_total := GREATEST(0.00, v_subtotal - v_discount + v_tax);

    RETURN QUERY SELECT v_subtotal, v_discount, v_tax, v_total;
END;
$$ LANGUAGE plpgsql STABLE;


-- ----------------------------------------------------------------------------
-- 4. FUNCTION: Check Doctor Availability For Given Time Slot
-- Validates working schedule and conflicting appointments.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_doctor_availability(
    p_doctor_id INT,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week SMALLINT;
    v_is_scheduled BOOLEAN;
    v_conflict_count INT;
BEGIN
    -- Extract day of week: PostgreSQL extract(DOW) 0=Sunday, 6=Saturday
    v_day_of_week := EXTRACT(DOW FROM p_date)::SMALLINT;

    -- Check if doctor has a schedule template covering this slot
    SELECT EXISTS (
        SELECT 1 
        FROM doctor_schedules
        WHERE doctor_id = p_doctor_id
          AND day_of_week = v_day_of_week
          AND is_active = TRUE
          AND start_time <= p_start_time
          AND end_time >= p_end_time
    ) INTO v_is_scheduled;

    IF NOT v_is_scheduled THEN
        RETURN FALSE;
    END IF;

    -- Check if there is an overlapping booked appointment
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_date
      AND status NOT IN ('Cancelled', 'No-Show')
      AND (
          (p_start_time >= start_time AND p_start_time < end_time) OR
          (p_end_time > start_time AND p_end_time <= end_time) OR
          (p_start_time <= start_time AND p_end_time >= end_time)
      );

    RETURN (v_conflict_count = 0);
END;
$$ LANGUAGE plpgsql STABLE;
