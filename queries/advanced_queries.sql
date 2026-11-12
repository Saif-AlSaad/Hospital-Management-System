-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Advanced SQL Queries (Joins, Subqueries, Aggregate HAVING, Window Functions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADVANCED QUERY 1: Longitudinal Patient Clinical History
-- Joins 7 tables: patients, appointments, consultations, consultation_diagnoses,
-- diagnoses, doctors, and staff.
-- Features parameter filtering by patient_id.
-- ----------------------------------------------------------------------------
SELECT 
    p.patient_id,
    p.patient_code,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    p.gender,
    p.blood_group,
    c.consultation_id,
    c.consultation_number,
    c.consultation_date,
    CONCAT(s.first_name, ' ', s.last_name) AS attending_physician,
    doc.specialization,
    a.appointment_number,
    a.appointment_type,
    c.symptoms,
    c.clinical_notes,
    c.treatment_plan,
    c.vitals,
    STRING_AGG(CONCAT(d.diagnosis_name, ' (', cd.diagnosis_type, ')'), '; ') AS diagnoses_list
FROM patients p
JOIN consultations c ON p.patient_id = c.patient_id
LEFT JOIN appointments a ON c.appointment_id = a.appointment_id
JOIN doctors doc ON c.doctor_id = doc.doctor_id
JOIN staff s ON doc.staff_id = s.staff_id
LEFT JOIN consultation_diagnoses cd ON c.consultation_id = cd.consultation_id
LEFT JOIN diagnoses d ON cd.diagnosis_id = d.diagnosis_id
WHERE p.patient_id = $1
GROUP BY 
    p.patient_id, p.patient_code, p.first_name, p.last_name, p.gender, p.blood_group,
    c.consultation_id, c.consultation_number, c.consultation_date, s.first_name, s.last_name,
    doc.specialization, a.appointment_number, a.appointment_type, c.symptoms, c.clinical_notes,
    c.treatment_plan, c.vitals
ORDER BY c.consultation_date DESC;


-- ----------------------------------------------------------------------------
-- 2. ADVANCED QUERY 2: Doctor Workload Analysis with GROUP BY and HAVING
-- Joins 4 tables: doctors, staff, departments, appointments.
-- Uses conditional aggregates and filters for high-workload doctors (HAVING > threshold).
-- ----------------------------------------------------------------------------
SELECT 
    d.doctor_id,
    CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
    dept.department_name,
    d.specialization,
    d.consultation_fee,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed_appointments,
    COUNT(a.appointment_id) FILTER (WHERE a.status = 'Cancelled') AS cancelled_appointments,
    ROUND(
        (COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed')::NUMERIC / 
         NULLIF(COUNT(a.appointment_id), 0) * 100), 2
    ) AS completion_rate_percentage,
    COALESCE(SUM(d.consultation_fee) FILTER (WHERE a.status = 'Completed'), 0.00) AS estimated_revenue_generated
FROM doctors d
JOIN staff s ON d.staff_id = s.staff_id
JOIN departments dept ON d.department_id = dept.department_id
LEFT JOIN appointments a ON d.doctor_id = a.doctor_id 
    AND a.appointment_date BETWEEN $1 AND $2
GROUP BY 
    d.doctor_id, s.first_name, s.last_name, dept.department_name, 
    d.specialization, d.consultation_fee
HAVING COUNT(a.appointment_id) >= $3 -- Parameterized workload threshold
ORDER BY completed_appointments DESC, total_appointments DESC;


-- ----------------------------------------------------------------------------
-- 3. ADVANCED QUERY 3: Inpatient Bed Occupancy & Length of Stay
-- Joins 6 tables: wards, rooms, beds, bed_assignments, admissions, patients.
-- Calculates dynamic length of stay and bed turnover.
-- ----------------------------------------------------------------------------
SELECT 
    w.ward_name,
    w.ward_type,
    r.room_number,
    b.bed_number,
    b.status AS current_bed_status,
    b.daily_rate,
    p.patient_code,
    CONCAT(p.first_name, ' ', p.last_name) AS current_patient_name,
    adm.admission_number,
    adm.admission_date,
    CASE 
        WHEN adm.admission_date IS NOT NULL 
        THEN ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - adm.admission_date)) / 86400, 1)
        ELSE NULL 
    END AS current_stay_days,
    (
        SELECT COUNT(*) 
        FROM bed_assignments historical_ba 
        WHERE historical_ba.bed_id = b.bed_id
    ) AS historical_admission_count
