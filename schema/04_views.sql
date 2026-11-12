-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- DDL Script 04: Database Views & Materialized Views
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VIEW: Doctor Directory & Workload Summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_doctor_directory AS
SELECT 
    d.doctor_id,
    s.staff_id,
    CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
    s.gender,
    s.phone,
    s.email,
    dept.department_id,
    dept.department_name,
    d.specialization,
    d.license_number,
    d.consultation_fee,
    d.is_active,
    COUNT(DISTINCT a.appointment_id) AS total_appointments,
    COUNT(DISTINCT c.consultation_id) AS total_consultations
FROM doctors d
JOIN staff s ON d.staff_id = s.staff_id
JOIN departments dept ON d.department_id = dept.department_id
LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
LEFT JOIN consultations c ON d.doctor_id = c.doctor_id
GROUP BY 
    d.doctor_id, s.staff_id, s.first_name, s.last_name, s.gender,
    s.phone, s.email, dept.department_id, dept.department_name,
    d.specialization, d.license_number, d.consultation_fee, d.is_active;

-- ----------------------------------------------------------------------------
-- 2. VIEW: Active Inpatient Admissions & Bed Allocations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_admissions AS
SELECT 
    adm.admission_id,
    adm.admission_number,
    p.patient_id,
    p.patient_code,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    p.phone AS patient_phone,
    p.blood_group,
    p.date_of_birth,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INT AS age,
    adm.admitting_doctor_id,
    CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
    w.ward_id,
    w.ward_name,
    w.ward_type,
    r.room_number,
    b.bed_id,
    b.bed_number,
    b.daily_rate,
    adm.admission_date,
    adm.admission_reason,
    ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - adm.admission_date)) / 86400, 1) AS days_admitted,
    ba.assignment_id,
    ba.assigned_at
FROM admissions adm
JOIN patients p ON adm.patient_id = p.patient_id
JOIN doctors doc ON adm.admitting_doctor_id = doc.doctor_id
JOIN staff s ON doc.staff_id = s.staff_id
JOIN bed_assignments ba ON adm.admission_id = ba.admission_id AND ba.is_current = TRUE
JOIN beds b ON ba.bed_id = b.bed_id
JOIN rooms r ON b.room_id = r.room_id
JOIN wards w ON r.ward_id = w.ward_id
WHERE adm.status = 'Admitted';

-- ----------------------------------------------------------------------------
-- 3. VIEW: Ward Bed Occupancy Dashboard Statistics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_bed_occupancy_by_ward AS
SELECT 
    w.ward_id,
    w.ward_name,
    w.ward_type,
    dept.department_name,
    COUNT(b.bed_id) AS total_beds,
    COUNT(b.bed_id) FILTER (WHERE b.status = 'Available' AND b.is_active = TRUE) AS available_beds,
    COUNT(b.bed_id) FILTER (WHERE b.status = 'Occupied') AS occupied_beds,
    COUNT(b.bed_id) FILTER (WHERE b.status = 'Maintenance') AS maintenance_beds,
    COUNT(b.bed_id) FILTER (WHERE b.status = 'Reserved') AS reserved_beds,
    CASE 
        WHEN COUNT(b.bed_id) > 0 
        THEN ROUND((COUNT(b.bed_id) FILTER (WHERE b.status = 'Occupied')::NUMERIC / COUNT(b.bed_id)::NUMERIC) * 100, 2)
        ELSE 0.00 
    END AS occupancy_percentage
FROM wards w
JOIN departments dept ON w.department_id = dept.department_id
LEFT JOIN rooms r ON w.ward_id = r.ward_id
LEFT JOIN beds b ON r.room_id = b.room_id
WHERE w.is_active = TRUE
GROUP BY w.ward_id, w.ward_name, w.ward_type, dept.department_name;

