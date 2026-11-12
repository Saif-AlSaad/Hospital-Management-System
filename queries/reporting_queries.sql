-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Operational & Management Reporting Queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Daily Revenue Breakdown by Payment Method
-- ----------------------------------------------------------------------------
SELECT 
    DATE(p.payment_date) AS payment_day,
    p.payment_method,
    COUNT(p.payment_id) AS total_transactions,
    SUM(p.amount) AS total_revenue_collected,
    ROUND(AVG(p.amount), 2) AS average_ticket_size
FROM payments p
WHERE p.payment_date >= $1 AND p.payment_date <= $2
GROUP BY DATE(p.payment_date), p.payment_method
ORDER BY payment_day DESC, total_revenue_collected DESC;

-- ----------------------------------------------------------------------------
-- 2. Department-Wise Clinical & Appointment Performance
-- ----------------------------------------------------------------------------
SELECT 
    dept.department_id,
    dept.department_name,
    COUNT(DISTINCT d.doctor_id) AS total_doctors,
    COUNT(a.appointment_id) AS total_appointments_booked,
    COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed') AS appointments_completed,
    COUNT(a.appointment_id) FILTER (WHERE a.status = 'Cancelled') AS appointments_cancelled,
    COUNT(DISTINCT c.consultation_id) AS total_consultations_conducted,
    COUNT(DISTINCT adm.admission_id) AS total_inpatient_admissions
FROM departments dept
LEFT JOIN doctors d ON dept.department_id = d.department_id AND d.is_active = TRUE
LEFT JOIN appointments a ON dept.department_id = a.department_id AND a.appointment_date BETWEEN $1 AND $2
LEFT JOIN consultations c ON d.doctor_id = c.doctor_id AND c.consultation_date::DATE BETWEEN $1 AND $2
LEFT JOIN wards w ON dept.department_id = w.department_id
LEFT JOIN rooms r ON w.ward_id = r.ward_id
LEFT JOIN beds b ON r.room_id = b.room_id
LEFT JOIN bed_assignments ba ON b.bed_id = ba.bed_id
LEFT JOIN admissions adm ON ba.admission_id = adm.admission_id AND adm.admission_date::DATE BETWEEN $1 AND $2
WHERE dept.is_active = TRUE
GROUP BY dept.department_id, dept.department_name
ORDER BY total_appointments_booked DESC;

-- ----------------------------------------------------------------------------
-- 3. Outstanding Patient Accounts & Debt Aging
-- Categorizes outstanding balances into aging brackets (0-30, 31-60, 61-90, 90+ days).
-- ----------------------------------------------------------------------------
SELECT 
    p.patient_id,
    p.patient_code,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    p.phone,
    COUNT(inv.invoice_id) AS unpaid_invoices_count,
    SUM(inv.balance_due) AS total_debt_due,
    SUM(CASE WHEN CURRENT_DATE - inv.issue_date <= 30 THEN inv.balance_due ELSE 0.00 END) AS aging_0_to_30_days,
    SUM(CASE WHEN CURRENT_DATE - inv.issue_date BETWEEN 31 AND 60 THEN inv.balance_due ELSE 0.00 END) AS aging_31_to_60_days,
    SUM(CASE WHEN CURRENT_DATE - inv.issue_date BETWEEN 61 AND 90 THEN inv.balance_due ELSE 0.00 END) AS aging_61_to_90_days,
    SUM(CASE WHEN CURRENT_DATE - inv.issue_date > 90 THEN inv.balance_due ELSE 0.00 END) AS aging_over_90_days
FROM patients p
JOIN invoices inv ON p.patient_id = inv.patient_id
WHERE inv.status IN ('Unpaid', 'Partially Paid')
  AND inv.balance_due > 0
GROUP BY p.patient_id, p.patient_code, p.first_name, p.last_name, p.phone
ORDER BY total_debt_due DESC;

-- ----------------------------------------------------------------------------
-- 4. Inpatient Ward Occupancy & Bed Utilization Audit
-- ----------------------------------------------------------------------------
SELECT 
    w.ward_id,
    w.ward_name,
    w.ward_type,
    dept.department_name,
    COUNT(b.bed_id) AS total_capacity,
    COUNT(b.bed_id) FILTER (WHERE b.status = 'Occupied') AS currently_occupied,
    COUNT(b.bed_id) FILTER (WHERE b.status = 'Available') AS currently_available,
    COUNT(b.bed_id) FILTER (WHERE b.status = 'Maintenance') AS in_maintenance,
    ROUND(
        (COUNT(b.bed_id) FILTER (WHERE b.status = 'Occupied')::NUMERIC / 
         NULLIF(COUNT(b.bed_id), 0) * 100), 2
    ) AS occupancy_rate_percent,
    SUM(b.daily_rate) FILTER (WHERE b.status = 'Occupied') AS daily_revenue_run_rate
FROM wards w
JOIN departments dept ON w.department_id = dept.department_id
JOIN rooms r ON w.ward_id = r.ward_id
JOIN beds b ON r.room_id = b.room_id
WHERE w.is_active = TRUE
GROUP BY w.ward_id, w.ward_name, w.ward_type, dept.department_name
ORDER BY occupancy_rate_percent DESC;

-- ----------------------------------------------------------------------------
-- 5. Pharmacy Dispensing Volume & Top Prescribed Medicines
-- ----------------------------------------------------------------------------
SELECT 
    m.medicine_id,
    m.brand_name,
    m.generic_name,
    mc.category_name,
    COUNT(DISTINCT pi.prescription_id) AS times_prescribed,
    SUM(pi.prescribed_quantity) AS total_units_prescribed,
    COALESCE(SUM(dmi.quantity), 0) AS total_units_dispensed,
    COALESCE(SUM(dmi.subtotal), 0.00) AS total_dispensed_revenue
FROM medicines m
JOIN medicine_categories mc ON m.category_id = mc.category_id
LEFT JOIN prescription_items pi ON m.medicine_id = pi.medicine_id
LEFT JOIN medicine_dispensing_items dmi ON m.medicine_id = dmi.medicine_id
GROUP BY m.medicine_id, m.brand_name, m.generic_name, mc.category_name
ORDER BY times_prescribed DESC, total_units_dispensed DESC
LIMIT 25;