FROM wards w
JOIN rooms r ON w.ward_id = r.ward_id
JOIN beds b ON r.room_id = b.room_id
LEFT JOIN bed_assignments ba ON b.bed_id = ba.bed_id AND ba.is_current = TRUE
LEFT JOIN admissions adm ON ba.admission_id = adm.admission_id AND adm.status = 'Admitted'
LEFT JOIN patients p ON adm.patient_id = p.patient_id
WHERE (w.ward_id = $1 OR $1 IS NULL)
ORDER BY w.ward_name, r.room_number, b.bed_number;


-- ----------------------------------------------------------------------------
-- 4. ADVANCED QUERY 4: Laboratory Test Turnaround & Abnormality Report
-- Joins 6 tables: lab_orders, lab_order_items, lab_tests, lab_results, patients, staff.
-- Highlights abnormal diagnostic flags and turnaround hours.
-- ----------------------------------------------------------------------------
SELECT 
    lo.order_number,
    lo.order_date,
    lo.priority,
    p.patient_code,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    lt.test_code,
    lt.test_name,
    loi.status AS test_status,
    lr.parameter_name,
    lr.measured_value,
    lr.unit,
    lr.reference_range,
    lr.is_abnormal,
    CONCAT(tech.first_name, ' ', tech.last_name) AS technician_name,
    ROUND(EXTRACT(EPOCH FROM (lr.completed_at - lo.order_date)) / 3600, 2) AS turnaround_hours
FROM lab_orders lo
JOIN patients p ON lo.patient_id = p.patient_id
JOIN lab_order_items loi ON lo.order_id = loi.order_id
JOIN lab_tests lt ON loi.test_id = lt.test_id
LEFT JOIN lab_results lr ON loi.order_item_id = lr.order_item_id
LEFT JOIN staff tech ON lr.technician_id = tech.staff_id
WHERE ($1::VARCHAR IS NULL OR lo.status = $1)
  AND ($2::BOOLEAN IS NULL OR lr.is_abnormal = $2)
ORDER BY lo.order_date DESC, lo.order_number;


-- ----------------------------------------------------------------------------
-- 5. ADVANCED QUERY 5: Pharmacy Inventory Risk & Reorder Hierarchy (Subqueries + Window Functions)
-- Uses window functions (DENSE_RANK) and aggregated stock vs reorder thresholds.
-- ----------------------------------------------------------------------------
WITH stock_summary AS (
    SELECT 
        m.medicine_id,
        m.brand_name,
        m.generic_name,
        mc.category_name,
        m.reorder_level,
        m.unit_price,
        COALESCE(SUM(mb.current_quantity), 0) AS total_units_in_stock,
        MIN(mb.expiry_date) FILTER (WHERE mb.current_quantity > 0) AS earliest_expiry_date,
        COUNT(mb.batch_id) FILTER (WHERE mb.expiry_date <= CURRENT_DATE AND mb.current_quantity > 0) AS expired_batches_active
    FROM medicines m
    JOIN medicine_categories mc ON m.category_id = mc.category_id
    LEFT JOIN medicine_batches mb ON m.medicine_id = mb.medicine_id AND mb.is_active = TRUE
    WHERE m.is_active = TRUE
    GROUP BY m.medicine_id, m.brand_name, m.generic_name, mc.category_name, m.reorder_level, m.unit_price
)
SELECT 
    medicine_id,
    brand_name,
    generic_name,
    category_name,
    total_units_in_stock,
    reorder_level,
    (reorder_level - total_units_in_stock) AS units_shortage,
    earliest_expiry_date,
    expired_batches_active,
    DENSE_RANK() OVER (
        PARTITION BY category_name 
        ORDER BY (reorder_level - total_units_in_stock) DESC
    ) AS shortage_rank_in_category
FROM stock_summary
WHERE total_units_in_stock <= reorder_level
ORDER BY shortage_rank_in_category ASC, units_shortage DESC;