-- ----------------------------------------------------------------------------
-- 4. VIEW: Low Stock & Expiring Medicine Warning List
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_low_stock_medicines AS
SELECT 
    m.medicine_id,
    m.brand_name,
    m.generic_name,
    mc.category_name,
    m.dosage_form,
    m.strength,
    m.manufacturer,
    m.reorder_level,
    COALESCE(SUM(mb.current_quantity), 0) AS total_available_stock,
    COUNT(mb.batch_id) FILTER (WHERE mb.expiry_date <= CURRENT_DATE) AS expired_batches_count,
    COUNT(mb.batch_id) FILTER (WHERE mb.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days')) AS near_expiry_batches_count,
    CASE 
        WHEN COALESCE(SUM(mb.current_quantity), 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(mb.current_quantity), 0) <= m.reorder_level THEN 'LOW_STOCK'
        ELSE 'OPTIMAL'
    END AS stock_status
FROM medicines m
JOIN medicine_categories mc ON m.category_id = mc.category_id
LEFT JOIN medicine_batches mb ON m.medicine_id = mb.medicine_id AND mb.is_active = TRUE
WHERE m.is_active = TRUE
GROUP BY 
    m.medicine_id, m.brand_name, m.generic_name, mc.category_name,
    m.dosage_form, m.strength, m.manufacturer, m.reorder_level;

-- ----------------------------------------------------------------------------
-- 5. VIEW: Patient Financial & Clinical 360 Summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_patient_360 AS
SELECT 
    p.patient_id,
    p.patient_code,
    CONCAT(p.first_name, ' ', p.last_name) AS full_name,
    p.gender,
    p.date_of_birth,
    p.phone,
    p.blood_group,
    p.is_active,
    COUNT(DISTINCT a.appointment_id) AS appointment_count,
    COUNT(DISTINCT adm.admission_id) AS admission_count,
    COUNT(DISTINCT inv.invoice_id) AS invoice_count,
    COALESCE(SUM(inv.total_amount), 0.00) AS total_billed,
    COALESCE(SUM(inv.paid_amount), 0.00) AS total_paid,
    COALESCE(SUM(inv.balance_due), 0.00) AS total_outstanding_balance,
    MAX(a.appointment_date) AS last_appointment_date,
    MAX(adm.admission_date) AS last_admission_date
FROM patients p
LEFT JOIN appointments a ON p.patient_id = a.patient_id
LEFT JOIN admissions adm ON p.patient_id = adm.patient_id
LEFT JOIN invoices inv ON p.patient_id = inv.patient_id AND inv.status != 'Cancelled'
GROUP BY 
    p.patient_id, p.patient_code, p.first_name, p.last_name,
    p.gender, p.date_of_birth, p.phone, p.blood_group, p.is_active;

-- ----------------------------------------------------------------------------
-- 6. MATERIALIZED VIEW: Monthly Hospital Performance Metrics
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_monthly_hospital_performance AS
SELECT 
    TO_CHAR(d.month_date, 'YYYY-MM') AS report_month,
    d.month_date,
    COALESCE(appt.total_appointments, 0) AS total_appointments,
    COALESCE(appt.completed_appointments, 0) AS completed_appointments,
    COALESCE(appt.cancelled_appointments, 0) AS cancelled_appointments,
    COALESCE(cons.total_consultations, 0) AS total_consultations,
    COALESCE(adm.total_admissions, 0) AS total_admissions,
    COALESCE(adm.total_discharges, 0) AS total_discharges,
    COALESCE(fin.gross_invoiced, 0.00) AS gross_invoiced,
    COALESCE(fin.total_collected, 0.00) AS total_collected,
    COALESCE(fin.outstanding_balance, 0.00) AS outstanding_balance
FROM (
    SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        INTERVAL '1 month'
    )::DATE AS month_date
) d
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', appointment_date)::DATE AS m,
        COUNT(*) AS total_appointments,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed_appointments,
        COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled_appointments
    FROM appointments
    GROUP BY DATE_TRUNC('month', appointment_date)::DATE
) appt ON d.month_date = appt.m
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', consultation_date)::DATE AS m,
        COUNT(*) AS total_consultations
    FROM consultations
    GROUP BY DATE_TRUNC('month', consultation_date)::DATE
) cons ON d.month_date = cons.m
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', admission_date)::DATE AS m,
        COUNT(*) AS total_admissions,
        COUNT(*) FILTER (WHERE status = 'Discharged') AS total_discharges
    FROM admissions
    GROUP BY DATE_TRUNC('month', admission_date)::DATE
) adm ON d.month_date = adm.m
LEFT JOIN (
    SELECT 
        DATE_TRUNC('month', issue_date)::DATE AS m,
        SUM(total_amount) AS gross_invoiced,
        SUM(paid_amount) AS total_collected,
        SUM(balance_due) AS outstanding_balance
    FROM invoices
    WHERE status != 'Cancelled'
    GROUP BY DATE_TRUNC('month', issue_date)::DATE
) fin ON d.month_date = fin.m
ORDER BY d.month_date DESC;

-- Unique index on materialized view to allow REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_monthly_perf_month ON mv_monthly_hospital_performance(report_month);
