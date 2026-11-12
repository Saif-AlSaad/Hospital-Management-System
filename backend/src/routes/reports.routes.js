// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Reports, Analytics & Viva Query Performance Routes
// SQL Aggregations, Materialized View Access, and EXPLAIN ANALYZE Benchmarking
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/reports/dashboard-stats - Live Real-Time Database Aggregation
router.get('/dashboard-stats', authenticateToken, async (req, res, next) => {
  try {
    const statsSql = `
      SELECT 
        (SELECT COUNT(*) FROM patients WHERE is_active = TRUE) AS total_patients,
        (SELECT COUNT(*) FROM doctors WHERE is_active = TRUE) AS active_doctors,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE) AS appointments_today,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE AND status = 'Completed') AS appointments_completed_today,
        (SELECT COUNT(*) FROM admissions WHERE status = 'Admitted') AS current_inpatients,
        (SELECT COUNT(*) FROM beds WHERE status = 'Available' AND is_active = TRUE) AS available_beds,
        (SELECT COUNT(*) FROM beds WHERE status = 'Occupied') AS occupied_beds,
        (SELECT COUNT(*) FROM lab_orders WHERE status IN ('Ordered', 'In Progress')) AS pending_lab_tests,
        (SELECT COUNT(*) FROM v_low_stock_medicines WHERE stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')) AS low_stock_medicines_count,
        (SELECT COALESCE(SUM(amount), 0.00) FROM payments WHERE payment_date::DATE = CURRENT_DATE) AS revenue_today,
        (SELECT COALESCE(SUM(balance_due), 0.00) FROM invoices WHERE status IN ('Unpaid', 'Partially Paid')) AS total_outstanding_debt;
    `;

    const result = await query(statsSql);
    const row = result.rows[0];

    res.json({
      success: true,
      stats: {
        totalPatients: parseInt(row.total_patients),
        activeDoctors: parseInt(row.active_doctors),
        appointmentsToday: parseInt(row.appointments_today),
        appointmentsCompletedToday: parseInt(row.appointments_completed_today),
        currentInpatients: parseInt(row.current_inpatients),
        availableBeds: parseInt(row.available_beds),
        occupiedBeds: parseInt(row.occupied_beds),
        pendingLabTests: parseInt(row.pending_lab_tests),
        lowStockMedicines: parseInt(row.low_stock_medicines_count),
        revenueToday: parseFloat(row.revenue_today),
        totalOutstandingDebt: parseFloat(row.total_outstanding_debt),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/monthly-performance - Materialized View mv_monthly_hospital_performance
router.get('/monthly-performance', authenticateToken, requireRoles('Admin', 'Accountant'), async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM mv_monthly_hospital_performance ORDER BY month_date ASC;');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/reports/refresh-materialized-view - Trigger Bulk Stored Procedure
router.post('/refresh-materialized-view', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    await query('CALL sp_generate_monthly_hospital_report(CURRENT_DATE);');
    const result = await query('SELECT * FROM mv_monthly_hospital_performance ORDER BY month_date ASC;');
    res.json({
      success: true,
      message: 'Monthly performance metrics bulk processed and materialized view refreshed.',
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/doctor-workload - Advanced Query 2: GROUP BY and HAVING
router.get('/doctor-workload', authenticateToken, requireRoles('Admin', 'Accountant'), async (req, res, next) => {
  try {
    const startDate = req.query.startDate || '2025-01-01';
    const endDate = req.query.endDate || '2026-12-31';
    const minAppointments = parseInt(req.query.minAppointments) || 5;

    const sql = `
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
      HAVING COUNT(a.appointment_id) >= $3
      ORDER BY completed_appointments DESC, total_appointments DESC;
    `;

    const result = await query(sql, [startDate, endDate, minAppointments]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/revenue-breakdown - Daily Revenue by Payment Method
router.get('/revenue-breakdown', authenticateToken, requireRoles('Admin', 'Accountant'), async (req, res, next) => {
  try {
    const startDate = req.query.startDate || '2025-01-01';
    const endDate = req.query.endDate || '2026-12-31';

    const sql = `
      SELECT 
        DATE(p.payment_date) AS payment_day,
        p.payment_method,
        COUNT(p.payment_id) AS total_transactions,
        SUM(p.amount) AS total_revenue_collected,
        ROUND(AVG(p.amount), 2) AS average_ticket_size
      FROM payments p
      WHERE p.payment_date::DATE BETWEEN $1 AND $2
      GROUP BY DATE(p.payment_date), p.payment_method
      ORDER BY payment_day DESC, total_revenue_collected DESC
      LIMIT 100;
    `;

    const result = await query(sql, [startDate, endDate]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/debt-aging - Accounts Receivable Aging Report
router.get('/debt-aging', authenticateToken, requireRoles('Admin', 'Accountant'), async (req, res, next) => {
  try {
    const sql = `
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
      ORDER BY total_debt_due DESC
      LIMIT 50;
    `;
    const result = await query(sql);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/explain-query - Viva Performance Demonstration with EXPLAIN ANALYZE
router.get('/explain-query', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const queryType = req.query.type || 'patient_search';

    let rawSql = '';
    let explanationTarget = '';

    if (queryType === 'patient_search') {
      explanationTarget = 'Indexed Patient Name & Phone Lookup';
      rawSql = "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM patients WHERE last_name = 'Smith' AND phone LIKE '+1-%';";
    } else if (queryType === 'bed_occupancy') {
      explanationTarget = 'Bed Occupancy & Available Partial Index Lookup';
      rawSql = "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM beds WHERE status = 'Available' AND is_active = TRUE;";
    } else if (queryType === 'doctor_workload') {
      explanationTarget = 'Doctor Workload Group By & Having Query';
      rawSql = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT d.doctor_id, COUNT(a.appointment_id) AS total_appts
        FROM doctors d
        JOIN appointments a ON d.doctor_id = a.doctor_id
        GROUP BY d.doctor_id
        HAVING COUNT(a.appointment_id) > 10;
      `;
    } else {
      explanationTarget = 'Monthly Invoiced Revenue Aggregate';
      rawSql = "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT status, SUM(total_amount), SUM(paid_amount) FROM invoices GROUP BY status;";
    }

    const result = await query(rawSql);

    res.json({
      success: true,
      target: explanationTarget,
      plan: result.rows[0]['QUERY PLAN'],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
